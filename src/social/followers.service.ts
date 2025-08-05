import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { Model, Types } from 'mongoose';
import { SettingsService } from '../settings/settings.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  FollowRequest,
  FollowRequestDocument,
  FollowRequestStatus,
} from './schemas/follow-request.schema';

@Injectable()
export class FollowersService {
  private readonly logger = new Logger(FollowersService.name);

  constructor(
    @InjectModel(FollowRequest.name)
    private followRequestModel: Model<FollowRequestDocument>,
    private readonly socialService: SocialService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async findPendingFollowRequest(
    requesterId: string,
    recipientId: string,
  ): Promise<FollowRequestDocument | null> {
    return this.followRequestModel
      .findOne({
        requester: new Types.ObjectId(requesterId),
        recipient: new Types.ObjectId(recipientId),
        status: FollowRequestStatus.PENDING,
      })
      .exec();
  }

  async follow(
    currentUser: UserDocument,
    userIdToFollow: string,
  ): Promise<{ message: string }> {
    const currentUserId = currentUser._id.toString();
    if (currentUserId === userIdToFollow) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const [userToFollowProfile, userToFollowSettings] = await Promise.all([
      this.socialService.findOrCreateProfile(userIdToFollow),
      this.settingsService.findOrCreateByUserId(userIdToFollow),
    ]);

    if (!userToFollowProfile) {
      throw new NotFoundException(
        'The user you are trying to follow does not exist.',
      );
    }

    const isBlocked = userToFollowProfile.blockedUsers
      .map((id) => id.toString())
      .includes(currentUserId);
    if (isBlocked) {
      throw new NotFoundException(
        'The user you are trying to follow does not exist.',
      );
    }

    const currentUserProfile =
      await this.socialService.findOrCreateProfile(currentUserId);
    if (!currentUserProfile) {
      throw new NotFoundException('Your user profile could not be found.');
    }

    if (userToFollowSettings.accountSettingsPreferences.isPrivate) {
      const existingRequest = await this.followRequestModel.findOne({
        requester: new Types.ObjectId(currentUserId),
        recipient: new Types.ObjectId(userIdToFollow),
        status: FollowRequestStatus.PENDING,
      });

      if (existingRequest) {
        throw new ConflictException(
          'You have already sent a follow request to this user.',
        );
      }

      await this.followRequestModel.create({
        requester: new Types.ObjectId(currentUserId),
        recipient: new Types.ObjectId(userIdToFollow),
      });

      const requesterName =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        'A user';
      await this.notificationsService.createNotification({
        userId: new Types.ObjectId(userIdToFollow),
        title: 'New Follow Request',
        message: `${requesterName} has requested to follow you.`,
        type: NotificationType.SOCIAL_FOLLOW_REQUEST,
        // --- START: ADDED CODE ---
        // This was the missing link. It takes the user to the page where they can act on the request.
        linkUrl: '/social/follow-requests',
        // --- END: ADDED CODE ---
      });

      return { message: 'Your follow request has been sent.' };
    }

    const wasAlreadyFollowing = currentUserProfile.following
      .map((id) => id.toString())
      .includes(userIdToFollow);

    if (!wasAlreadyFollowing) {
      currentUserProfile.following.push(userToFollowProfile.owner);
      userToFollowProfile.followers.push(currentUserProfile.owner);
      await Promise.all([
        currentUserProfile.save(),
        userToFollowProfile.save(),
      ]);

      const followerName =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        'A new user';
      await this.notificationsService.createNotification({
        userId: new Types.ObjectId(userIdToFollow),
        title: 'You have a new follower!',
        message: `${followerName} is now following you.`,
        type: NotificationType.SOCIAL_FOLLOW,
        // This link is already correct. It links to the new follower's profile.
        linkUrl: `/profile/${currentUserId}`,
      });
    }

    return { message: `You are now following this user.` };
  }

  async acceptFollowRequest(requestId: string, currentUser: UserDocument) {
    const request = await this.followRequestModel.findById(requestId);
    if (!request || request.status !== FollowRequestStatus.PENDING) {
      throw new NotFoundException(
        'Follow request not found or already handled.',
      );
    }
    if (request.recipient.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException(
        'You are not authorized to accept this request.',
      );
    }

    const [requesterProfile, recipientProfile] = await Promise.all([
      this.socialService.findOrCreateProfile(request.requester.toString()),
      this.socialService.findOrCreateProfile(request.recipient.toString()),
    ]);

    if (!requesterProfile || !recipientProfile) {
      throw new NotFoundException(
        "One of the user's social profiles could not be found.",
      );
    }

    recipientProfile.followers.push(request.requester);
    requesterProfile.following.push(request.recipient);

    await Promise.all([
      recipientProfile.save(),
      requesterProfile.save(),
      this.followRequestModel.findByIdAndDelete(requestId),
    ]);

    const recipientName =
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
      'A user';
    await this.notificationsService.createNotification({
      userId: request.requester,
      title: 'Follow Request Accepted',
      message: `${recipientName} accepted your follow request.`,
      type: NotificationType.SOCIAL_FOLLOW_ACCEPT,
      // This link is already correct. It links to the profile of the user who accepted.
      linkUrl: `/profile/${currentUser._id.toString()}`,
    });

    return { message: 'Follow request accepted.' };
  }

  async rejectFollowRequest(requestId: string, currentUserId: string) {
    const result = await this.followRequestModel.findOneAndDelete({
      _id: new Types.ObjectId(requestId),
      recipient: new Types.ObjectId(currentUserId),
      status: FollowRequestStatus.PENDING,
    });
    if (!result) {
      throw new NotFoundException(
        'Follow request not found or you are not the recipient.',
      );
    }
    return { message: 'Follow request rejected.' };
  }

  async cancelFollowRequest(requestId: string, currentUserId: string) {
    const result = await this.followRequestModel.findOneAndDelete({
      _id: new Types.ObjectId(requestId),
      requester: new Types.ObjectId(currentUserId),
      status: FollowRequestStatus.PENDING,
    });
    if (!result) {
      throw new NotFoundException(
        'Sent follow request not found or already handled.',
      );
    }
    return { message: 'Follow request cancelled.' };
  }

  async getPendingFollowRequests(userId: string) {
    return this.followRequestModel
      .find({
        recipient: new Types.ObjectId(userId),
        status: FollowRequestStatus.PENDING,
      })
      .populate('requester', 'firstName lastName picture id');
  }

  async getSentFollowRequests(userId: string) {
    return this.followRequestModel
      .find({
        requester: new Types.ObjectId(userId),
        status: FollowRequestStatus.PENDING,
      })
      .populate('recipient', 'firstName lastName picture id');
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
    return profile.populate({
      path: 'followers',
      select: 'firstName lastName email picture',
    });
  }

  async getFollowing(userId: string) {
    const profile = await this.socialService.getProfile(userId);
    if (!profile) return [];
    return profile.populate({
      path: 'following',
      select: 'firstName lastName email picture',
    });
  }
}
