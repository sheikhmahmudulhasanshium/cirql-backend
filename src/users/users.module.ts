import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuditModule),
    forwardRef(() => NotificationsModule), // Use forwardRef for circular dependency
    EmailModule,
    SettingsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, ParseObjectIdPipe],
  exports: [UsersService],
})
export class UsersModule {}
