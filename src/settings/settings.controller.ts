import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Logger,
  ForbiddenException,
  // InternalServerErrorException, // Removed as it's not used here
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Request as ExpressRequest } from 'express';
import { UserDocument } from '../users/schemas/user.schema';
import { Setting } from './schemas/setting.schema';
import { Types } from 'mongoose';

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDocument;
}

const USER_PREFERENCES_RESOURCE_TYPE = 'userPreferences';
const USER_PREFERENCES_RESOURCE_ID = 'general';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @Get(':userId')
  @ApiOperation({
    summary:
      "Get the User Preferences settings for a specified user. Creates with defaults if they don't exist.",
    description:
      'This endpoint retrieves the specific "userPreferences" (resourceType="userPreferences", resourceId="general") document for the given userId. If it doesn\'t exist, it is created with default values and then returned.',
  })
  @ApiParam({
    name: 'userId',
    description:
      'The ID of the user whose preference settings are to be fetched.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "The user's preference settings document.",
    type: Setting,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions.',
  })
  @ApiResponse({ status: 400, description: 'Invalid userId format.' })
  async getUserPreferences(
    @Req() req: AuthenticatedRequest,
    @Param('userId', ParseObjectIdPipe) targetUserId: Types.ObjectId,
  ): Promise<Setting> {
    const requestingUser = req.user;
    if (!requestingUser._id.equals(targetUserId)) {
      // TODO: Add admin role check if admins should be allowed
      throw new ForbiddenException(
        'You do not have permission to access settings for this user.',
      );
    }
    return this.settingsService.findOrCreateUserPreferences(targetUserId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new setting document (generic or specific)',
  })
  @ApiResponse({
    status: 201,
    description: 'Setting created successfully.',
    type: Setting,
  })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    createSettingDto: CreateSettingDto, // Corrected parameter name
  ): Promise<Setting> {
    // The service's create method takes the target userId as the second argument.
    // For creating user's own settings, this is req.user._id.
    // The DTO itself (createSettingDto) doesn't need to carry a userId for this specific POST route.
    // If an admin were creating settings FOR another user via this POST, the target userId
    // would need to be part of the DTO or a separate path param, and permissions checked.
    // Current logic: setting is created for the authenticated user.

    // Check if the DTO tries to specify a different user for userPreferences, which should be disallowed
    // unless the requester is an admin. For simplicity, we assume create is for the authenticated user.
    if (
      createSettingDto.resourceType === USER_PREFERENCES_RESOURCE_TYPE &&
      createSettingDto.resourceId === USER_PREFERENCES_RESOURCE_ID
    ) {
      // Ensuring user preferences are created for the authenticated user
      return this.settingsService.create(createSettingDto, req.user._id);
    }
    // For other generic settings, also create for the authenticated user
    return this.settingsService.create(createSettingDto, req.user._id);
  }

  @Patch(':resourceType/:resourceId')
  @ApiOperation({
    summary:
      'Update a specific setting document. Creates userPreferences defaults if missing before update.',
  })
  @ApiParam({
    name: 'resourceType',
    type: String,
    description: 'e.g., "userPreferences"',
  })
  @ApiParam({
    name: 'resourceId',
    type: String,
    description: 'e.g., "general"',
  })
  @ApiResponse({ status: 200, description: 'Setting updated.', type: Setting })
  async updateSettingByResourceType(
    @Req() req: AuthenticatedRequest,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    // The service method updateForUserByResource uses req.user._id for the update operation,
    // ensuring users update their own settings.
    // No need for additional req.body.userId checks here as it's not part of UpdateSettingDto
    // and the service context is the authenticated user.
    return this.settingsService.updateForUserByResource(
      req.user._id,
      resourceType,
      resourceId,
      updateSettingDto,
    );
  }

  // --- Other utility endpoints ---
  @Get('query/filter')
  @ApiOperation({
    summary:
      'Get settings for the authenticated user (filtered by query). Does NOT create defaults.',
  })
  @ApiQuery({ name: 'resourceType', required: true, type: String })
  @ApiQuery({ name: 'resourceId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of matching settings (usually one or empty).',
    type: [Setting],
  })
  async findSettingsByQuery(
    @Req() req: AuthenticatedRequest,
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
  ): Promise<Setting[]> {
    return this.settingsService.findFilteredSettingsForUser(
      req.user._id,
      resourceType,
      resourceId,
    );
  }

  @Get('all/my')
  @ApiOperation({
    summary:
      'Get ALL settings documents for the authenticated user. Does NOT create defaults for missing setting types.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all settings for the user.',
    type: [Setting],
  })
  async getAllMySettingsDocuments(
    @Req() req: AuthenticatedRequest,
  ): Promise<Setting[]> {
    return this.settingsService.findAllSettingsForUser(req.user._id);
  }

  @Get('specific/:resourceType/:resourceId')
  @ApiOperation({
    summary:
      'Get a specific setting document by type and ID. Creates userPreferences defaults if missing and requested.',
  })
  @ApiParam({ name: 'resourceType', type: String })
  @ApiParam({ name: 'resourceId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Setting found or created.',
    type: Setting,
  })
  async findOneSpecificSetting(
    @Req() req: AuthenticatedRequest,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ): Promise<Setting> {
    return this.settingsService.findOneForUserByResource(
      req.user._id,
      resourceType,
      resourceId,
    );
  }

  @Delete(':resourceType/:resourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific setting document' })
  @ApiParam({ name: 'resourceType', type: String })
  @ApiParam({ name: 'resourceId', type: String })
  @ApiResponse({ status: 204, description: 'Setting deleted.' })
  async removeSettingByResourceType(
    @Req() req: AuthenticatedRequest,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ): Promise<void> {
    await this.settingsService.removeForUserByResource(
      req.user._id,
      resourceType,
      resourceId,
    );
  }

  @Get('doc/:id')
  @ApiOperation({
    summary:
      'Get a specific setting by its unique document _id (requires ownership or admin)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: "The Setting Document's MongoDB _id",
  })
  @ApiResponse({ status: 200, description: 'Setting found.', type: Setting })
  async findOneByDocumentId(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Setting> {
    return this.settingsService.findOneById(id, req.user._id);
  }
}
