// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<UserDocument> {
    // Returns UserDocument or throws
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findOneByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    if (userData.email) {
      const existingUserByEmail = await this.findOneByEmail(userData.email);
      if (existingUserByEmail) {
        throw new ConflictException(
          `User with email "${userData.email}" already exists.`,
        );
      }
      userData.email = userData.email.toLowerCase();
    }
    if (userData.googleId) {
      const existingUserByGoogleId = await this.findOneByGoogleId(
        userData.googleId,
      );
      if (existingUserByGoogleId) {
        throw new ConflictException(
          `User with Google ID "${userData.googleId}" already exists.`,
        );
      }
    }
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    // Returns UserDocument or throws
    const user = await this.findById(id); // Relies on findById to throw if not found

    if (
      updateUserDto.email &&
      updateUserDto.email.toLowerCase() !== user.email
    ) {
      const existingUserWithNewEmail = await this.findOneByEmail(
        updateUserDto.email,
      );
      if (
        existingUserWithNewEmail &&
        existingUserWithNewEmail._id.toString() !== id
      ) {
        throw new ConflictException(
          `Email "${updateUserDto.email}" is already in use by another account.`,
        );
      }
      user.email = updateUserDto.email.toLowerCase();
    }

    if (updateUserDto.firstName !== undefined)
      user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined)
      user.lastName = updateUserDto.lastName;
    if (updateUserDto.picture !== undefined)
      user.picture = updateUserDto.picture;

    return user.save();
  }

  async remove(id: string): Promise<UserDocument> {
    // Returns deleted UserDocument or throws
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }
}
