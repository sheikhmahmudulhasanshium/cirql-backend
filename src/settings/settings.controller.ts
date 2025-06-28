// src/settings/settings.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param, // Import Param decorator
  Body,
  UseGuards,
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
  ApiParam, // Import ApiParam decorator
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, UpdateThemeDto } from './dto/update-setting.dto';
import { Setting } from './schemas/setting.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('settings')
@Controller('settings')
// FIX: Removed global guard. Guards will be applied to each route individually.
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // This route remains PUBLIC
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
  @ApiResponse({ status: 404, description: 'User settings not found.' })
  getUserSettings(
    @Param('userId', ParseObjectIdPipe) userId: string,
  ): Promise<Setting> {
    return this.settingsService.findOrCreateByUserId(userId);
  }

  // All routes below this are PROTECTED
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's settings" })
  @ApiResponse({
    status: 200,
    description: "The user's current settings.",
    type: Setting,
  })
  getMySettings(@CurrentUser() user: UserDocument): Promise<Setting> {
    return this.settingsService.findOrCreateByUserId(user._id.toString());
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
  updateMySettings(
    @CurrentUser() user: UserDocument,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    return this.settingsService.update(user._id.toString(), updateSettingDto);
  }

  @Patch('theme')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update the authenticated user's theme" })
  @ApiResponse({
    status: 200,
    description: 'Theme updated successfully.',
    type: Setting,
  })
  async updateTheme(
    @CurrentUser() user: UserDocument,
    @Body() updateThemeDto: UpdateThemeDto,
  ): Promise<Setting> {
    return await this.settingsService.updateTheme(
      user._id.toString(),
      updateThemeDto.theme,
    );
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
  async resetMySettings(@CurrentUser() user: UserDocument): Promise<Setting> {
    return this.settingsService.reset(user._id.toString());
  }
}
