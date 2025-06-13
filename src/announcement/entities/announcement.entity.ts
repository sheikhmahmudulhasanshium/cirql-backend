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

  @Prop({ required: true })
  type: AnnouncementType;

  @Prop({ default: true })
  visible: boolean;

  @Prop({ type: Date, nullable: true, default: null })
  expirationDate?: Date | null; // expirationDate is optional

  @Prop()
  imageUrl?: string;

  @Prop()
  linkUrl?: string;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
