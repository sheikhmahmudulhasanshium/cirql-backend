import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferencesDto {
  @ApiProperty({ example: true })
  emailNotifications: boolean;

  @ApiProperty({ example: false })
  pushNotifications: boolean;
}

export class AccountSettingsPreferencesDto {
  @ApiProperty({ example: true })
  isPrivate: boolean;
}

export class SecuritySettingsPreferencesDto {
  @ApiProperty({ example: 'email', enum: ['email', 'phone'] })
  recoveryMethod: 'email' | 'phone';
}

export class AccessibilityOptionsPreferencesDto {
  @ApiProperty({ example: true })
  highContrastMode: boolean;

  @ApiProperty({ example: true })
  screenReaderSupport: boolean;

  @ApiProperty({
    example: 'default',
    enum: ['default', 'serif', 'mono', 'inter'],
  })
  font: 'default' | 'serif' | 'mono' | 'inter';

  @ApiProperty({ example: 'medium', enum: ['small', 'medium', 'large', 'xl'] })
  textSize: 'small' | 'medium' | 'large' | 'xl';
}

export class ContentPreferencesDto {
  @ApiProperty({ example: ['sports', 'tech'] })
  interests: string[];
}

export class UiCustomizationPreferencesDto {
  @ApiProperty({ example: 'grid', enum: ['list', 'grid'] })
  layout: 'list' | 'grid';

  @ApiProperty({ example: true })
  animationsEnabled: boolean;

  @ApiProperty({ example: 'system', enum: ['light', 'dark', 'system'] })
  theme: 'light' | 'dark' | 'system';
}

export class CreateSettingDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ type: NotificationPreferencesDto })
  notificationPreferences: NotificationPreferencesDto;

  @ApiProperty({ type: AccountSettingsPreferencesDto })
  accountSettingsPreferences: AccountSettingsPreferencesDto;

  @ApiProperty({ type: SecuritySettingsPreferencesDto })
  securitySettingsPreferences: SecuritySettingsPreferencesDto;

  @ApiProperty({ type: AccessibilityOptionsPreferencesDto })
  accessibilityOptionsPreferences: AccessibilityOptionsPreferencesDto;

  @ApiProperty({ type: ContentPreferencesDto })
  contentPreferences: ContentPreferencesDto;

  @ApiProperty({ type: UiCustomizationPreferencesDto })
  uiCustomizationPreferences: UiCustomizationPreferencesDto;
}
