import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

// --- START OF FIX: Add PAGE_VIEW to the enum ---
export enum ActivityAction {
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_PROFILE_VIEW = 'USER_PROFILE_VIEW',
  TICKET_MESSAGE_SENT = 'TICKET_MESSAGE_SENT',
  USER_HEARTBEAT = 'USER_HEARTBEAT',
  PAGE_VIEW = 'PAGE_VIEW', // New action for logging navigation
}
// --- END OF FIX ---

// --- START OF FIX: Add a flexible 'details' field ---
@Schema({
  capped: { size: 20 * 1024 * 1024, max: 2000000 }, // 20 MB, max 2M documents
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ActivityAction, required: true, index: true })
  action: ActivityAction;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  targetId?: Types.ObjectId;

  @Prop({ type: Number, required: false })
  durationMs?: number;

  // This flexible object can store different details for different actions.
  // For PAGE_VIEW, it will be { url: string }.
  @Prop({ type: Object, required: false })
  details?: {
    url?: string;
    // We can add more properties here in the future without schema changes
  };

  @Prop()
  createdAt: Date;
}
// --- END OF FIX ---

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
