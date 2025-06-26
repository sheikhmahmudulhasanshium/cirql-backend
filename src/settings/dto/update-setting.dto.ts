import { PartialType } from '@nestjs/swagger';
import { CreateSettingDto } from './create-setting.dto';

// PartialType will correctly make all nested objects and their properties optional.
export class UpdateSettingDto extends PartialType(CreateSettingDto) {}
