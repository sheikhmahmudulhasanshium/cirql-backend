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

  @ApiProperty({ example: 'dark' })
  theme: string;
}

export class SecuritySettingsPreferencesDto {
  @ApiProperty({ example: true })
  enable2FA: boolean;

  @ApiProperty({ example: 'email' })
  recoveryMethod: string;
}

export class AccessibilityOptionsPreferencesDto {
  @ApiProperty({ example: true })
  highContrastMode: boolean;

  @ApiProperty({ example: true })
  screenReaderSupport: boolean;
}

export class ContentPreferencesDto {
  @ApiProperty({ example: 'light' })
  theme: string;

  @ApiProperty({ example: ['sports', 'tech'] })
  interests: string[];
}

export class UiCustomizationPreferencesDto {
  @ApiProperty({ example: 'grid' })
  layout: string;

  @ApiProperty({ example: true })
  animationsEnabled: boolean;
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
