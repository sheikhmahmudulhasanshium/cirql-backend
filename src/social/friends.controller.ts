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
  Body, // CHANGED: Import Body
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

  // --- THIS METHOD HAS BEEN UPDATED ---
  @Post('request') // CHANGED: Path parameter removed from the route
  @ApiOperation({ summary: 'Send a friend request to another user' })
  sendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() sendRequestDto: SendFriendRequestDto, // CHANGED: Use @Body with the DTO
  ) {
    return this.friendsService.sendRequest(
      req.user._id.toHexString(),
      sendRequestDto.recipientId, // CHANGED: Get the ID from the DTO body
    );
  }
  // --- NO CHANGES TO THE METHODS BELOW ---

  @Patch('requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a pending friend request' })
  acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseObjectIdPipe) requestId: Types.ObjectId,
  ) {
    return this.friendsService.acceptRequest(
      requestId.toHexString(),
      req.user._id.toHexString(),
    );
  }

  @Patch('requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a pending friend request' })
  rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseObjectIdPipe) requestId: Types.ObjectId,
  ) {
    return this.friendsService.rejectRequest(
      requestId.toHexString(),
      req.user._id.toHexString(),
    );
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a user from your friends list' })
  removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendId', ParseObjectIdPipe) friendId: Types.ObjectId,
  ) {
    return this.friendsService.removeFriend(
      req.user._id.toHexString(),
      friendId.toHexString(),
    );
  }

  @Get('list')
  @ApiOperation({ summary: 'Get the current user`s friends list' })
  getFriends(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getFriends(req.user._id.toHexString());
  }

  @Get('requests/pending')
  @ApiOperation({
    summary: 'Get all pending friend requests for the current user',
  })
  getPendingRequests(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getPendingRequests(req.user._id.toHexString());
  }
}
