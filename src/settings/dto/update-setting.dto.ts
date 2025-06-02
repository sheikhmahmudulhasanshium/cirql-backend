import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  // IsString, // Removed if not directly used here
  IsObject,
  IsOptional,
  ValidateNested,
  // IsBoolean, // Removed if not directly used here
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationPreferencesDto,
  WellBeingPreferencesDto,
  PrivacyControlsPreferencesDto,
  AccountSettingsPreferencesDto,
} from './create-setting.dto'; // Validators are on these DTOs

export class UpdateSettingDto {
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

  @ApiPropertyOptional({
    description: 'Generic settings object for other resourceTypes.',
    type: 'object',
    additionalProperties: true, // <-- ADDED THIS
  })
  @IsOptional()
  @IsObject()
  genericSettings?: Record<string, any>;
}
