// src/support/support.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    EmailModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
