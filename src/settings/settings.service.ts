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
    // FIX: Use the static .create() method with a plain object.
    return this.settingModel.create({
      userId: new Types.ObjectId(userId),
    });
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

    const existingSettings = await this.settingModel
      .findOne({ userId: userObjectId })
      .exec();

    if (!existingSettings) {
      return this.createDefaultSettings(userId);
    }

    await this.settingModel.findByIdAndDelete(existingSettings._id);

    // FIX: Use the static .create() method with a plain object.
    return this.settingModel.create({
      _id: existingSettings._id,
      userId: userObjectId,
    });
  }
}
