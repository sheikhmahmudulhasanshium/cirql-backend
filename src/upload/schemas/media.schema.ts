// src/upload/schemas/media.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true, collection: 'media' })
// This `extends Document` is essential for TypeScript to know about .id, _id, etc.
export class Media extends Document {
  @Prop({
    required: true,
    index: true,
    type: Types.ObjectId,
    ref: 'User',
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ required: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  filename: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, trim: true })
  type: string;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
