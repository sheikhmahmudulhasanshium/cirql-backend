import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema({ _id: false })
export class NotificationPreferences {
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: false })
  pushNotifications: boolean;
}

@Schema({ _id: false })
export class AccountSettingsPreferences {
  @Prop({ default: false })
  isPrivate: boolean;
}

@Schema({ _id: false })
export class SecuritySettingsPreferences {
  @Prop({ default: 'email' })
  recoveryMethod: string;
}

@Schema({ _id: false })
export class AccessibilityOptionsPreferences {
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
export class ContentPreferences {
  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({ _id: false })
export class UiCustomizationPreferences {
  @Prop({ default: 'list' })
  layout: string;

  @Prop({ default: true })
  animationsEnabled: boolean;

  @Prop({ default: 'system', enum: ['light', 'dark', 'system'] })
  theme: 'light' | 'dark' | 'system';
}

@Schema({
  timestamps: true,
})
export class Setting extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: NotificationPreferences, default: () => ({}) })
  notificationPreferences: NotificationPreferences;

  @Prop({ type: AccountSettingsPreferences, default: () => ({}) })
  accountSettingsPreferences: AccountSettingsPreferences;

  @Prop({ type: SecuritySettingsPreferences, default: () => ({}) })
  securitySettingsPreferences: SecuritySettingsPreferences;

  @Prop({ type: AccessibilityOptionsPreferences, default: () => ({}) })
  accessibilityOptionsPreferences: AccessibilityOptionsPreferences;

  @Prop({ type: ContentPreferences, default: () => ({}) })
  contentPreferences: ContentPreferences;

  @Prop({ type: UiCustomizationPreferences, default: () => ({}) })
  uiCustomizationPreferences: UiCustomizationPreferences;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
