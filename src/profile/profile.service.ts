import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
import { UserDocument } from '../users/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import {
  ProfileResponseDto,
  FriendshipStatus,
  FollowStatus,
} from './dto/profile.response.dto';
import { UpdateProfileDto } from './dto/update-profile';
import { SocialService } from '../social/social.service';
import { FriendsService } from '../social/friends.service';
import { FollowersService } from '../social/followers.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly socialService: SocialService,
    private readonly friendsService: FriendsService,
    private readonly followersService: FollowersService,
  ) {}

  async findByUserId(
    targetUserId: string,
    requestingUser?: UserDocument,
  ): Promise<ProfileResponseDto> {
    const targetUser = await this.usersService.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    const isOwner = requestingUser
      ? requestingUser._id.toString() === targetUserId
      : false;
    const isAdmin = requestingUser
      ? requestingUser.roles.some((role) =>
          [Role.Admin, Role.Owner].includes(role),
        )
      : false;

    const [profile, settings, socialProfile] = await Promise.all([
      this.findOrCreate(targetUser._id),
      this.settingsService.findOrCreateByUserId(targetUserId),
      this.socialService.findOrCreateProfile(targetUserId),
    ]);

    if (!socialProfile) {
      throw new NotFoundException('Could not find or create social profile.');
    }

    if (!isOwner && !isAdmin) {
      if (
        requestingUser &&
        socialProfile.blockedUsers
          .map((id) => id.toString())
          .includes(requestingUser._id.toString())
      ) {
        throw new NotFoundException('User not found.');
      }
      if (settings.accountSettingsPreferences.isPrivate) {
        throw new ForbiddenException('This is a private account.');
      }
    }

    const friendsCount = socialProfile.friends.length;
    const followersCount = socialProfile.followers.length;
    const followingCount = socialProfile.following.length;
    let pendingFriendRequestsCount = 0;

    if (isOwner) {
      const pendingRequests =
        await this.friendsService.getPendingRequests(targetUserId);
      pendingFriendRequestsCount = pendingRequests.length;
    }

    let mutualFriendsCount = 0;
    let friendshipStatus: FriendshipStatus = FriendshipStatus.NONE;
    let friendRequestId: string | undefined = undefined;
    let followStatus: FollowStatus = FollowStatus.NONE;
    let followRequestId: string | undefined = undefined;

    if (requestingUser && !isOwner) {
      const requesterId = requestingUser._id.toString();
      const requesterSocialProfile =
        await this.socialService.getProfile(requesterId);

      if (requesterSocialProfile) {
        const requesterFriendIds = new Set(
          requesterSocialProfile.friends.map((id) => id.toString()),
        );
        const targetFriendIds = socialProfile.friends.map((id) =>
          id.toString(),
        );
        mutualFriendsCount = targetFriendIds.filter((id) =>
          requesterFriendIds.has(id),
        ).length;

        // 1. Friendship Status
        if (requesterFriendIds.has(targetUserId)) {
          friendshipStatus = FriendshipStatus.FRIENDS;
        } else {
          const pendingRequest =
            await this.friendsService.findPendingRequestBetween(
              requesterId,
              targetUserId,
            );
          if (pendingRequest) {
            // --- START: CORRECTED LINE ---
            friendRequestId = (pendingRequest._id as Types.ObjectId).toString();
            // --- END: CORRECTED LINE ---
            if (pendingRequest.requester.toString() === requesterId) {
              friendshipStatus = FriendshipStatus.REQUEST_SENT;
            } else {
              friendshipStatus = FriendshipStatus.REQUEST_RECEIVED;
            }
          }
        }

        // 2. Follow Status
        const isFollowing = requesterSocialProfile.following
          .map((id) => id.toString())
          .includes(targetUserId);

        if (isFollowing) {
          followStatus = FollowStatus.FOLLOWING;
        } else if (settings.accountSettingsPreferences.isPrivate) {
          const pendingFollow =
            await this.followersService.findPendingFollowRequest(
              requesterId,
              targetUserId,
            );
          if (pendingFollow) {
            followStatus = FollowStatus.REQUEST_SENT;
            // --- START: CORRECTED LINE ---
            followRequestId = (pendingFollow._id as Types.ObjectId).toString();
            // --- END: CORRECTED LINE ---
          }
        }
      }
    }

    return {
      id: targetUser._id.toString(),
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      picture: targetUser.picture,
      accountStatus: targetUser.accountStatus,
      roles: targetUser.roles,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      isPrivate: settings.accountSettingsPreferences.isPrivate,
      createdAt: targetUser.createdAt!,
      friendsCount,
      followersCount,
      followingCount,
      pendingFriendRequestsCount,
      mutualFriendsCount,
      friendshipStatus,
      friendRequestId,
      followStatus,
      followRequestId,
    };
  }

  async findOrCreate(userId: Types.ObjectId): Promise<ProfileDocument> {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (profile) {
      return profile;
    }
    return this.profileModel.create({ userId });
  }

  async update(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found to update profile.');
    }
    const profile = await this.findOrCreate(user._id);
    Object.assign(profile, dto);
    await profile.save();
    return this.findByUserId(userId, user);
  }
}
