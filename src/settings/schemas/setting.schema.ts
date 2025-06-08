import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

// --- Sub-Schemas with _id disabled ---

@Schema({ _id: false }) // FIX: Disable auto _id for this subdocument
export class NotificationPreferences {
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: false })
  pushNotifications: boolean;
}

@Schema({ _id: false }) // FIX: Disable auto _id for this subdocument
export class AccountSettingsPreferences {
  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: 'light' })
  theme: string;
}

@Schema({ _id: false }) // FIX: Disable auto _id for this subdocument
export class SecuritySettingsPreferences {
  @Prop({ default: false })
  enable2FA: boolean;

  @Prop({ default: 'email' })
  recoveryMethod: string;
}

@Schema({ _id: false }) // FIX: Disable auto _id for this subdocument
export class AccessibilityOptionsPreferences {
  @Prop({ default: false })
  highContrastMode: boolean;

  @Prop({ default: false })
  screenReaderSupport: boolean;
}

@Schema({ _id: false }) // FIX: Disable auto _id for this subdocument
export class ContentPreferences {
  @Prop({ default: 'light' })
  theme: string;

  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({ _id: false }) // FIX: Disable auto _id for this subdocument
export class UiCustomizationPreferences {
  @Prop({ default: 'list' })
  layout: string;

  @Prop({ default: true })
  animationsEnabled: boolean;
}

// --- Main Document Schema ---
// This one keeps its _id, as it's the main document.
@Schema({
  timestamps: true, // Good practice to track creation/update times
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
