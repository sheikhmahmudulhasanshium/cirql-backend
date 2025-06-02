import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- DTOs for User Preference Sub-categories ---
export class NotificationPreferencesDto {
  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  email_digests_enabled?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  push_mentions_enabled?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  push_loop_activity_enabled?: boolean;

  @ApiPropertyOptional({ type: String, default: 'never' })
  @IsOptional()
  @IsString()
  snooze_duration_minutes?: string;
}

export class WellBeingPreferencesDto {
  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  daily_usage_limit_enabled?: boolean;

  @ApiPropertyOptional({ type: String, default: '60' })
  @IsOptional()
  @IsString()
  daily_usage_limit_minutes?: string;
}

export class PrivacyControlsPreferencesDto {
  @ApiPropertyOptional({ type: String, default: 'public' })
  @IsOptional()
  @IsString()
  profile_visibility?: string;

  @ApiPropertyOptional({ type: String, default: 'anyone' })
  @IsOptional()
  @IsString()
  message_permissions?: string;
}

export class AccountSettingsPreferencesDto {
  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  show_active_status_enabled?: boolean;
}
// --- End User Preference Sub-category DTOs ---

export class CreateSettingDto {
  @ApiProperty({
    description: 'Type of the setting.',
    example: 'userPreferences',
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    description: 'Identifier for the setting instance.',
    example: 'general',
  })
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  // --- Fields for userPreferences ---
  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notification_preferences?: NotificationPreferencesDto;

  @ApiPropertyOptional({ type: WellBeingPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WellBeingPreferencesDto)
  well_being?: WellBeingPreferencesDto;

  @ApiPropertyOptional({ type: PrivacyControlsPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyControlsPreferencesDto)
  privacy_controls?: PrivacyControlsPreferencesDto;

  @ApiPropertyOptional({ type: AccountSettingsPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountSettingsPreferencesDto)
  account_settings?: AccountSettingsPreferencesDto;
  // --- End userPreferences Fields ---

  @ApiPropertyOptional({
    description: 'Generic settings object for other resourceTypes.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  genericSettings?: Record<string, any>;
}
