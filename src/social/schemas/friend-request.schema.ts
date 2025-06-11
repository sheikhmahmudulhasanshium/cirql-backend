// FILE: src/social/schemas/friend-request.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendRequestDocument = FriendRequest & Document;

export enum FriendRequestStatus {
  PENDING = 'pending',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

@Schema({ timestamps: true })
export class FriendRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requester: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipient: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(FriendRequestStatus),
    default: FriendRequestStatus.PENDING,
  })
  status: FriendRequestStatus;
}

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);
FriendRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
