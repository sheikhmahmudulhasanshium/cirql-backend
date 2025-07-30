// cirql-backend/src/upload/upload.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { AuthModule } from '../auth/auth.module';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Group, GroupSchema } from '../social/schemas/group.schema';
import { Ticket, TicketSchema } from '../support/schemas/ticket.schema';
// --- START OF THE CRITICAL FIX ---
// Import UsersModule to make UsersService available for injection.
import { UsersModule } from '../users/users.module';
// --- END OF THE CRITICAL FIX ---

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Ticket.name, schema: TicketSchema },
    ]),
    // --- START OF THE CRITICAL FIX ---
    // Add UsersModule and AuthModule to the imports array.
    AuthModule,
    UsersModule,
    // --- END OF THE CRITICAL FIX ---
  ],
  controllers: [MediaController],
  providers: [MediaService, ParseObjectIdPipe],
  exports: [MediaService],
})
export class UploadModule {}
