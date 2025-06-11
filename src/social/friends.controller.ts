// FILE: src/social/friends.controller.ts
import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  UseGuards,
  Req, // Import Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
// import { CurrentUser } from '../auth/decorators/current-user.decorator'; // Custom decorator is removed
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Request } from 'express'; // Import Request

// Define the shape of the request object after Passport attaches the user
interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@ApiTags('Social - Friends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request/:recipientId')
  @ApiOperation({ summary: 'Send a friend request to another user' })
  sendRequest(
    @Req() req: AuthenticatedRequest, // Use @Req()
    @Param('recipientId', ParseObjectIdPipe) recipientId: Types.ObjectId,
  ) {
    return this.friendsService.sendRequest(
      req.user._id.toHexString(),
      recipientId.toHexString(),
    );
  }

  @Patch('requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a pending friend request' })
  acceptRequest(
    @Req() req: AuthenticatedRequest, // Use @Req()
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
    @Req() req: AuthenticatedRequest, // Use @Req()
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
    @Req() req: AuthenticatedRequest, // Use @Req()
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
    // Use @Req()
    return this.friendsService.getFriends(req.user._id.toHexString());
  }

  @Get('requests/pending')
  @ApiOperation({
    summary: 'Get all pending friend requests for the current user',
  })
  getPendingRequests(@Req() req: AuthenticatedRequest) {
    // Use @Req()
    return this.friendsService.getPendingRequests(req.user._id.toHexString());
  }
}
