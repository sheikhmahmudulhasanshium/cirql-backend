// src/settings/dto/update-setting.dto.ts
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationPreferencesDto,
  AccountSettingsPreferencesDto,
  SecuritySettingsPreferencesDto,
  AccessibilityOptionsPreferencesDto,
  ContentPreferencesDto,
  UiCustomizationPreferencesDto,
} from './create-setting.dto';

// Create Partial types for each nested DTO
class UpdateNotificationPreferencesDto extends PartialType(
  NotificationPreferencesDto,
) {}
class UpdateAccountSettingsPreferencesDto extends PartialType(
  AccountSettingsPreferencesDto,
) {}
class UpdateSecuritySettingsPreferencesDto extends PartialType(
  SecuritySettingsPreferencesDto,
) {}
class UpdateAccessibilityOptionsPreferencesDto extends PartialType(
  AccessibilityOptionsPreferencesDto,
) {}
class UpdateContentPreferencesDto extends PartialType(ContentPreferencesDto) {}
class UpdateUiCustomizationPreferencesDto extends PartialType(
  UiCustomizationPreferencesDto,
) {}

// This DTO is for updating multiple settings at once via the main settings page.
// We now define it explicitly to use our new partial nested DTOs,
// which solves the validation issue for partial nested updates.
export class UpdateSettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: UpdateNotificationPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateNotificationPreferencesDto)
  notificationPreferences?: UpdateNotificationPreferencesDto;

  @ApiPropertyOptional({ type: UpdateAccountSettingsPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateAccountSettingsPreferencesDto)
  accountSettingsPreferences?: UpdateAccountSettingsPreferencesDto;

  @ApiPropertyOptional({ type: UpdateSecuritySettingsPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateSecuritySettingsPreferencesDto)
  securitySettingsPreferences?: UpdateSecuritySettingsPreferencesDto;

  @ApiPropertyOptional({ type: UpdateAccessibilityOptionsPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateAccessibilityOptionsPreferencesDto)
  accessibilityOptionsPreferences?: UpdateAccessibilityOptionsPreferencesDto;

  @ApiPropertyOptional({ type: UpdateContentPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateContentPreferencesDto)
  contentPreferences?: UpdateContentPreferencesDto;

  @ApiPropertyOptional({ type: UpdateUiCustomizationPreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateUiCustomizationPreferencesDto)
  uiCustomizationPreferences?: UpdateUiCustomizationPreferencesDto;
}

// This new, specific DTO is for the dedicated theme update endpoint.
// It remains correct and does not need changes.
export class UpdateThemeDto {
  @ApiPropertyOptional({
    description: 'The visual theme for the UI.',
    enum: ['light', 'dark', 'system'],
    example: 'dark',
  })
  @IsOptional()
  @IsEnum(['light', 'dark', 'system'])
  theme: 'light' | 'dark' | 'system';
}
