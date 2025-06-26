import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { Types } from 'mongoose';

@Injectable()
export class FollowersService {
  private readonly logger = new Logger(FollowersService.name);

  constructor(private readonly socialService: SocialService) {}

  async follow(currentUserId: string, userIdToFollow: string) {
    if (currentUserId === userIdToFollow) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const [currentUserProfile, userToFollowProfile] = await Promise.all([
      this.socialService.findOrCreateProfile(currentUserId),
      this.socialService.findOrCreateProfile(userIdToFollow),
    ]);

    if (!currentUserProfile || !userToFollowProfile) {
      throw new NotFoundException(
        'One of the user profiles could not be found.',
      );
    }

    const userToFollowObj = new Types.ObjectId(userIdToFollow);
    const currentUserObj = new Types.ObjectId(currentUserId);

    // Add userToFollow to the current user's 'following' list
    if (
      !currentUserProfile.following.some((id) => id.equals(userToFollowObj))
    ) {
      currentUserProfile.following.push(userToFollowObj);
    }

    // Add current user to the userToFollow's 'followers' list
    if (
      !userToFollowProfile.followers.some((id) => id.equals(currentUserObj))
    ) {
      userToFollowProfile.followers.push(currentUserObj);
    }

    await Promise.all([currentUserProfile.save(), userToFollowProfile.save()]);

    return { message: `You are now following this user.` };
  }

  async unfollow(currentUserId: string, userIdToUnfollow: string) {
    const [currentUserProfile, userToUnfollowProfile] = await Promise.all([
      this.socialService.findOrCreateProfile(currentUserId),
      this.socialService.findOrCreateProfile(userIdToUnfollow),
    ]);

    if (!currentUserProfile || !userToUnfollowProfile) {
      throw new NotFoundException(
        'One of the user profiles could not be found.',
      );
    }

    const userToUnfollowObj = new Types.ObjectId(userIdToUnfollow);
    const currentUserObj = new Types.ObjectId(currentUserId);

    // Remove from 'following' list
    currentUserProfile.following = currentUserProfile.following.filter(
      (id) => !id.equals(userToUnfollowObj),
    );

    // Remove from 'followers' list
    userToUnfollowProfile.followers = userToUnfollowProfile.followers.filter(
      (id) => !id.equals(currentUserObj),
    );

    await Promise.all([
      currentUserProfile.save(),
      userToUnfollowProfile.save(),
    ]);

    return { message: 'You have unfollowed this user.' };
  }

  async getFollowers(userId: string) {
    const profile = await this.socialService.getProfile(userId);
    if (!profile) return [];

    const populatedProfile = await profile.populate({
      path: 'followers',
      select: 'firstName lastName email picture',
    });

    return populatedProfile.followers;
  }

  async getFollowing(userId: string) {
    const profile = await this.socialService.getProfile(userId);
    if (!profile) return [];

    const populatedProfile = await profile.populate({
      path: 'following',
      select: 'firstName lastName email picture',
    });

    return populatedProfile.following;
  }
}
