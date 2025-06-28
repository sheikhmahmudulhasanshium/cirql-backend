// src/notifications/schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  WELCOME = 'welcome',
  WELCOME_BACK = 'welcome_back',
  ANNOUNCEMENT = 'announcement',
  SUPPORT_REPLY = 'support_reply',
  TICKET_ADMIN_ALERT = 'ticket_admin_alert',
  ACCOUNT_STATUS_UPDATE = 'account_status_update',
  SOCIAL_FRIEND_REQUEST = 'social_friend_request',
  SOCIAL_FRIEND_ACCEPT = 'social_friend_accept',
  SOCIAL_FOLLOW = 'social_follow',
  SOCIAL = 'social',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ type: String, required: false })
  linkUrl?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
