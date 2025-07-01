import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// --- THIS IS THE FIX ---
// Define the Document type by combining the class with Mongoose's Document
export type PasswordResetTokenDocument = PasswordResetToken & Document;
// --- END OF FIX ---

@Schema({ versionKey: false })
export class PasswordResetToken {
  // 'extends Document' is removed as it's handled by the type above
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string; // This will store the HASHED token

  @Prop({ required: true })
  expiresAt: Date;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
