// src/users/users.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module'; // --- THIS IMPORT IS CRUCIAL ---

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuditModule),
    EmailModule, // --- THIS LINE IS THE FIX ---
  ],
  controllers: [UsersController],
  providers: [UsersService, ParseObjectIdPipe],
  exports: [UsersService],
})
export class UsersModule {}
