// src/settings/settings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private settingModel: Model<SettingDocument>,
  ) {}

  private async createDefaultSettings(
    userId: string,
  ): Promise<SettingDocument> {
    // FIX: Awaited the create method (which returns a promise directly)
    return await this.settingModel.create({
      userId: new Types.ObjectId(userId),
    });
  }

  async findOrCreateByUserId(userId: string): Promise<SettingDocument> {
    // FIX: Changed from callback to await/exec
    const settings = await this.settingModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (settings) {
      return settings;
    }
    return this.createDefaultSettings(userId);
  }

  async update(
    userId: string,
    updateSettingDto: UpdateSettingDto,
  ): Promise<SettingDocument> {
    const flattenedUpdate: Record<string, any> = {};

    if (updateSettingDto.notificationPreferences) {
      const prefs = updateSettingDto.notificationPreferences;
      if (prefs.emailNotifications !== undefined)
        flattenedUpdate['notificationPreferences.emailNotifications'] =
          prefs.emailNotifications;
      if (prefs.pushNotifications !== undefined)
        flattenedUpdate['notificationPreferences.pushNotifications'] =
          prefs.pushNotifications;
      if (prefs.allowAnnouncementEmails !== undefined)
        flattenedUpdate['notificationPreferences.allowAnnouncementEmails'] =
          prefs.allowAnnouncementEmails;
    }

    if (updateSettingDto.accountSettingsPreferences) {
      const prefs = updateSettingDto.accountSettingsPreferences;
      if (prefs.isPrivate !== undefined)
        flattenedUpdate['accountSettingsPreferences.isPrivate'] =
          prefs.isPrivate;
    }

    if (updateSettingDto.securitySettingsPreferences) {
      const prefs = updateSettingDto.securitySettingsPreferences;
      if (prefs.recoveryMethod !== undefined)
        flattenedUpdate['securitySettingsPreferences.recoveryMethod'] =
          prefs.recoveryMethod;
    }

    if (updateSettingDto.accessibilityOptionsPreferences) {
      const prefs = updateSettingDto.accessibilityOptionsPreferences;
      if (prefs.highContrastMode !== undefined)
        flattenedUpdate['accessibilityOptionsPreferences.highContrastMode'] =
          prefs.highContrastMode;
      if (prefs.screenReaderSupport !== undefined)
        flattenedUpdate['accessibilityOptionsPreferences.screenReaderSupport'] =
          prefs.screenReaderSupport;
      if (prefs.font !== undefined)
        flattenedUpdate['accessibilityOptionsPreferences.font'] = prefs.font;
      if (prefs.textSize !== undefined)
        flattenedUpdate['accessibilityOptionsPreferences.textSize'] =
          prefs.textSize;
    }

    if (updateSettingDto.contentPreferences) {
      const prefs = updateSettingDto.contentPreferences;
      if (prefs.interests !== undefined)
        flattenedUpdate['contentPreferences.interests'] = prefs.interests;
    }

    if (updateSettingDto.uiCustomizationPreferences) {
      const prefs = updateSettingDto.uiCustomizationPreferences;
      if (prefs.layout !== undefined)
        flattenedUpdate['uiCustomizationPreferences.layout'] = prefs.layout;
      if (prefs.animationsEnabled !== undefined)
        flattenedUpdate['uiCustomizationPreferences.animationsEnabled'] =
          prefs.animationsEnabled;
      if (prefs.theme !== undefined)
        flattenedUpdate['uiCustomizationPreferences.theme'] = prefs.theme;
    }

    if (updateSettingDto.wellbeingPreferences) {
      const prefs = updateSettingDto.wellbeingPreferences;
      if (prefs.isBreakReminderEnabled !== undefined)
        flattenedUpdate['wellbeingPreferences.isBreakReminderEnabled'] =
          prefs.isBreakReminderEnabled;
      if (prefs.breakReminderIntervalMinutes !== undefined)
        flattenedUpdate['wellbeingPreferences.breakReminderIntervalMinutes'] =
          prefs.breakReminderIntervalMinutes;
    }

    if (updateSettingDto.dateTimePreferences) {
      const prefs = updateSettingDto.dateTimePreferences;
      if (prefs.shortDateFormat !== undefined)
        flattenedUpdate['dateTimePreferences.shortDateFormat'] =
          prefs.shortDateFormat;
      if (prefs.longDateFormat !== undefined)
        flattenedUpdate['dateTimePreferences.longDateFormat'] =
          prefs.longDateFormat;
      if (prefs.timeFormat !== undefined)
        flattenedUpdate['dateTimePreferences.timeFormat'] = prefs.timeFormat;
    }

    if (updateSettingDto.isDefault !== undefined) {
      flattenedUpdate.isDefault = updateSettingDto.isDefault;
    }

    // FIX: Changed from callback to await/exec
    const updatedSettings = await this.settingModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: flattenedUpdate },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    if (!updatedSettings) {
      throw new NotFoundException(
        `Could not find or create settings for user ID ${userId}`,
      );
    }
    return updatedSettings;
  }

  async updateTheme(
    userId: string,
    theme: 'light' | 'dark' | 'system',
  ): Promise<SettingDocument> {
    // FIX: Changed from callback to await/exec
    const updatedSettings = await this.settingModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { 'uiCustomizationPreferences.theme': theme } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    if (!updatedSettings) {
      throw new NotFoundException(
        `Could not find or create settings for user ID ${userId}`,
      );
    }
    return updatedSettings;
  }

  async reset(userId: string): Promise<SettingDocument> {
    const userObjectId = new Types.ObjectId(userId);

    // FIX: Changed from callback to await/exec
    const existingSettings = await this.settingModel
      .findOne({ userId: userObjectId })
      .exec();

    if (!existingSettings) {
      return this.createDefaultSettings(userId);
    }

    const defaultInstance = new this.settingModel({ userId: userObjectId });

    // FIX: Changed from callback to await/exec
    const resetSettings = await this.settingModel
      .findOneAndReplace(
        { _id: existingSettings._id },
        defaultInstance.toObject(),
        { new: true },
      )
      .exec();

    return resetSettings!;
  }
}
