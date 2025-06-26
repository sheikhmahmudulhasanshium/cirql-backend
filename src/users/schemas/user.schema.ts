import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = User & Document & { _id: Types.ObjectId };

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @ApiProperty({ type: String, description: 'MongoDB ObjectId as a string' })
  id: string;

  @ApiPropertyOptional({ example: 'test@example.com' })
  @Prop({
    unique: true,
    required: false, // Not required for Google-only signups
    sparse: true, // Allows multiple null values for email
    lowercase: true,
    trim: true,
  })
  email?: string;

  @Prop({ required: false, select: false })
  password?: string;

  @ApiPropertyOptional({ example: 'John' })
  @Prop({ trim: true })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @Prop({ trim: true })
  lastName?: string;

  @ApiPropertyOptional({ example: 'google|1234567890' })
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @Prop()
  picture?: string;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.User] })
  @Prop({ type: [String], enum: Role, default: [Role.User] })
  roles: Role[];

  @ApiProperty({ description: 'Indicates if email-based 2FA is enabled' })
  @Prop({ default: false })
  is2FAEnabled: boolean;

  @Prop({ type: String, required: false, select: false })
  twoFactorAuthenticationCode?: string;

  @Prop({ type: Date, required: false, select: false })
  twoFactorAuthenticationCodeExpires?: Date;

  @Prop({ type: Number, default: 0, select: false })
  twoFactorAttempts: number;

  @Prop({ type: Date, required: false, select: false })
  twoFactorLockoutUntil?: Date;

  @ApiProperty({ description: 'Account status (e.g., active, banned)' })
  @Prop({ type: String, default: 'active', index: true })
  accountStatus: string;

  @ApiPropertyOptional({ description: 'The reason for an account ban.' })
  @Prop({ type: String, required: false })
  banReason?: string;

  @Prop({ type: [Date], default: [], select: false })
  loginHistory: Date[];

  @ApiPropertyOptional({ type: Date, readOnly: true })
  createdAt?: Date;

  @ApiPropertyOptional({ type: Date, readOnly: true })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// FIX: Use .toString() which is a safer alias for .toHexString() and universally typed.
UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id.toString();
});

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
