import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // <--- IMPORT
import { ConfigService } from '@nestjs/config'; // <--- IMPORT
import { UsersService } from '../users/users.service'; // <--- IMPORT (Adjust path if needed)
import { User, UserDocument } from '../users/schemas/user.schema'; // <--- IMPORT User & UserDocument (Adjust path)
import { Types } from 'mongoose'; // <--- IMPORT
import { ApiProperty } from '@nestjs/swagger';

// Ensure these are defined or imported if they live elsewhere
export class SanitizedUser {
  @ApiProperty({
    type: String,
    description: 'User ID (string representation of ObjectId)',
  })
  _id: Types.ObjectId;
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService, // Often not directly needed if JWTModule is configured via ConfigService
  ) {}

  async validateOAuthLogin(
    googleId: string,
    email: string,
    firstName: string | undefined, // These are now used
    lastName: string | undefined, // These are now used
    picture: string | undefined, // These are now used
  ): Promise<UserDocument> {
    // Ensure UserDocument is the correct return type
    this.logger.log(
      `Validating OAuth login for email: ${email}, googleId: ${googleId}`,
    );
    try {
      let user: UserDocument | null =
        await this.usersService.findOneByEmail(email);

      if (user) {
        this.logger.log(
          `User found by email: ${email}. Updating Google ID and profile info if necessary.`,
        );
        if (!user.googleId) {
          user.googleId = googleId;
        }
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.picture = picture || user.picture;
        return user.save();
      } else {
        user = await this.usersService.findOneByGoogleId(googleId);
        if (user) {
          this.logger.log(
            `User found by googleId: ${googleId}. Updating email and profile info.`,
          );
          user.email = email;
          user.firstName = firstName || user.firstName;
          user.lastName = lastName || user.lastName;
          user.picture = picture || user.picture;
          return user.save();
        } else {
          this.logger.log(
            `No existing user found. Creating new user for email: ${email}`,
          );
          // Ensure all necessary fields are passed for creation
          const newUserDoc: UserDocument = await this.usersService.create({
            googleId,
            email,
            firstName,
            lastName,
            picture,
          });
          return newUserDoc;
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unknown error during OAuth validation';
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Error in validateOAuthLogin for email ${email}: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException('Error processing OAuth login.');
    }
  }

  login(user: UserDocument): AuthTokenResponse {
    // Ensure UserDocument and AuthTokenResponse are correctly typed/imported
    if (!user || !user._id) {
      this.logger.error(
        'User object passed to login service is missing or missing _id:',
        user ? user.toObject() : user, // Log plain object if possible
      );
      throw new InternalServerErrorException(
        'Cannot generate token: User or User ID is missing.',
      );
    }

    const payload = { email: user.email, sub: user._id.toString() };
    this.logger.log(
      `Generating JWT for user: ${user.email}, id: ${user._id.toString()}`,
    );
    const accessToken = this.jwtService.sign(payload);

    // Ensure User (the class/interface) and Types are imported
    const plainUserObject = user.toObject<User & { _id: Types.ObjectId }>();

    // Ensure SanitizedUser is correctly typed/imported
    const sanitizedUserOutput: SanitizedUser = {
      _id: plainUserObject._id,
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
