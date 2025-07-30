// cirql-backend/src/upload/schemas/media.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type MediaDocument = Media & Document<Types.ObjectId>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Media {
  @ApiProperty({
    type: String,
    description: 'The unique identifier of the media file.',
  })
  id: string;

  @ApiProperty({ description: 'The ID of the file as stored in Google Drive.' })
  @Prop({ required: true })
  googleFileId: string;

  @ApiProperty({
    description: 'The visibility of the file.',
    enum: ['public', 'private', 'shared'],
    default: 'private',
  })
  @Prop({
    required: true,
    enum: ['public', 'private', 'shared'],
    default: 'private',
  })
  visibility: string;

  @ApiProperty({ type: String, description: 'The user ID of the file owner.' })
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @ApiProperty({
    description:
      'A direct link to a thumbnail for the media file, if available.',
  })
  @Prop()
  thumbnailLink?: string;

  @ApiProperty({
    description:
      'The ID of the context this media is shared in (e.g., a Group ID).',
    required: false,
  })
  @Prop({ type: Types.ObjectId, required: false, index: true })
  contextId?: Types.ObjectId;

  @ApiProperty({
    description: 'The model of the context this media is shared in.',
    enum: ['Group', 'Conversation', 'Ticket'],
    required: false,
  })
  @Prop({
    type: String,
    required: false,
    enum: ['Group', 'Conversation', 'Ticket'],
  })
  contextModel?: 'Group' | 'Conversation' | 'Ticket';

  // --- START OF THE CRITICAL FIX ---
  // Adding these fields to the schema so they can be saved to MongoDB.
  @ApiProperty({
    description: 'The original filename of the uploaded file.',
    required: false,
  })
  @Prop({ type: String, required: false })
  filename?: string;

  @ApiProperty({
    description: 'The size of the file in bytes.',
    required: false,
  })
  @Prop({ type: Number, required: false })
  size?: number;

  @ApiProperty({
    description: 'The MIME type of the file.',
    required: false,
  })
  @Prop({ type: String, required: false })
  type?: string;
  // --- END OF THE CRITICAL FIX ---
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.virtual('id').get(function (this: MediaDocument) {
  return this._id.toString();
});
