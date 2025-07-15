// src/social/friends.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FriendRequest,
  FriendRequestDocument,
  FriendRequestStatus,
} from './schemas/friend-request.schema';
import { SocialService } from './social.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    private readonly socialService: SocialService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendRequest(
    requester: UserDocument,
    recipientId: string,
  ): Promise<FriendRequestDocument> {
    const requesterId = requester._id.toString();
    if (requesterId === recipientId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself.',
      );
    }

    const [requesterProfile, recipientProfile] = await Promise.all([
      this.socialService.findOrCreateProfile(requesterId),
      this.socialService.findOrCreateProfile(recipientId),
    ]);

    if (!recipientProfile) {
      throw new NotFoundException(
        'The user you are trying to add does not exist.',
      );
    }

    if (
      requesterProfile?.friends.map((id) => id.toString()).includes(recipientId)
    ) {
      throw new ConflictException('You are already friends with this user.');
    }

    // FIX: Changed from callback to await/exec
    const existingRequest = await this.friendRequestModel
      .findOne({
        $or: [
          {
            requester: new Types.ObjectId(requesterId),
            recipient: new Types.ObjectId(recipientId),
          },
          {
            requester: new Types.ObjectId(recipientId),
            recipient: new Types.ObjectId(requesterId),
          },
        ],
        status: FriendRequestStatus.PENDING,
      })
      .exec();

    if (existingRequest) {
      throw new ConflictException(
        'A friend request is already pending between you and this user.',
      );
    }

    // FIX: Awaited the create method
    const newRequest = await this.friendRequestModel.create({
      requester: new Types.ObjectId(requesterId),
      recipient: new Types.ObjectId(recipientId),
    });

    const requesterName =
      `${requester.firstName || ''} ${requester.lastName || ''}`.trim() ||
      'A user';

    await this.notificationsService.createNotification({
      userId: new Types.ObjectId(recipientId),
      title: 'New Friend Request',
      message: `${requesterName} sent you a friend request.`,
      type: NotificationType.SOCIAL_FRIEND_REQUEST,
      linkUrl: '/social/friends/requests',
    });

    return newRequest;
  }

  async acceptRequest(
    requestId: string,
    currentUser: UserDocument,
  ): Promise<{ message: string }> {
    const request = await this.friendRequestModel.findById(requestId).exec();
    const currentUserId = currentUser._id.toString();

    if (!request || request.status !== FriendRequestStatus.PENDING) {
      throw new NotFoundException(
        'Friend request not found or already handled.',
      );
    }

    if (request.recipient.toString() !== currentUserId) {
      throw new ForbiddenException(
        'You are not authorized to accept this request.',
      );
    }

    const requesterProfile = await this.socialService.findOrCreateProfile(
      request.requester.toString(),
    );
    const recipientProfile = await this.socialService.findOrCreateProfile(
      request.recipient.toString(),
    );

    if (!requesterProfile || !recipientProfile) {
      throw new NotFoundException(
        "One of the user's social profiles could not be found.",
      );
    }

    requesterProfile.friends.push(request.recipient);
    recipientProfile.friends.push(request.requester);

    await Promise.all([
      requesterProfile.save(),
      recipientProfile.save(),
      this.friendRequestModel.deleteOne({ _id: requestId }).exec(),
    ]);

    const recipientName =
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
      'A user';
    await this.notificationsService.createNotification({
      userId: request.requester,
      title: 'Friend Request Accepted',
      message: `${recipientName} accepted your friend request.`,
      type: NotificationType.SOCIAL_FRIEND_ACCEPT,
      linkUrl: `/profile/${request.recipient.toString()}`,
    });

    return { message: 'Friend request accepted successfully.' };
  }

  async rejectRequest(
    requestId: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    // FIX: Changed from callback to await/exec
    const result = await this.friendRequestModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(requestId),
          recipient: new Types.ObjectId(currentUserId),
          status: FriendRequestStatus.PENDING,
        },
        { status: FriendRequestStatus.REJECTED },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(
        'Friend request not found or you are not the recipient.',
      );
    }

    return { message: 'Friend request rejected.' };
  }

  async removeFriend(
    userId: string,
    friendId: string,
  ): Promise<{ message: string }> {
    const userProfile = await this.socialService.findOrCreateProfile(userId);
    const friendProfile =
      await this.socialService.findOrCreateProfile(friendId);

    if (!userProfile || !friendProfile) {
      throw new NotFoundException(
        'One of the user profiles could not be found.',
      );
    }

    userProfile.friends = userProfile.friends.filter(
      (id) => id.toString() !== friendId,
    );
    friendProfile.friends = friendProfile.friends.filter(
      (id) => id.toString() !== userId,
    );

    await Promise.all([userProfile.save(), friendProfile.save()]);

    return { message: 'Friend removed successfully.' };
  }

  async getFriends(userId: string) {
    const profile = await this.socialService.findOrCreateProfile(userId);
    if (!profile) return [];

    const populatedProfile = await profile.populate({
      path: 'friends',
      select: 'firstName lastName email picture',
    });

    return populatedProfile.friends;
  }

  async getPendingRequests(userId: string) {
    // FIX: Changed from callback to await/exec
    return this.friendRequestModel
      .find({
        recipient: new Types.ObjectId(userId),
        status: FriendRequestStatus.PENDING,
      })
      .populate('requester', 'firstName lastName email picture')
      .exec();
  }
}
