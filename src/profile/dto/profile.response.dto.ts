// src/profile/dto/profile.response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

// --- START: NEW ENUMS ---
export enum FriendshipStatus {
  NONE = 'none',
  FRIENDS = 'friends',
  REQUEST_SENT = 'request_sent',
  REQUEST_RECEIVED = 'request_received',
}

export enum FollowStatus {
  NONE = 'none',
  FOLLOWING = 'following',
  REQUEST_SENT = 'request_sent',
}
// --- END: NEW ENUMS ---

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName?: string;
  @ApiProperty() lastName?: string;
  @ApiProperty() picture?: string;
  @ApiProperty() headline?: string;
  @ApiProperty() bio?: string;
  @ApiProperty() location?: string;
  @ApiProperty() website?: string;
  @ApiProperty() isPrivate: boolean;
  @ApiProperty() accountStatus: string;
  @ApiProperty({ enum: Role, isArray: true }) roles: Role[];
  @ApiProperty() createdAt: Date;

  @ApiProperty({ description: "The user's total number of friends." })
  friendsCount: number;

  @ApiProperty({ description: "The user's total number of followers." })
  followersCount: number;

  @ApiProperty({
    description: 'The total number of users this user is following.',
  })
  followingCount: number;

  @ApiProperty({
    description:
      'The number of pending friend requests. Only visible to the profile owner.',
  })
  pendingFriendRequestsCount: number;

  @ApiProperty({
    description:
      "The number of mutual friends with the requesting user. Only visible when viewing another user's profile.",
    example: 5,
  })
  mutualFriendsCount: number;

  // --- START: NEW FIELDS ---
  @ApiProperty({
    description:
      'The friendship status between the requester and the profile owner.',
    enum: FriendshipStatus,
    example: FriendshipStatus.NONE,
  })
  friendshipStatus: FriendshipStatus;

  @ApiPropertyOptional({
    description: 'The ID of the pending friend request, if one exists.',
    example: '60f8f8f8f8f8f8f8f8f8f8f8',
  })
  friendRequestId?: string;

  @ApiProperty({
    description:
      'The follow status of the requester towards the profile owner.',
    enum: FollowStatus,
    example: FollowStatus.NONE,
  })
  followStatus: FollowStatus;

  @ApiPropertyOptional({
    description: 'The ID of the pending follow request, if one exists.',
    example: '60f8f8f8f8f8f8f8f8f8f8f9',
  })
  followRequestId?: string;
  // --- END: NEW FIELDS ---
}
