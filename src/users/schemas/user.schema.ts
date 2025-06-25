// src/users/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @Prop({ unique: true, required: false, sparse: true, lowercase: true })
  email?: string;

  @Prop({ required: false, select: false })
  password?: string;

  @ApiPropertyOptional({ example: 'John' })
  @Prop()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @Prop()
  lastName?: string;

  @ApiPropertyOptional({ example: 'google|1234567890' })
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @Prop()
  picture?: string;

  @ApiProperty({
    description: 'User roles',
    enum: Role,
    isArray: true,
    example: [Role.User],
  })
  @Prop({ type: [String], enum: Role, default: [Role.User] })
  roles: Role[];

  @ApiProperty({ description: 'Indicates if 2FA is enabled' })
  @Prop({ default: false })
  is2FAEnabled: boolean;

  @Prop({ required: false, select: false })
  twoFactorAuthSecret?: string;

  @Prop({ type: [String], required: false, select: false })
  twoFactorAuthBackupCodes?: string[];

  @ApiProperty({
    description: 'Account status (e.g., active, inactive, banned)',
  })
  @Prop({ type: String, default: 'active', index: true })
  accountStatus: string;

  @ApiPropertyOptional({ description: 'The reason for an account ban.' })
  @Prop({ type: String, required: false })
  banReason?: string;

  @ApiPropertyOptional({
    type: Date,
    description: 'Timestamp of the last successful login',
    nullable: true,
  })
  @Prop({ type: Date, required: false, default: null })
  lastLogin?: Date | null;

  @ApiPropertyOptional({ type: Date, readOnly: true })
  createdAt?: Date;

  @ApiPropertyOptional({ type: Date, readOnly: true })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id.toString();
});
