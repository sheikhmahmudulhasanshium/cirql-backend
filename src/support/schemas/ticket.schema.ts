import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
  // If the ticket is from a registered user
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  user?: Types.ObjectId;

  // If the ticket is from a public (unauthenticated) user
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

  @Prop({ type: Date, default: null })
  lastSeenByUserAt: Date | null;

  @Prop({ type: Date, default: null })
  lastSeenByAdminAt: Date | null;

  // Explicitly declare timestamp properties for better TypeScript type safety,
  // especially when using .lean(). Mongoose manages these automatically.
  createdAt: Date;
  updatedAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
