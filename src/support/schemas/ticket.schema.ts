// src/support/schemas/ticket.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// --- THIS IS THE CRITICAL FIX ---
// We explicitly define the document type to ensure _id is a Types.ObjectId
export type TicketDocument = Ticket & Document & { _id: Types.ObjectId };

export enum TicketCategory {
  COMPLAINT = 'Complaint',
  REVIEW = 'Review',
  SUGGESTION = 'Suggestion',
  FEEDBACK = 'Feedback',
  TECHNICAL_SUPPORT = 'Technical Support',
  INVESTMENT_OFFER = 'Investment Offer',
  OTHER = 'Other',
}

export enum TicketStatus {
  OPEN = 'Open',
  PENDING_USER_REPLY = 'Pending User Reply',
  CLOSED = 'Closed',
}

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  user?: Types.ObjectId;

  @Prop({ required: false })
  guestName?: string;

  @Prop({ required: false, lowercase: true })
  guestEmail?: string;

  @Prop({ type: String, enum: TicketCategory, required: true })
  category: TicketCategory;

  @Prop({ required: true })
  subject: string;

  @Prop({
    type: String,
    enum: TicketStatus,
    default: TicketStatus.OPEN,
    index: true,
  })
  status: TicketStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  messages: Types.ObjectId[];
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
