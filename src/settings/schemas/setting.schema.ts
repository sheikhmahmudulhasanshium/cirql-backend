import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema'; // Adjust path as needed

// --- Sub-schemas for User Preferences ---
@Schema({ _id: false, minimize: false }) // No separate _id, ensure empty objects are saved
export class NotificationPreferences {
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: 'Enable email digests',
  })
  @Prop({ type: Boolean, default: true })
  email_digests_enabled: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: 'Enable push notifications for mentions',
  })
  @Prop({ type: Boolean, default: true })
  push_mentions_enabled: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Enable push notifications for loop activity',
  })
  @Prop({ type: Boolean, default: false })
  push_loop_activity_enabled: boolean;

  @ApiPropertyOptional({
    type: String,
    default: 'never',
    description: 'Snooze duration for notifications',
  })
  @Prop({ type: String, default: 'never' })
  snooze_duration_minutes: string;
}
const NotificationPreferencesSchema = SchemaFactory.createForClass(
  NotificationPreferences,
);

@Schema({ _id: false, minimize: false })
export class WellBeingPreferences {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Enable daily usage limit',
  })
  @Prop({ type: Boolean, default: false })
  daily_usage_limit_enabled: boolean;

  @ApiPropertyOptional({
    type: String,
    default: '60',
    description: 'Daily usage limit in minutes',
  })
  @Prop({ type: String, default: '60' })
  daily_usage_limit_minutes: string;
}
const WellBeingPreferencesSchema =
  SchemaFactory.createForClass(WellBeingPreferences);

@Schema({ _id: false, minimize: false })
export class PrivacyControlsPreferences {
  @ApiPropertyOptional({
    type: String,
    default: 'public',
    description: 'Profile visibility setting',
  })
  @Prop({ type: String, default: 'public' })
  profile_visibility: string;

  @ApiPropertyOptional({
    type: String,
    default: 'anyone',
    description: 'Message permission setting',
  })
  @Prop({ type: String, default: 'anyone' })
  message_permissions: string;
}
const PrivacyControlsPreferencesSchema = SchemaFactory.createForClass(
  PrivacyControlsPreferences,
);

@Schema({ _id: false, minimize: false })
export class AccountSettingsPreferences {
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: 'Show active status',
  })
  @Prop({ type: Boolean, default: true })
  show_active_status_enabled: boolean;
}
const AccountSettingsPreferencesSchema = SchemaFactory.createForClass(
  AccountSettingsPreferences,
);
// --- End Sub-schemas ---

export type SettingDocument = Setting & Document & { _id: Types.ObjectId };

@Schema({
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
  minimize: false, // Ensure empty sub-documents are saved if set
})
export class Setting {
  @ApiProperty({
    type: String,
    description: 'MongoDB ObjectId as string (virtual)',
  })
  id?: string;

  @ApiProperty({
    type: String,
    description: 'ID of the user who owns these settings.',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({
    example: 'userPreferences',
    description:
      'Type of the setting (e.g., "userPreferences", "dashboardLayout").',
  })
  @Prop({ required: true, index: true })
  resourceType: string;

  @ApiProperty({
    example: 'general',
    description:
      'Identifier for the setting instance (e.g., "general", "specificDashboardId").',
  })
  @Prop({ required: true, index: true })
  resourceId: string;

  // --- Fields for resourceType="userPreferences" ---
  @ApiPropertyOptional({ type: () => NotificationPreferences })
  @Prop({
    type: NotificationPreferencesSchema,
    required: false,
    default: () => ({}),
  })
  notification_preferences?: NotificationPreferences;

  @ApiPropertyOptional({ type: () => WellBeingPreferences })
  @Prop({
    type: WellBeingPreferencesSchema,
    required: false,
    default: () => ({}),
  })
  well_being?: WellBeingPreferences;

  @ApiPropertyOptional({ type: () => PrivacyControlsPreferences })
  @Prop({
    type: PrivacyControlsPreferencesSchema,
    required: false,
    default: () => ({}),
  })
  privacy_controls?: PrivacyControlsPreferences;

  @ApiPropertyOptional({ type: () => AccountSettingsPreferences })
  @Prop({
    type: AccountSettingsPreferencesSchema,
    required: false,
    default: () => ({}),
  })
  account_settings?: AccountSettingsPreferences;
  // --- End User Preferences Fields ---

  @ApiPropertyOptional({
    description: 'Generic settings object for other resourceTypes.',
    type: 'object',
    additionalProperties: true,
    example: { layout: 'grid', items: [] },
  })
  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  genericSettings?: Record<string, any>;

  @ApiPropertyOptional({
    type: Date,
    description: 'Timestamp of creation',
    readOnly: true,
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    type: Date,
    description: 'Timestamp of last update',
    readOnly: true,
  })
  updatedAt?: Date;

  @ApiPropertyOptional({
    type: () => User,
    description: 'User object (if populated)',
  })
  user?: User;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);

SettingSchema.virtual('id').get(function (this: SettingDocument) {
  return this._id.toHexString();
});

SettingSchema.index(
  { userId: 1, resourceType: 1, resourceId: 1 },
  { unique: true },
);
