import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Setting, SettingSchema } from './schemas/setting.schema';
import { AuthModule } from '../auth/auth.module';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe'; // Adjust path if needed

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Setting.name, schema: SettingSchema }]),
    AuthModule, // For AuthGuard('jwt')
  ],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    ParseObjectIdPipe, // Ensure this pipe is available if used in controller
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
