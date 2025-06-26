// src/support/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>; // This is the hydrated Mongoose document type

@Schema({ timestamps: true })
export class Message {
  // This is the plain class for schema definition
  // _id: Types.ObjectId; // Mongoose adds this; HydratedDocument ensures it's Types.ObjectId
  // createdAt: Date;    // Mongoose adds this via timestamps: true
  // updatedAt: Date;    // Mongoose adds this via timestamps: true

  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true, index: true })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId; // This stores the ID of the user

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
