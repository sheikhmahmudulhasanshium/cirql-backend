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
    const defaultSettings = new this.settingModel({
      userId: new Types.ObjectId(userId),
    });
    return await defaultSettings.save();
  }

  async findOrCreateByUserId(userId: string): Promise<SettingDocument> {
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
    const updatedSettings = await this.settingModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
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
    const userObjectId = new Types.ObjectId(userId);

    // First, find the existing settings document to ensure it exists.
    const existingSettings = await this.settingModel
      .findOne({ userId: userObjectId })
      .exec();

    if (!existingSettings) {
      // If for some reason it doesn't exist, create a new default one.
      return this.createDefaultSettings(userId);
    }

    // Preserve the original _id.
    const originalId = existingSettings._id;

    // Remove the old document.
    await this.settingModel.findByIdAndDelete(originalId);

    // Create a new document with the original _id and userId, letting Mongoose handle defaults.
    const newDefaultSettings = new this.settingModel({
      _id: originalId,
      userId: userObjectId,
    });

    // Save the new default document.
    return await newDefaultSettings.save();
  }
}
