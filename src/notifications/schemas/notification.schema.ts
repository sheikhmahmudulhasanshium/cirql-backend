import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  WELCOME = 'welcome',
  ANNOUNCEMENT = 'announcement',
  SUPPORT_REPLY = 'support_reply',
  SOCIAL = 'social', // Placeholder for future use
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
