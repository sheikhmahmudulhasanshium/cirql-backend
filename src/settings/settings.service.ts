import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  Setting,
  SettingDocument,
  NotificationPreferences as NotificationPreferencesSchemaType,
  WellBeingPreferences as WellBeingPreferencesSchemaType,
  PrivacyControlsPreferences as PrivacyControlsPreferencesSchemaType,
  AccountSettingsPreferences as AccountSettingsPreferencesSchemaType,
} from './schemas/setting.schema';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

const USER_PREFERENCES_RESOURCE_TYPE = 'userPreferences';
const USER_PREFERENCES_RESOURCE_ID = 'general';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(Setting.name)
    private settingModel: Model<SettingDocument>,
  ) {}

  // --- Default value getters ---
  private getDefaultNotificationPreferences(): NotificationPreferencesSchemaType {
    return {
      email_digests_enabled: true,
      push_mentions_enabled: true,
      push_loop_activity_enabled: false,
      snooze_duration_minutes: 'never',
    };
  }
  private getDefaultWellBeingPreferences(): WellBeingPreferencesSchemaType {
    return {
      daily_usage_limit_enabled: false,
      daily_usage_limit_minutes: '60',
    };
  }
  private getDefaultPrivacyControlsPreferences(): PrivacyControlsPreferencesSchemaType {
    return {
      profile_visibility: 'public',
      message_permissions: 'anyone',
    };
  }
  private getDefaultAccountSettingsPreferences(): AccountSettingsPreferencesSchemaType {
    return {
      show_active_status_enabled: true,
    };
  }
  private getFullDefaultUserPreferencesData(
    userId: Types.ObjectId,
  ): Partial<SettingDocument> {
    return {
      userId,
      resourceType: USER_PREFERENCES_RESOURCE_TYPE,
      resourceId: USER_PREFERENCES_RESOURCE_ID,
      notification_preferences: this.getDefaultNotificationPreferences(),
      well_being: this.getDefaultWellBeingPreferences(),
      privacy_controls: this.getDefaultPrivacyControlsPreferences(),
      account_settings: this.getDefaultAccountSettingsPreferences(),
    };
  }
  // --- End Default value getters ---

  async create(
    createDto: CreateSettingDto,
    userId: Types.ObjectId,
  ): Promise<SettingDocument> {
    const existingSetting = await this.settingModel
      .findOne({
        userId,
        resourceType: createDto.resourceType,
        resourceId: createDto.resourceId,
      })
      .exec();

    if (existingSetting) {
      throw new ConflictException(
        `Settings for resource type "${createDto.resourceType}" and ID "${createDto.resourceId}" already exist for this user.`,
      );
    }

    let settingData: Partial<SettingDocument> = {
      userId,
      resourceType: createDto.resourceType,
      resourceId: createDto.resourceId,
    };

    if (createDto.resourceType === USER_PREFERENCES_RESOURCE_TYPE) {
      settingData = {
        ...settingData,
        notification_preferences: {
          ...this.getDefaultNotificationPreferences(),
          ...(createDto.notification_preferences || {}),
        },
        well_being: {
          ...this.getDefaultWellBeingPreferences(),
          ...(createDto.well_being || {}),
        },
        privacy_controls: {
          ...this.getDefaultPrivacyControlsPreferences(),
          ...(createDto.privacy_controls || {}),
        },
        account_settings: {
          ...this.getDefaultAccountSettingsPreferences(),
          ...(createDto.account_settings || {}),
        },
      };
    } else {
      settingData.genericSettings = createDto.genericSettings || {};
    }

    const newSetting = new this.settingModel(settingData);
    return newSetting.save();
  }

  async findOrCreateUserPreferences(
    userId: Types.ObjectId,
  ): Promise<SettingDocument> {
    let userPrefsDoc = await this.settingModel
      .findOne({
        userId,
        resourceType: USER_PREFERENCES_RESOURCE_TYPE,
        resourceId: USER_PREFERENCES_RESOURCE_ID,
      })
      .exec();

    if (!userPrefsDoc) {
      this.logger.log(
        `User preferences not found for user ${userId.toHexString()}. Creating with defaults.`,
      );
      const defaultPrefsData = this.getFullDefaultUserPreferencesData(userId);
      const newSetting = new this.settingModel(defaultPrefsData);
      try {
        userPrefsDoc = await newSetting.save();
      } catch (error) {
        // Type 'error' as 'any' for now to check for 'code'
        // Check if it's a MongoDB duplicate key error (code 11000)
        // FIX: Check for property existence before access
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code: unknown }).code === 11000
        ) {
          this.logger.warn(
            `Race condition: User preferences for ${userId.toHexString()} were just created. Fetching again.`,
          );
          userPrefsDoc = await this.settingModel
            .findOne({
              userId,
              resourceType: USER_PREFERENCES_RESOURCE_TYPE,
              resourceId: USER_PREFERENCES_RESOURCE_ID,
            })
            .exec();
          if (!userPrefsDoc) {
            this.logger.error(
              `CRITICAL: Failed to retrieve user preferences for ${userId.toHexString()} after duplicate key error.`,
            );
            throw new InternalServerErrorException(
              'Failed to initialize or retrieve user preferences. Please try again.',
            );
          }
        } else if (error instanceof Error) {
          // Handle generic errors
          this.logger.error(
            `Error creating user preferences for ${userId.toHexString()}: ${error.message}`,
            error.stack,
          );
          throw error; // Re-throw other standard errors
        } else {
          // Handle non-Error throwables
          this.logger.error(
            `Unknown error creating user preferences for ${userId.toHexString()}`,
            error,
          );
          throw new InternalServerErrorException(
            'An unknown error occurred while creating user preferences.',
          );
        }
      }
    }
    return userPrefsDoc;
  }

  async findAllSettingsForUser(
    userId: Types.ObjectId,
  ): Promise<SettingDocument[]> {
    return this.settingModel.find({ userId }).exec();
  }

  async findFilteredSettingsForUser(
    userId: Types.ObjectId,
    resourceType?: string,
    resourceId?: string,
  ): Promise<SettingDocument[]> {
    const query: FilterQuery<SettingDocument> = { userId };
    if (resourceType) {
      query.resourceType = resourceType;
    }
    if (resourceId) {
      query.resourceId = resourceId;
    }
    return this.settingModel.find(query).exec();
  }

  async findOneById(
    id: Types.ObjectId,
    requestingUserId: Types.ObjectId,
  ): Promise<SettingDocument> {
    const setting = await this.settingModel.findById(id).exec();
    if (!setting) {
      throw new NotFoundException(
        `Setting with document ID "${id.toHexString()}" not found.`,
      );
    }
    if (!setting.userId.equals(requestingUserId)) {
      throw new ForbiddenException(
        'You do not have permission to access this setting document.',
      );
    }
    return setting;
  }

  async findOneForUserByResource(
    userId: Types.ObjectId,
    resourceType: string,
    resourceId: string,
  ): Promise<SettingDocument> {
    if (
      resourceType === USER_PREFERENCES_RESOURCE_TYPE &&
      resourceId === USER_PREFERENCES_RESOURCE_ID
    ) {
      return this.findOrCreateUserPreferences(userId);
    }
    const setting = await this.settingModel
      .findOne({
        userId,
        resourceType,
        resourceId,
      })
      .exec();
    if (!setting) {
      throw new NotFoundException(
        `Settings not found for user on resource type "${resourceType}" and ID "${resourceId}".`,
      );
    }
    return setting;
  }

  async updateForUserByResource(
    userId: Types.ObjectId,
    resourceType: string,
    resourceId: string,
    updateDto: UpdateSettingDto,
  ): Promise<SettingDocument> {
    const setting = await this.findOneForUserByResource(
      userId,
      resourceType,
      resourceId,
    );
    if (resourceType === USER_PREFERENCES_RESOURCE_TYPE) {
      if (!setting.notification_preferences)
        setting.notification_preferences =
          this.getDefaultNotificationPreferences();
      if (!setting.well_being)
        setting.well_being = this.getDefaultWellBeingPreferences();
      if (!setting.privacy_controls)
        setting.privacy_controls = this.getDefaultPrivacyControlsPreferences();
      if (!setting.account_settings)
        setting.account_settings = this.getDefaultAccountSettingsPreferences();

      if (updateDto.notification_preferences) {
        setting.notification_preferences = {
          ...setting.notification_preferences,
          ...updateDto.notification_preferences,
        };
      }
      if (updateDto.well_being) {
        setting.well_being = { ...setting.well_being, ...updateDto.well_being };
      }
      if (updateDto.privacy_controls) {
        setting.privacy_controls = {
          ...setting.privacy_controls,
          ...updateDto.privacy_controls,
        };
      }
      if (updateDto.account_settings) {
        setting.account_settings = {
          ...setting.account_settings,
          ...updateDto.account_settings,
        };
      }
    } else {
      if (updateDto.genericSettings !== undefined) {
        setting.genericSettings = {
          ...(setting.genericSettings || {}),
          ...updateDto.genericSettings,
        };
      }
    }
    return setting.save();
  }

  async removeForUserByResource(
    userId: Types.ObjectId,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    const settingToDelete = await this.settingModel.findOne({
      userId,
      resourceType,
      resourceId,
    });
    if (!settingToDelete) {
      throw new NotFoundException(
        `Settings not found for user on resource type "${resourceType}" and ID "${resourceId}" to delete.`,
      );
    }
    if (!settingToDelete.userId.equals(userId)) {
      throw new ForbiddenException(
        'Attempt to delete settings not belonging to the user.',
      );
    }
    const result = await this.settingModel
      .deleteOne({ _id: settingToDelete._id })
      .exec();
    if (result.deletedCount === 0) {
      this.logger.warn(
        `Setting found but delete op reported 0 deleted for ${resourceType}/${resourceId} of user ${userId.toHexString()}`,
      );
      throw new InternalServerErrorException(
        'Failed to delete setting after confirming its existence.',
      );
    }
  }
}
