// src/settings/settings.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Setting, SettingSchema } from './schemas/setting.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
// REMOVED: import { AuthModule } from '../auth/auth.module';
// REMOVED: import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Setting.name, schema: SettingSchema }]),
    // NOTE: AuthModule is not needed here. The AuthGuard is available application-wide.
  ],
  controllers: [SettingsController],
  providers: [SettingsService, ParseObjectIdPipe],
  exports: [SettingsService],
})
export class SettingsModule {}
