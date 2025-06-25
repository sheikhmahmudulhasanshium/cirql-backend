// src/social/followers.controller.ts
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
    @Param('userIdToFollow', ParseObjectIdPipe) userIdToFollow: string,
  ) {
    return this.followersService.follow(
      req.user._id.toString(),
      userIdToFollow,
    );
  }

  @Delete('unfollow/:userIdToUnfollow')
  @ApiOperation({ summary: 'Unfollow another user' })
  unfollow(
    @Req() req: AuthenticatedRequest,
    @Param('userIdToUnfollow', ParseObjectIdPipe) userIdToUnfollow: string,
  ) {
    return this.followersService.unfollow(
      req.user._id.toString(),
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
}
