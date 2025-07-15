// src/social/followers.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { Types } from 'mongoose';

@Injectable()
export class FollowersService {
  private readonly logger = new Logger(FollowersService.name);

  constructor(
    private readonly socialService: SocialService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async follow(currentUser: UserDocument, userIdToFollow: string) {
    const currentUserId = currentUser._id.toString();
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

    const wasAlreadyFollowing = currentUserProfile.following
      .map((id) => id.toString())
      .includes(userIdToFollow);

    if (!wasAlreadyFollowing) {
      currentUserProfile.following.push(userToFollowProfile.owner);
    }

    if (
      !userToFollowProfile.followers
        .map((id) => id.toString())
        .includes(currentUserId)
    ) {
      userToFollowProfile.followers.push(currentUserProfile.owner);
    }

    await Promise.all([currentUserProfile.save(), userToFollowProfile.save()]);

    if (!wasAlreadyFollowing) {
      const followerName =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        'A new user';
      // Await the .createNotification() promise
      await this.notificationsService.createNotification({
        userId: new Types.ObjectId(userIdToFollow),
        title: 'You have a new follower!',
        message: `${followerName} is now following you.`,
        type: NotificationType.SOCIAL_FOLLOW,
        linkUrl: `/profile/${currentUserId}`,
      });
    }

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

    currentUserProfile.following = currentUserProfile.following.filter(
      (id) => id.toString() !== userIdToUnfollow,
    );
    userToUnfollowProfile.followers = userToUnfollowProfile.followers.filter(
      (id) => id.toString() !== currentUserId,
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
