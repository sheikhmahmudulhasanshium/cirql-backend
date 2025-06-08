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

  async reset(userId: string): Promise<SettingDocument> {
    const newDefaultSettings = new this.settingModel({ userId });

    const resetSettings = await this.settingModel.findOneAndReplace(
      { userId },
      newDefaultSettings.toObject(),
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!resetSettings) {
      throw new NotFoundException(
        `Could not reset settings for user ID ${userId}`,
      );
    }
    return resetSettings;
  }
}
