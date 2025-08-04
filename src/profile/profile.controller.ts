import {
  Controller,
  Get,
  Param,
  UseGuards,
  Patch,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ProfileResponseDto } from './dto/profile.response.dto';
import { UpdateProfileDto } from './dto/update-profile';
import { OptionalAuthGuard } from 'src/common/guards/optional-auth.guard';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's detailed profile" })
  @ApiResponse({
    status: 200,
    description: 'User profile data found.',
    type: ProfileResponseDto,
  })
  getMyProfile(@CurrentUser() user: UserDocument): Promise<ProfileResponseDto> {
    // FIX: Explicitly convert ObjectId to a string to satisfy the linter.
    return this.profileService.findByUserId(user._id.toString(), user);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
    type: ProfileResponseDto,
  })
  updateMyProfile(
    @CurrentUser() user: UserDocument,
    @Body(new ValidationPipe({ whitelist: true }))
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    // FIX: Explicitly convert ObjectId to a string to satisfy the linter.
    return this.profileService.update(user._id.toString(), updateProfileDto);
  }

  @Get(':userId')
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get a user's public profile by ID, respecting privacy settings",
  })
  @ApiResponse({
    status: 200,
    description: 'Public profile data.',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Profile is private.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getUserProfile(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() requestingUser: UserDocument,
  ): Promise<ProfileResponseDto> {
    return this.profileService.findByUserId(userId, requestingUser);
  }
}
