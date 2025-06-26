import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  // 'Req' is removed from this import as it was unused.
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './schemas/setting.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's settings" })
  @ApiResponse({
    status: 200,
    description:
      "The user's current settings. (Creates default settings on first request).",
    type: Setting,
  })
  getMySettings(@CurrentUser() user: UserDocument): Promise<Setting> {
    return this.settingsService.findOrCreateByUserId(user._id.toString());
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: "Get a specific user's public settings by their ID",
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: "The user's MongoDB ObjectId",
  })
  @ApiResponse({
    status: 200,
    description: "The user's settings.",
    type: Setting,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID format.' })
  getUserSettings(
    @Param('userId', ParseObjectIdPipe) userId: string,
  ): Promise<Setting> {
    return this.settingsService.findOrCreateByUserId(userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated user's settings" })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully.',
    type: Setting,
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Validation failed.' })
  updateMySettings(
    @CurrentUser() user: UserDocument,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    return this.settingsService.update(user._id.toString(), updateSettingDto);
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reset the authenticated user's settings to default",
  })
  @ApiResponse({
    status: 200,
    description: 'Settings successfully reset to default.',
    type: Setting,
  })
  resetMySettings(@CurrentUser() user: UserDocument): Promise<Setting> {
    return this.settingsService.reset(user._id.toString());
  }
}
