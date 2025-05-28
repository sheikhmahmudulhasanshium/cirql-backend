// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // <--- MAKE SURE THIS IMPORT IS CORRECT

export type UserDocument = User & Document & { _id: Types.ObjectId };

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @ApiProperty({
    type: String,
    description: 'MongoDB ObjectId as string (virtual)',
  })
  id?: string;

  @ApiPropertyOptional({
    example: 'test@example.com',
    description: 'User email (unique)',
  })
  @Prop({ unique: true, required: false, sparse: true })
  email?: string;

  // Password is not decorated with ApiProperty as it shouldn't be in API responses
  @Prop({ required: false })
  password?: string;

  @ApiPropertyOptional({ example: 'John', description: 'User first name' })
  @Prop()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'User last name' })
  @Prop()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'google|12345678901234567890',
    description: 'Google OAuth ID (unique)',
  })
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'URL to profile picture',
  })
  @Prop()
  picture?: string;

  @ApiPropertyOptional({
    type: Date,
    description: 'Timestamp of creation',
    readOnly: true,
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    type: Date,
    description: 'Timestamp of last update',
    readOnly: true,
  })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});
