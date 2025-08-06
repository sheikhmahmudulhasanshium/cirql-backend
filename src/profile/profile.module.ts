// src/profile/profile.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './schemas/profile.schema';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';
// --- START: MODIFIED IMPORT ---
import { SocialModule } from '../social/social.module';
// --- END: MODIFIED IMPORT ---

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    AuthModule,
    SettingsModule,
    // --- START: LINTER FIX ---
    // Wrapped SocialModule with forwardRef to resolve the circular dependency.
    forwardRef(() => SocialModule),
    // --- END: LINTER FIX ---
    forwardRef(() => UsersModule),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
