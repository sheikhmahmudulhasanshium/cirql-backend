// src/notifications/notifications.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

interface CreateNotificationPayload {
  userId: string | Types.ObjectId;
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
  ) {}

  async createNotification(
    payload: CreateNotificationPayload,
  ): Promise<NotificationDocument> {
    const userIdString = payload.userId.toString(); // Use .toString()
    this.logger.log(`Creating notification for user ${userIdString}`);

    const notification = new this.notificationModel(payload);
    return notification.save();
  }

  async getNotificationsForUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: NotificationDocument[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;
    const filter = { userId };

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      hasMore: page * limit < total,
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({
      userId,
      isRead: false,
    });
    return { count };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(
    userId: string,
    notificationIds?: string[],
  ): Promise<{ modifiedCount: number }> {
    const filter: { userId: string; isRead: boolean; _id?: { $in: string[] } } =
      {
        userId,
        isRead: false,
      };

    if (notificationIds && notificationIds.length > 0) {
      filter._id = { $in: notificationIds };
    }

    const result = await this.notificationModel.updateMany(filter, {
      $set: { isRead: true },
    });

    return { modifiedCount: result.modifiedCount };
  }
}
