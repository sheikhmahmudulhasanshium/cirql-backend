// backend/src/settings/settings.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    const defaultSettings = new this.settingModel({ userId });
    return await defaultSettings.save();
  }

  async findOrCreateByUserId(userId: string): Promise<SettingDocument> {
    const settings = await this.settingModel.findOne({ userId }).exec();
    if (settings) {
      return settings;
    }
    return this.createDefaultSettings(userId);
  }

  async update(
    userId: string,
    updateSettingDto: UpdateSettingDto,
  ): Promise<SettingDocument> {
    const updatedSettings = await this.settingModel
      .findOneAndUpdate(
        { userId },
        { $set: updateSettingDto },
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

  // FIX IS HERE:
  async reset(userId: string): Promise<SettingDocument> {
    // 1. Create a new document in memory to get all the default values.
    const defaultDoc = new this.settingModel({ userId });

    // 2. Convert it to a plain object.
    const replacementObject = defaultDoc.toObject();

    // 3. THE FIX: Remove the auto-generated `_id` before the replace operation.
    //    The `_id` is immutable and should not be part of the replacement payload.
    delete replacementObject._id;

    // 4. Now perform the replace. MongoDB will preserve the original `_id`.
    const resetSettings = await this.settingModel.findOneAndReplace(
      { userId }, // The filter to find the document
      replacementObject, // The replacement document (without _id)
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!resetSettings) {
      // This is now less likely to happen with upsert: true, but good to keep.
      throw new NotFoundException(
        `Could not reset settings for user ID ${userId}`,
      );
    }
    return resetSettings;
  }
}
