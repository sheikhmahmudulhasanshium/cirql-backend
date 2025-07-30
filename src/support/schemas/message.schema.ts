import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true, index: true })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  // --- MODIFICATION: This now stores references to Media documents. ---
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Media' }], default: [] })
  attachments: Types.ObjectId[];

  @Prop({ type: Date, required: false })
  editedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
