// src/social/social.controller.ts
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialService } from './social.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Social - Profile & Blocking')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('block/:userIdToBlock')
  @ApiOperation({ summary: 'Block a user, preventing interactions' })
  blockUser(
    @CurrentUser() user: UserDocument,
    @Param('userIdToBlock', ParseObjectIdPipe) userIdToBlock: string,
  ) {
    return this.socialService.blockUser(user._id.toString(), userIdToBlock);
  }

  @Delete('unblock/:userIdToUnblock')
  @ApiOperation({ summary: 'Unblock a user' })
  unblockUser(
    @CurrentUser() user: UserDocument,
    @Param('userIdToUnblock', ParseObjectIdPipe) userIdToUnblock: string,
  ) {
    return this.socialService.unblockUser(user._id.toString(), userIdToUnblock);
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Get the current user`s full social profile' })
  getMySocialProfile(@CurrentUser() user: UserDocument) {
    return this.socialService.getProfile(user._id.toString());
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get a specific user`s social profile' })
  getUserSocialProfile(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.socialService.getProfile(userId);
  }
}
