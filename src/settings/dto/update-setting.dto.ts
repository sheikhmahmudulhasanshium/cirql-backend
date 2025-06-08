import { PartialType } from '@nestjs/swagger';
import {
  CreateSettingDto,
  NotificationPreferencesDto,
  AccountSettingsPreferencesDto,
  SecuritySettingsPreferencesDto,
  AccessibilityOptionsPreferencesDto,
  ContentPreferencesDto,
  UiCustomizationPreferencesDto,
} from './create-setting.dto';

export class UpdateSettingDto extends PartialType(CreateSettingDto) {}

export class UpdateNotificationPreferencesDto extends PartialType(
  NotificationPreferencesDto,
) {}

export class UpdateAccountSettingsPreferencesDto extends PartialType(
  AccountSettingsPreferencesDto,
) {}

export class UpdateSecuritySettingsPreferencesDto extends PartialType(
  SecuritySettingsPreferencesDto,
) {}

export class UpdateAccessibilityOptionsPreferencesDto extends PartialType(
  AccessibilityOptionsPreferencesDto,
) {}

export class UpdateContentPreferencesDto extends PartialType(
  ContentPreferencesDto,
) {}

export class UpdateUiCustomizationPreferencesDto extends PartialType(
  UiCustomizationPreferencesDto,
) {}
