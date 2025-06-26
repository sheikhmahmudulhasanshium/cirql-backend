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
    ]),
    UsersModule,
    AuthModule,
    forwardRef(() => NotificationsModule), // Use forwardRef to handle circular dependency
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
  // Export services that other modules (like Notifications) might need.
  exports: [SocialService, FriendsService, FollowersService, GroupsService],
})
export class SocialModule {}
