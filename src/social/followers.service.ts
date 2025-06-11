// FILE: src/social/followers.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SocialProfile,
  SocialProfileDocument,
} from './schemas/social-profile.schema';

@Injectable()
export class FollowersService {
  private readonly logger = new Logger(FollowersService.name);

  constructor(
    @InjectModel(SocialProfile.name)
    private socialProfileModel: Model<SocialProfileDocument>,
  ) {}

  follow(currentUserId: string, userIdToFollow: string) {
    this.logger.log(`User ${currentUserId} is following ${userIdToFollow}`);
    return 'Follow logic...';
  }

  unfollow(currentUserId: string, userIdToUnfollow: string) {
    this.logger.log(`User ${currentUserId} is unfollowing ${userIdToUnfollow}`);
    return 'Unfollow logic...';
  }

  getFollowers(userId: string) {
    this.logger.log(`Getting followers for user ${userId}`);
    return 'Get followers logic...';
  }

  getFollowing(userId: string) {
    this.logger.log(`Getting following list for user ${userId}`);
    return 'Get following logic...';
  }
}
