// src/auth/auth.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose'; // Ensure Types is imported
import { ApiProperty } from '@nestjs/swagger';

export class SanitizedUser {
  @ApiProperty({
    type: String,
    description: 'User ID (string representation of ObjectId)',
  })
  _id: Types.ObjectId; // Changed to just Types.ObjectId for internal consistency

  @ApiProperty({ required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ required: false, example: 'John' })
  firstName?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  lastName?: string;

  @ApiProperty({ required: false, example: 'http://example.com/picture.jpg' })
  picture?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: SanitizedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateOAuthLogin(
    googleId: string,
    email: string | undefined,
    firstName: string | undefined,
    lastName: string | undefined,
    picture: string | undefined,
  ): Promise<UserDocument> {
    if (!email) {
      throw new InternalServerErrorException(
        'Email not provided by Google OAuth provider.',
      );
    }
    try {
      const userByEmail = await this.usersService.findOneByEmail(email);
      if (userByEmail) {
        if (!userByEmail.googleId) {
          userByEmail.googleId = googleId;
        }
        userByEmail.firstName = firstName || userByEmail.firstName;
        userByEmail.lastName = lastName || userByEmail.lastName;
        userByEmail.picture = picture || userByEmail.picture;
        return userByEmail.save();
      } else {
        const newUser = await this.usersService.create({
          googleId,
          email,
          firstName,
          lastName,
          picture,
        });
        return newUser;
      }
    } catch (err) {
      console.error('Error in validateOAuthLogin: ', err);
      throw new InternalServerErrorException('Error processing OAuth login.');
    }
  }

  login(user: UserDocument): AuthTokenResponse {
    if (!user._id) {
      console.error(
        'User object passed to login service is missing _id:',
        user,
      );
      throw new InternalServerErrorException(
        'Cannot generate token: User ID is missing.',
      );
    }

    const payload = { email: user.email, sub: user._id.toString() }; // .toString() for JWT sub
    const accessToken = this.jwtService.sign(payload);

    // Ensure UserDocument is typed to have _id as Types.ObjectId
    const plainUserObject = user.toObject<User & { _id: Types.ObjectId }>();

    const sanitizedUserOutput: SanitizedUser = {
      _id: plainUserObject._id, // Assign the Types.ObjectId directly
      email: plainUserObject.email,
      firstName: plainUserObject.firstName,
      lastName: plainUserObject.lastName,
      picture: plainUserObject.picture,
    };

    return {
      accessToken,
      user: sanitizedUserOutput,
    };
  }
}
