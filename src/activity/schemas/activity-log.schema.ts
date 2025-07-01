export class Activity {}
// src/activity/schemas/activity-log.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ... imports ...
export type ActivityLogDocument = ActivityLog & Document;

export enum ActivityAction {
  // --- NEW: Add a registration action ---
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_PROFILE_VIEW = 'USER_PROFILE_VIEW',
  TICKET_MESSAGE_SENT = 'TICKET_MESSAGE_SENT',
  USER_HEARTBEAT = 'USER_HEARTBEAT',
}

@Schema({
  // This is the "crash-proof" feature. A fixed-size collection.
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
  targetId?: Types.ObjectId; // e.g., the user profile being viewed

  // For USER_HEARTBEAT, this can store how long the session was active
  @Prop({ type: Number, required: false })
  durationMs?: number;

  @Prop()
  createdAt: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
