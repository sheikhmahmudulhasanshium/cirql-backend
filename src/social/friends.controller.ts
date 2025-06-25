// FILE: src/social/friends.controller.ts
import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Request } from 'express';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@ApiTags('Social - Friends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send a friend request to another user' })
  sendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() sendRequestDto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(
      req.user._id.toString(), // <-- FIX
      sendRequestDto.recipientId,
    );
  }

  @Patch('requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a pending friend request' })
  acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseObjectIdPipe) requestId: Types.ObjectId,
  ) {
    return this.friendsService.acceptRequest(
      requestId.toString(), // <-- FIX
      req.user._id.toString(), // <-- FIX
    );
  }

  @Patch('requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a pending friend request' })
  rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseObjectIdPipe) requestId: Types.ObjectId,
  ) {
    return this.friendsService.rejectRequest(
      requestId.toString(), // <-- FIX
      req.user._id.toString(), // <-- FIX
    );
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a user from your friends list' })
  removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendId', ParseObjectIdPipe) friendId: Types.ObjectId,
  ) {
    return this.friendsService.removeFriend(
      req.user._id.toString(), // <-- FIX
      friendId.toString(), // <-- FIX
    );
  }

  @Get('list')
  @ApiOperation({ summary: 'Get the current user`s friends list' })
  getFriends(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getFriends(req.user._id.toString()); // <-- FIX
  }

  @Get('requests/pending')
  @ApiOperation({
    summary: 'Get all pending friend requests for the current user',
  })
  getPendingRequests(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getPendingRequests(req.user._id.toString()); // <-- FIX
  }
}
