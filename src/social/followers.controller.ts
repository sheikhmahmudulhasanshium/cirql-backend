// FILE: src/social/followers.controller.ts
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowersService } from './followers.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@ApiTags('Social - Followers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post('follow/:userIdToFollow')
  @ApiOperation({ summary: 'Follow another user' })
  follow(
    @Req() req: AuthenticatedRequest,
    @Param('userIdToFollow', ParseObjectIdPipe) userIdToFollow: Types.ObjectId,
  ) {
    const user = req.user;
    return this.followersService.follow(
      user._id.toString(),
      userIdToFollow.toString(),
    );
  }

  @Delete('unfollow/:userIdToUnfollow')
  @ApiOperation({ summary: 'Unfollow another user' })
  unfollow(
    @Req() req: AuthenticatedRequest, // <-- FIX THE TYPO
    @Param('userIdToUnfollow', ParseObjectIdPipe)
    userIdToUnfollow: Types.ObjectId,
  ) {
    const user = req.user;
    return this.followersService.unfollow(
      user._id.toString(),
      userIdToUnfollow.toString(),
    );
  }

  @Get('users/:userId/followers')
  @ApiOperation({
    summary: 'Get a list of users who follow the specified user',
  })
  getFollowers(@Param('userId', ParseObjectIdPipe) userId: Types.ObjectId) {
    return this.followersService.getFollowers(userId.toString());
  }

  @Get('users/:userId/following')
  @ApiOperation({
    summary: 'Get a list of users the specified user is following',
  })
  getFollowing(@Param('userId', ParseObjectIdPipe) userId: Types.ObjectId) {
    return this.followersService.getFollowing(userId.toString());
  }
}
