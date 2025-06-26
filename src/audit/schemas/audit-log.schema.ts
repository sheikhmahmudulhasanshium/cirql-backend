import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export enum AuditAction {
  USER_ROLE_UPDATED = 'USER_ROLE_UPDATED',
  USER_ACCOUNT_DELETED = 'USER_ACCOUNT_DELETED',
  TFA_ENABLED = 'TFA_ENABLED',
  TFA_DISABLED = 'TFA_DISABLED',
  USER_ACCOUNT_BANNED = 'USER_ACCOUNT_BANNED',
  USER_ACCOUNT_UNBANNED = 'USER_ACCOUNT_UNBANNED',
}

interface IAuditDetails {
  before?: { roles?: Role[]; email?: string };
  after?: { roles?: Role[]; email?: string };
}

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class AuditLog extends Document {
  @ApiProperty({
    description: 'The user who performed the action.',
    type: String,
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  actor: Types.ObjectId;

  @ApiProperty({
    description: 'The action that was performed.',
    enum: AuditAction,
  })
  @Prop({ type: String, enum: AuditAction, required: true, index: true })
  action: AuditAction;

  @ApiProperty({
    description: 'The ID of the entity that was targeted.',
    type: String,
  })
  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @ApiProperty({ description: 'The type of the target entity (e.g., "User").' })
  @Prop({ type: String, required: true })
  targetType: string;

  @ApiProperty({
    description: 'Details of the change (e.g., before and after states).',
  })
  @Prop({ type: Object })
  details?: IAuditDetails;

  @ApiProperty({ description: 'Reason for the action (optional).' })
  @Prop({ type: String })
  reason?: string;

  @ApiProperty({ description: 'Timestamp of when the action occurred.' })
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
