import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Patch, // --- ADD PATCH ---
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowersService } from './followers.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Social - Followers & Follow Requests') // Updated Tag
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post('follow/:userIdToFollow')
  @ApiOperation({
    summary: 'Follow a user or request to follow a private user',
  })
  follow(
    @CurrentUser() user: UserDocument,
    @Param('userIdToFollow', ParseObjectIdPipe) userIdToFollow: string,
  ) {
    return this.followersService.follow(user, userIdToFollow);
  }

  @Delete('unfollow/:userIdToUnfollow')
  @ApiOperation({ summary: 'Unfollow another user' })
  unfollow(
    @CurrentUser() user: UserDocument,
    @Param('userIdToUnfollow', ParseObjectIdPipe) userIdToUnfollow: string,
  ) {
    return this.followersService.unfollow(
      user._id.toString(),
      userIdToUnfollow,
    );
  }

  @Get('users/:userId/followers')
  @ApiOperation({
    summary: 'Get a list of users who follow the specified user',
  })
  getFollowers(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.followersService.getFollowers(userId);
  }

  @Get('users/:userId/following')
  @ApiOperation({
    summary: 'Get a list of users the specified user is following',
  })
  getFollowing(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.followersService.getFollowing(userId);
  }

  // --- START: ALL NEW ENDPOINTS BELOW ---

  @Get('follow-requests/pending')
  @ApiOperation({ summary: 'Get pending follow requests received by the user' })
  getPendingFollowRequests(@CurrentUser() user: UserDocument) {
    return this.followersService.getPendingFollowRequests(user._id.toString());
  }

  @Get('follow-requests/sent')
  @ApiOperation({ summary: 'Get follow requests sent by the user' })
  getSentFollowRequests(@CurrentUser() user: UserDocument) {
    return this.followersService.getSentFollowRequests(user._id.toString());
  }

  @Patch('follow-requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a pending follow request' })
  acceptFollowRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseObjectIdPipe) requestId: string,
  ) {
    return this.followersService.acceptFollowRequest(requestId, user);
  }

  @Patch('follow-requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a pending follow request' })
  rejectFollowRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseObjectIdPipe) requestId: string,
  ) {
    return this.followersService.rejectFollowRequest(
      requestId,
      user._id.toString(),
    );
  }

  @Delete('follow-requests/:requestId/cancel')
  @ApiOperation({ summary: 'Cancel a follow request you have sent' })
  cancelFollowRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseObjectIdPipe) requestId: string,
  ) {
    return this.followersService.cancelFollowRequest(
      requestId,
      user._id.toString(),
    );
  }
}
