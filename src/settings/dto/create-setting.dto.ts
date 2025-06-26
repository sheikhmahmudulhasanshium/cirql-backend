import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  emailNotifications: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  pushNotifications: boolean;
}

export class AccountSettingsPreferencesDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isPrivate: boolean;
}

export class SecuritySettingsPreferencesDto {
  @ApiProperty({ example: 'email', enum: ['email', 'phone'] })
  @IsEnum(['email', 'phone'])
  recoveryMethod: 'email' | 'phone';
}

export class AccessibilityOptionsPreferencesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  highContrastMode: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  screenReaderSupport: boolean;

  @ApiProperty({
    example: 'default',
    enum: ['default', 'serif', 'mono', 'inter'],
  })
  @IsEnum(['default', 'serif', 'mono', 'inter'])
  font: 'default' | 'serif' | 'mono' | 'inter';

  @ApiProperty({ example: 'medium', enum: ['small', 'medium', 'large', 'xl'] })
  @IsEnum(['small', 'medium', 'large', 'xl'])
  textSize: 'small' | 'medium' | 'large' | 'xl';
}

export class ContentPreferencesDto {
  @ApiProperty({ example: ['sports', 'tech'] })
  @IsArray()
  @IsString({ each: true })
  interests: string[];
}

export class UiCustomizationPreferencesDto {
  @ApiProperty({ example: 'grid', enum: ['list', 'grid'] })
  @IsEnum(['list', 'grid'])
  layout: 'list' | 'grid';

  @ApiProperty({ example: true })
  @IsBoolean()
  animationsEnabled: boolean;

  @ApiProperty({ example: 'system', enum: ['light', 'dark', 'system'] })
  @IsEnum(['light', 'dark', 'system'])
  theme: 'light' | 'dark' | 'system';
}

export class CreateSettingDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isDefault: boolean;

  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  // Apply similar validation to other nested DTOs
  @ApiPropertyOptional({ type: AccountSettingsPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AccountSettingsPreferencesDto)
  accountSettingsPreferences?: AccountSettingsPreferencesDto;

  @ApiPropertyOptional({ type: SecuritySettingsPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => SecuritySettingsPreferencesDto)
  securitySettingsPreferences?: SecuritySettingsPreferencesDto;

  @ApiPropertyOptional({ type: AccessibilityOptionsPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AccessibilityOptionsPreferencesDto)
  accessibilityOptionsPreferences?: AccessibilityOptionsPreferencesDto;

  @ApiPropertyOptional({ type: ContentPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ContentPreferencesDto)
  contentPreferences?: ContentPreferencesDto;

  @ApiPropertyOptional({ type: UiCustomizationPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => UiCustomizationPreferencesDto)
  uiCustomizationPreferences?: UiCustomizationPreferencesDto;
}
