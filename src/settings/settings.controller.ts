import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
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
import { Request as ExpressRequest } from 'express';
import { UserDocument } from '../users/schemas/user.schema';

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDocument;
}

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
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMySettings(@Req() req: AuthenticatedRequest): Promise<Setting> {
    const userId = req.user._id.toString();
    return this.settingsService.findOrCreateByUserId(userId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: "Get a specific user's settings by their ID (Public)",
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: "The user's MongoDB ObjectId",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description:
      "The user's settings. (Creates default settings on first request).",
    type: Setting,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID format.' })
  async getUserSettings(
    @Param('userId', new ParseObjectIdPipe()) userId: string,
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
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMySettings(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    const userId = req.user._id.toString();
    return this.settingsService.update(userId, updateSettingDto);
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
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async resetMySettings(@Req() req: AuthenticatedRequest): Promise<Setting> {
    const userId = req.user._id.toString();
    return this.settingsService.reset(userId);
  }
}
