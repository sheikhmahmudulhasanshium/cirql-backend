// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose'; // Added Types for _id if needed explicitly
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document & { _id: Types.ObjectId }; // Be explicit about _id

@Schema({ timestamps: true })
export class User {
  // Mongoose automatically adds _id, so we don't define it with @Prop
  // If you need to reference it explicitly, it's Types.ObjectId

  @Prop({ unique: true, required: false, sparse: true })
  email?: string;

  @Prop({ required: false })
  password?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop()
  picture?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});
