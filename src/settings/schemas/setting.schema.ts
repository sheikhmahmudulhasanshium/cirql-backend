import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class NotificationPreferences extends Document {
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  allowAnnouncementEmails: boolean; // Specific toggle for announcements/newsletters

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
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
