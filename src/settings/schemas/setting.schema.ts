import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ShortDateFormatKey {
  MDY_LongMonth = 'MDY_LongMonth',
  DMY_Ordinal = 'DMY_Ordinal',
  DMY_Slash = 'DMY_Slash',
  MDY_Slash = 'MDY_Slash',
  DMY_Dash = 'DMY_Dash',
  MDY_Dash = 'MDY_Dash',
  ISO = 'ISO',
}

// --- ADDED: Enums for Long Date and Time ---
export enum LongDateFormatKey {
  Full = 'Full', // e.g., Tuesday, April 1, 2025
  Medium = 'Medium', // e.g., Tue, Apr 1, 2025
}

export enum TimeFormatKey {
  TwelveHour = 'TwelveHour', // e.g., 01:30 PM
  TwelveHourWithSeconds = 'TwelveHourWithSeconds', // e.g., 01:30:00 PM
  TwentyFourHour = 'TwentyFourHour', // e.g., 13:30
  TwentyFourHourWithSeconds = 'TwentyFourHourWithSeconds', // e.g., 13:30:00
}
// --- END ADDED ---

@Schema({ _id: false })
export class NotificationPreferences extends Document {
  @Prop({ default: true })
  emailNotifications: boolean;
  @Prop({ default: true })
  allowAnnouncementEmails: boolean;
  @Prop({ default: false })
  pushNotifications: boolean;
}

@Schema({ _id: false })
export class AccountSettingsPreferences extends Document {
  @Prop({ default: false })
  isPrivate: boolean;
}

@Schema({ _id: false })
export class SecuritySettingsPreferences extends Document {
  @Prop({ default: 'email', enum: ['email', 'phone'] })
  recoveryMethod: 'email' | 'phone';
}

@Schema({ _id: false })
export class AccessibilityOptionsPreferences extends Document {
  @Prop({ default: false })
  highContrastMode: boolean;
  @Prop({ default: false })
  screenReaderSupport: boolean;
  @Prop({ default: 'default', enum: ['default', 'serif', 'mono', 'inter'] })
  font: 'default' | 'serif' | 'mono' | 'inter';
  @Prop({ default: 'medium', enum: ['small', 'medium', 'large', 'xl'] })
  textSize: 'small' | 'medium' | 'large' | 'xl';
}

@Schema({ _id: false })
export class ContentPreferences extends Document {
  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({ _id: false })
export class UiCustomizationPreferences extends Document {
  @Prop({ default: 'list', enum: ['list', 'grid'] })
  layout: 'list' | 'grid';
  @Prop({ default: true })
  animationsEnabled: boolean;
  @Prop({ default: 'system', enum: ['light', 'dark', 'system'] })
  theme: 'light' | 'dark' | 'system';
}

@Schema({ _id: false })
export class WellbeingPreferences extends Document {
  @Prop({ default: false })
  isBreakReminderEnabled: boolean;
  @Prop({ default: 30, enum: [15, 30, 45, 60] })
  breakReminderIntervalMinutes: 15 | 30 | 45 | 60;
}

@Schema({ _id: false })
export class DateTimePreferences extends Document {
  @Prop({
    type: String,
    enum: ShortDateFormatKey,
    default: ShortDateFormatKey.MDY_LongMonth,
  })
  shortDateFormat: ShortDateFormatKey;

  // --- ADDED: New properties for long date and time formats ---
  @Prop({
    type: String,
    enum: LongDateFormatKey,
    default: LongDateFormatKey.Full,
  })
  longDateFormat: LongDateFormatKey;

  @Prop({
    type: String,
    enum: TimeFormatKey,
    default: TimeFormatKey.TwelveHour,
  })
  timeFormat: TimeFormatKey;
  // --- END ADDED ---
}

export type SettingDocument = Setting & Document;

@Schema({ timestamps: true })
export class Setting {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({
    type: SchemaFactory.createForClass(NotificationPreferences),
    default: () => ({}),
  })
  notificationPreferences: NotificationPreferences;

  @Prop({
    type: SchemaFactory.createForClass(AccountSettingsPreferences),
    default: () => ({}),
  })
  accountSettingsPreferences: AccountSettingsPreferences;

  @Prop({
    type: SchemaFactory.createForClass(SecuritySettingsPreferences),
    default: () => ({}),
  })
  securitySettingsPreferences: SecuritySettingsPreferences;

  @Prop({
    type: SchemaFactory.createForClass(AccessibilityOptionsPreferences),
    default: () => ({}),
  })
  accessibilityOptionsPreferences: AccessibilityOptionsPreferences;

  @Prop({
    type: SchemaFactory.createForClass(ContentPreferences),
    default: () => ({}),
  })
  contentPreferences: ContentPreferences;

  @Prop({
    type: SchemaFactory.createForClass(UiCustomizationPreferences),
    default: () => ({}),
  })
  uiCustomizationPreferences: UiCustomizationPreferences;

  @Prop({
    type: SchemaFactory.createForClass(WellbeingPreferences),
    default: () => ({}),
  })
  wellbeingPreferences: WellbeingPreferences;

  @Prop({
    type: SchemaFactory.createForClass(DateTimePreferences),
    default: () => ({}),
  })
  dateTimePreferences: DateTimePreferences;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
