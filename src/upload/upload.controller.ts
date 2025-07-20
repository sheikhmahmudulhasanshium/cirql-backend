import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

// --- START OF FIX: Define a minimal, safe type for the payload ---
// This tells TypeScript that payload is an object that might have metadata.
interface WebhookPayload {
  metadata?: {
    userId?: string;
  };
}
// --- END OF FIX ---

@Controller('api/uploadthing')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor() {}

  @Post()
  @HttpCode(HttpStatus.OK)
  // --- START OF FIX: Remove 'async' as it is no longer needed ---
  handleWebhook(
    // --- END OF FIX ---
    @Headers('uploadthing-hook') hook: string,
    @Body() payload: WebhookPayload, // Use the new safe type
  ) {
    this.logger.log(
      `Webhook received for user ${payload.metadata?.userId}. Acknowledged and ignored, as client is now responsible for the save.`,
    );

    if (
      process.env.NODE_ENV === 'production' &&
      hook !== process.env.UPLOADTHING_WEBHOOK_SECRET
    ) {
      this.logger.warn('Unauthorized webhook attempt in production');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Immediately return a success response without touching the database.
    return;
  }
}
