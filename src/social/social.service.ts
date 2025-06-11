// FILE: src/social/social.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SocialProfile,
  SocialProfileDocument,
} from './schemas/social-profile.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    @InjectModel(SocialProfile.name)
    private socialProfileModel: Model<SocialProfileDocument>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Finds a user's social profile. If it doesn't exist, it creates one on-the-fly.
   * This is a robust, "lazy-loading" pattern that avoids startup issues.
   * @param userId The ID of the user who owns the profile.
   * @returns The user's social profile document, or null if the user does not exist.
   */
  async findOrCreateProfile(
    userId: string,
  ): Promise<SocialProfileDocument | null> {
    try {
      // It's better to rely on the service to throw if user not found
      await this.usersService.findById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.error(
          `Attempted to find/create a social profile for a non-existent user: ${userId}`,
        );
        return null; // Return null if the user doesn't exist.
      }
      throw error; // Re-throw other unexpected errors
    }

    let profile = await this.socialProfileModel
      .findOne({ owner: userId })
      .exec();
    if (!profile) {
      this.logger.log(
        `No social profile found for user ${userId}. Creating one.`,
      );
      profile = await new this.socialProfileModel({ owner: userId }).save();
    }
    return profile;
  }

  async getProfile(userId: string): Promise<SocialProfileDocument | null> {
    return this.findOrCreateProfile(userId);
  }

  blockUser(currentUserId: string, userIdToBlock: string) {
    this.logger.log(`User ${currentUserId} is blocking ${userIdToBlock}`);
    return 'Block user logic...';
  }

  unblockUser(currentUserId: string, userIdToUnblock: string) {
    this.logger.log(`User ${currentUserId} is unblocking ${userIdToUnblock}`);
    return 'Unblock user logic...';
  }
}
