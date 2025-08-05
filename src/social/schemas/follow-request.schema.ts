import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowRequestDocument = FollowRequest & Document;

export enum FollowRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

@Schema({ timestamps: true })
export class FollowRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requester: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipient: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(FollowRequestStatus),
    default: FollowRequestStatus.PENDING,
  })
  status: FollowRequestStatus;
}

export const FollowRequestSchema = SchemaFactory.createForClass(FollowRequest);
// Add a unique index to prevent duplicate pending requests
FollowRequestSchema.index(
  { requester: 1, recipient: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: FollowRequestStatus.PENDING },
  },
);
