import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  async findOrCreateProfile(
    userId: string,
  ): Promise<SocialProfileDocument | null> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.error(
        `Attempted to find/create a social profile for a non-existent user: ${userId}`,
      );
      return null;
    }

    let profile = await this.socialProfileModel
      .findOne({ owner: new Types.ObjectId(userId) })
      .exec();

    if (!profile) {
      this.logger.log(
        `No social profile found for user ${userId}. Creating one.`,
      );
      // FIX: Use .create() to prevent TS2554 build error
      profile = await this.socialProfileModel.create({
        owner: new Types.ObjectId(userId),
      });
    }
    return profile;
  }

  async getProfile(userId: string): Promise<SocialProfileDocument | null> {
    return this.findOrCreateProfile(userId);
  }

  async blockUser(
    currentUserId: string,
    userIdToBlock: string,
  ): Promise<SocialProfileDocument> {
    if (currentUserId === userIdToBlock) {
      throw new BadRequestException('You cannot block yourself.');
    }

    const [blockerProfile, userToBlock] = await Promise.all([
      this.findOrCreateProfile(currentUserId),
      this.usersService.findById(userIdToBlock),
    ]);

    if (!blockerProfile) {
      // This should not happen if the currentUserId comes from an authenticated user
      throw new NotFoundException('Your social profile could not be found.');
    }
    if (!userToBlock) {
      throw new NotFoundException(
        'The user you are trying to block does not exist.',
      );
    }

    const userIdToBlockObj = new Types.ObjectId(userIdToBlock);

    if (blockerProfile.blockedUsers.includes(userIdToBlockObj)) {
      this.logger.warn(
        `User ${currentUserId} already blocked ${userIdToBlock}.`,
      );
      return blockerProfile;
    }

    // Add to blocked list
    blockerProfile.blockedUsers.push(userIdToBlockObj);

    // Also remove from friends, followers, following on both sides
    const userToBlockProfile = await this.findOrCreateProfile(userIdToBlock);

    blockerProfile.friends = blockerProfile.friends.filter(
      (id) => !id.equals(userIdToBlockObj),
    );
    blockerProfile.following = blockerProfile.following.filter(
      (id) => !id.equals(userIdToBlockObj),
    );
    blockerProfile.followers = blockerProfile.followers.filter(
      (id) => !id.equals(userIdToBlockObj),
    );

    if (userToBlockProfile) {
      const currentUserIdObj = new Types.ObjectId(currentUserId);
      userToBlockProfile.friends = userToBlockProfile.friends.filter(
        (id) => !id.equals(currentUserIdObj),
      );
      userToBlockProfile.following = userToBlockProfile.following.filter(
        (id) => !id.equals(currentUserIdObj),
      );
      userToBlockProfile.followers = userToBlockProfile.followers.filter(
        (id) => !id.equals(currentUserIdObj),
      );
      await userToBlockProfile.save();
    }

    return blockerProfile.save();
  }

  async unblockUser(
    currentUserId: string,
    userIdToUnblock: string,
  ): Promise<SocialProfileDocument> {
    const profile = await this.findOrCreateProfile(currentUserId);

    if (!profile) {
      throw new NotFoundException('Your social profile could not be found.');
    }

    const userIdToUnblockObj = new Types.ObjectId(userIdToUnblock);
    const initialLength = profile.blockedUsers.length;

    profile.blockedUsers = profile.blockedUsers.filter(
      (blockedId) => !blockedId.equals(userIdToUnblockObj),
    );

    if (profile.blockedUsers.length === initialLength) {
      this.logger.warn(
        `User ${currentUserId} tried to unblock user ${userIdToUnblock} who was not blocked.`,
      );
    }

    return profile.save();
  }
}
