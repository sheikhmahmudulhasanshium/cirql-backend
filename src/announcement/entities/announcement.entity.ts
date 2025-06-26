import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

export enum AnnouncementType {
  UPCOMING = 'Upcoming',
  LATEST_UPDATES = 'Latest Updates',
  COMPANY_NEWS = 'Company News',
  GENERAL = 'General',
}

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: AnnouncementType })
  type: AnnouncementType;

  @Prop({ default: true })
  visible: boolean;

  @Prop({ type: Date, nullable: true, default: null })
  expirationDate?: Date | null;

  @Prop({ required: false })
  imageUrl?: string;

  @Prop({ required: false })
  linkUrl?: string;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
