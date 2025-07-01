// src/activity/activity.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      // We need the User model to find top active users etc.
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
