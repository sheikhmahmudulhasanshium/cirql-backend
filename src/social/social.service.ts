// src/social/social.service.ts
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

    // FIX: Correctly use await and .exec()
    let profile = await this.socialProfileModel
      .findOne({ owner: new Types.ObjectId(userId) })
      .exec();

    if (!profile) {
      this.logger.log(
        `No social profile found for user ${userId}. Creating one.`,
      );
      // FIX: Await the create method
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
      throw new NotFoundException('Your social profile could not be found.');
    }
    if (!userToBlock) {
      throw new NotFoundException(
        'The user you are trying to block does not exist.',
      );
    }

    if (
      blockerProfile.blockedUsers
        .map((id) => id.toString())
        .includes(userIdToBlock)
    ) {
      this.logger.warn(
        `User ${currentUserId} already blocked ${userIdToBlock}.`,
      );
      return blockerProfile;
    }

    blockerProfile.blockedUsers.push(new Types.ObjectId(userIdToBlock));

    const userToBlockProfile = await this.findOrCreateProfile(userIdToBlock);

    blockerProfile.friends = blockerProfile.friends.filter(
      (id) => id.toString() !== userIdToBlock,
    );
    blockerProfile.following = blockerProfile.following.filter(
      (id) => id.toString() !== userIdToBlock,
    );
    blockerProfile.followers = blockerProfile.followers.filter(
      (id) => id.toString() !== userIdToBlock,
    );

    if (userToBlockProfile) {
      userToBlockProfile.friends = userToBlockProfile.friends.filter(
        (id) => id.toString() !== currentUserId,
      );
      userToBlockProfile.following = userToBlockProfile.following.filter(
        (id) => id.toString() !== currentUserId,
      );
      userToBlockProfile.followers = userToBlockProfile.followers.filter(
        (id) => id.toString() !== currentUserId,
      );
      // FIX: Await the save method
      await userToBlockProfile.save();
    }

    // FIX: Await the save method
    return await blockerProfile.save();
  }

  async unblockUser(
    currentUserId: string,
    userIdToUnblock: string,
  ): Promise<SocialProfileDocument> {
    const profile = await this.findOrCreateProfile(currentUserId);

    if (!profile) {
      throw new NotFoundException('Your social profile could not be found.');
    }

    const initialLength = profile.blockedUsers.length;

    profile.blockedUsers = profile.blockedUsers.filter(
      (blockedId) => blockedId.toString() !== userIdToUnblock,
    );

    if (profile.blockedUsers.length === initialLength) {
      this.logger.warn(
        `User ${currentUserId} tried to unblock user ${userIdToUnblock} who was not blocked.`,
      );
    }

    // FIX: Await the save method
    return await profile.save();
  }
}
