// FILE: src/social/followers.controller.ts
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Req, // Import Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowersService } from './followers.service';
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

@ApiTags('Social - Followers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post('follow/:userIdToFollow')
  @ApiOperation({ summary: 'Follow another user' })
  follow(
    @Req() req: AuthenticatedRequest, // Use @Req() to get the full request
    @Param('userIdToFollow', ParseObjectIdPipe) userIdToFollow: Types.ObjectId,
  ) {
    const user = req.user; // Access the user from the request object
    return this.followersService.follow(
      user._id.toHexString(),
      userIdToFollow.toHexString(),
    );
  }

  @Delete('unfollow/:userIdToUnfollow')
  @ApiOperation({ summary: 'Unfollow another user' })
  unfollow(
    @Req() req: AuthenticatedRequest, // Use @Req()
    @Param('userIdToUnfollow', ParseObjectIdPipe)
    userIdToUnfollow: Types.ObjectId,
  ) {
    const user = req.user; // Access the user from the request object
    return this.followersService.unfollow(
      user._id.toHexString(),
      userIdToUnfollow.toHexString(),
    );
  }

  @Get('users/:userId/followers')
  @ApiOperation({
    summary: 'Get a list of users who follow the specified user',
  })
  getFollowers(@Param('userId', ParseObjectIdPipe) userId: Types.ObjectId) {
    return this.followersService.getFollowers(userId.toHexString());
  }

  @Get('users/:userId/following')
  @ApiOperation({
    summary: 'Get a list of users the specified user is following',
  })
  getFollowing(@Param('userId', ParseObjectIdPipe) userId: Types.ObjectId) {
    return this.followersService.getFollowing(userId.toHexString());
  }
}
