// src/contact/contact.module.ts
import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [ContactController],
})
export class ContactModule {}
