// src/email/email.module.ts
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // EmailService needs access to ConfigService
  providers: [EmailService],
  exports: [EmailService], // Export so other modules can use it
})
export class EmailModule {}
