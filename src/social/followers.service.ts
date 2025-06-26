import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SocialService } from './social.service';

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

    // FIX: Use string comparison
    if (
      !currentUserProfile.following
        .map((id) => id.toString())
        .includes(userIdToFollow)
    ) {
      currentUserProfile.following.push(userToFollowProfile.owner);
    }

    // FIX: Use string comparison
    if (
      !userToFollowProfile.followers
        .map((id) => id.toString())
        .includes(currentUserId)
    ) {
      userToFollowProfile.followers.push(currentUserProfile.owner);
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

    // FIX: Use string comparison for filtering
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
