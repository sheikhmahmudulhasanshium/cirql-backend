// src/risc/risc.controller.ts

import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  RawBody, // 'Req' has been removed from this line
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RiscService } from './risc.service';

@ApiTags('risc')
@Controller('risc')
export class RiscController {
  private readonly logger = new Logger(RiscController.name);

  constructor(private readonly riscService: RiscService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Webhook receiver for Google Cross-Account Protection events.',
    description:
      'This endpoint receives plain text JWTs from Google for security events.',
  })
  @ApiResponse({
    status: 204,
    description: 'Event received and is being processed.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid token.' })
  async handleRiscWebhook(@RawBody() rawBody: Buffer) {
    this.logger.log('Received a request on the RISC webhook.');
    try {
      // The rawBody is a Buffer, so we convert it to a UTF-8 string.
      const token = rawBody.toString('utf8');
      await this.riscService.processEvent(token);
    } catch (error) {
      // Check if error is an instance of Error before accessing .message
      if (error instanceof Error) {
        this.logger.error(`Failed to process RISC event: ${error.message}`);
      } else {
        this.logger.error(
          'An unknown error occurred while processing RISC event.',
        );
      }
    }
  }
}
