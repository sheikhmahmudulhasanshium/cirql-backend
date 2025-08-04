import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema({ timestamps: true, versionKey: false })
export class Profile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 160, default: '' })
  headline?: string;

  @Prop({ type: String, trim: true, maxlength: 500, default: '' })
  bio?: string;

  @Prop({ type: String, trim: true, default: '' })
  location?: string;

  @Prop({ type: String, trim: true, default: '' })
  website?: string;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
