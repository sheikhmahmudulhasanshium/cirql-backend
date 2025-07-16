// src/social/schemas/group.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  // --- NEW PROPERTIES FOR GROUP ICON ---
  @Prop({ type: String, required: false })
  iconUrl?: string;

  @Prop({ type: String, required: false })
  iconKey?: string;
  // --- END NEW PROPERTIES ---
}

export const GroupSchema = SchemaFactory.createForClass(Group);
