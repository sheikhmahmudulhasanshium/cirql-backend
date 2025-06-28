// src/social/friends.controller.ts
import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Social - Friends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send a friend request to another user' })
  sendRequest(
    @CurrentUser() user: UserDocument,
    @Body() sendRequestDto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user, sendRequestDto.recipientId);
  }

  @Patch('requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a pending friend request' })
  acceptRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseObjectIdPipe) requestId: string,
  ) {
    return this.friendsService.acceptRequest(requestId, user);
  }

  @Patch('requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a pending friend request' })
  rejectRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseObjectIdPipe) requestId: string,
  ) {
    return this.friendsService.rejectRequest(requestId, user._id.toString());
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a user from your friends list' })
  removeFriend(
    @CurrentUser() user: UserDocument,
    @Param('friendId', ParseObjectIdPipe) friendId: string,
  ) {
    return this.friendsService.removeFriend(user._id.toString(), friendId);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get the current user`s friends list' })
  getFriends(@CurrentUser() user: UserDocument) {
    return this.friendsService.getFriends(user._id.toString());
  }

  @Get('requests/pending')
  @ApiOperation({
    summary: 'Get all pending friend requests for the current user',
  })
  getPendingRequests(@CurrentUser() user: UserDocument) {
    return this.friendsService.getPendingRequests(user._id.toString());
  }
}
