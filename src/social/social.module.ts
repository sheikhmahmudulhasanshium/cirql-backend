// src/social/social.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  SocialProfile,
  SocialProfileSchema,
} from './schemas/social-profile.schema';
import {
  FriendRequest,
  FriendRequestSchema,
} from './schemas/friend-request.schema';
import { Group, GroupSchema } from './schemas/group.schema';
import {
  FollowRequest,
  FollowRequestSchema,
} from './schemas/follow-request.schema';
import { SettingsModule } from '../settings/settings.module';
// --- START: ADDED/MODIFIED IMPORTS ---
import { ProfileModule } from '../profile/profile.module';
// We need to import the Setting schema to register it here.
import { Setting, SettingSchema } from '../settings/schemas/setting.schema';
// --- END: ADDED/MODIFIED IMPORTS ---
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialProfile.name, schema: SocialProfileSchema },
      { name: FriendRequest.name, schema: FriendRequestSchema },
      { name: Group.name, schema: GroupSchema },
      { name: FollowRequest.name, schema: FollowRequestSchema },
      // --- START: FIX ---
      // Register the Setting schema here to make SettingModel available
      // within the SocialModule's dependency injection context.
      { name: Setting.name, schema: SettingSchema },
      // --- END: FIX ---
    ]),
    UsersModule,
    AuthModule,
    SettingsModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => ProfileModule),
  ],
  controllers: [
    SocialController,
    FriendsController,
    FollowersController,
    GroupsController,
    RecommendationsController,
  ],
  providers: [
    SocialService,
    FriendsService,
    FollowersService,
    GroupsService,
    RecommendationsService,
  ],
  exports: [SocialService, FriendsService, FollowersService, GroupsService],
})
export class SocialModule {}
