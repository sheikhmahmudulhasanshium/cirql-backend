// FILE: src/social/friends.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FriendRequest,
  FriendRequestDocument,
} from './schemas/friend-request.schema';
import {
  SocialProfile,
  SocialProfileDocument,
} from './schemas/social-profile.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(SocialProfile.name)
    private socialProfileModel: Model<SocialProfileDocument>,
  ) {}

  sendRequest(requesterId: string, recipientId: string) {
    console.log({ requesterId, recipientId });
    return 'Send request logic...';
  }
  acceptRequest(requestId: string, currentUserId: string) {
    console.log({ requestId, currentUserId });
    return 'Accept request logic...';
  }
  rejectRequest(requestId: string, currentUserId: string) {
    console.log({ requestId, currentUserId });
    return 'Reject request logic...';
  }
  removeFriend(userId: string, friendId: string) {
    console.log({ userId, friendId });
    return 'Remove friend logic...';
  }
  getFriends(userId: string) {
    console.log({ userId });
    return 'Get friends logic...';
  }
  getPendingRequests(userId: string) {
    console.log({ userId });
    return 'Get pending requests logic...';
  }
}
