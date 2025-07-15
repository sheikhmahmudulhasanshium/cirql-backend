// src/notifications/notifications.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

interface GlobalNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly settingsService: SettingsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async createNotification(
    payload: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    this.logger.log(
      `Creating notification for user ${payload.userId.toString()}`,
    );
    // FIX: Awaited the save method
    const notification = new this.notificationModel();
    Object.assign(notification, payload);
    return await notification.save();
  }

  async createGlobalNotification(
    payload: GlobalNotificationPayload,
  ): Promise<void> {
    this.logger.log(`Creating global notification: ${payload.title}`);
    const allUserIds = await this.userModel.find({}, '_id').lean().exec();

    const notificationPayloads = allUserIds.map((user) => ({
      userId: user._id,
      ...payload,
    }));

    if (notificationPayloads.length > 0) {
      // FIX: Awaited the insertMany method
      await this.notificationModel.insertMany(notificationPayloads, {
        ordered: false,
      });
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    for (const user of await this.userModel
      .find({}, 'email _id')
      .lean()
      .exec()) {
      if (!user.email) continue;
      try {
        const settings = await this.settingsService.findOrCreateByUserId(
          user._id.toString(),
        );
        if (settings.notificationPreferences.allowAnnouncementEmails) {
          const fullLink = payload.linkUrl
            ? `${frontendUrl}${payload.linkUrl}`
            : frontendUrl;
          await this.emailService.sendAccountStatusEmail(
            user.email,
            payload.title,
            payload.title,
            `${payload.message}<br><br><a href="${fullLink}">View Details</a>`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to send announcement email to ${user.email}`,
          err,
        );
      }
    }
  }

  async getNotificationsForUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    isRead?: boolean,
    type?: NotificationType,
  ): Promise<{
    data: NotificationDocument[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<NotificationDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (isRead !== undefined) {
      filter.isRead = isRead;
    }
    if (type) {
      filter.type = type;
    }

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data as NotificationDocument[],
      total,
      hasMore: page * limit < total,
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    // FIX: Changed from callback to await/exec
    const count = await this.notificationModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      })
      .exec();
    return { count };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationDocument> {
    // FIX: Changed from callback to await/exec
    const updatedNotification = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, userId: new Types.ObjectId(userId) },
        { isRead: true },
        { new: true },
      )
      .exec();

    if (!updatedNotification) {
      throw new NotFoundException(
        'Notification not found or you do not have permission to access it.',
      );
    }
    return updatedNotification;
  }

  async markBatchAsRead(
    userId: string,
    notificationIds: string[],
  ): Promise<{ modifiedCount: number }> {
    // FIX: Changed from callback to await/exec
    const result = await this.notificationModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          _id: { $in: notificationIds },
          isRead: false,
        },
        { $set: { isRead: true } },
      )
      .exec();
    return { modifiedCount: result.modifiedCount };
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    // FIX: Changed from callback to await/exec
    const result = await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true } },
      )
      .exec();
    return { modifiedCount: result.modifiedCount };
  }
}
