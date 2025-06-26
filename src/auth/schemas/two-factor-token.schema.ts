import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ versionKey: false })
export class TwoFactorToken extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string; // Stores the HASHED 6-digit code

  @Prop({ required: true, index: { expires: '10m' } }) // Automatically deletes after 10 minutes
  expiresAt: Date;
}

export const TwoFactorTokenSchema =
  SchemaFactory.createForClass(TwoFactorToken);
