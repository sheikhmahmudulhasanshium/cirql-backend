import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ versionKey: false })
export class TwoFactorToken extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string; // This will store the HASHED token

  @Prop({ required: true })
  expiresAt: Date;
}

export const TwoFactorTokenSchema =
  SchemaFactory.createForClass(TwoFactorToken);
