// src/risc/risc.module.ts

import { Module } from '@nestjs/common';
import { RiscController } from './risc.controller';
import { RiscService } from './risc.service';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [UsersModule, ConfigModule], // We need UsersService and ConfigService
  controllers: [RiscController],
  providers: [RiscService],
})
export class RiscModule {}
