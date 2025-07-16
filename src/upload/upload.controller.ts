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
import { MediaService } from './media.service';
import { AttachmentService } from './attachment.service';
import { Types } from 'mongoose';

// The data structure sent by the UploadThing webhook
interface UploadThingFile {
  url: string; // This is the temporary URL from UploadThing
  key: string;
  name: string;
  size: number;
  type: string;
}

interface UploadThingWebhookPayload {
  file: UploadThingFile;
  metadata: {
    userId: string;
  };
}

@Controller('api/uploadthing')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  // NestJS's dependency injection works through the constructor like this.
  // The `@Inject()` decorator is not needed for this standard use case.
  constructor(
    private readonly mediaService: MediaService,
    private readonly attachmentService: AttachmentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('uploadthing-hook') hook: string,
    @Body() payload: UploadThingWebhookPayload,
  ) {
    this.logger.log(`Received webhook for user ${payload.metadata?.userId}`);

    if (hook !== process.env.UPLOADTHING_WEBHOOK_SECRET) {
      this.logger.warn('Unauthorized webhook attempt');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    if (!payload?.file || !payload?.metadata?.userId) {
      this.logger.error('Webhook payload is missing data', payload);
      return;
    }

    const { file, metadata } = payload;
    const userId = new Types.ObjectId(metadata.userId);

    try {
      // 1. Create a new, permanent filename for our Vercel Blob store
      const newFilename = `user-media/${userId.toString()}/${Date.now()}-${file.name}`;

      // 2. Use AttachmentService to fetch from UploadThing's temp URL and upload to OUR blob store
      const { blob: newBlob, size: newSize } =
        await this.attachmentService.uploadFromUrl(newFilename, file.url);

      this.logger.log(
        `Successfully moved file to Vercel Blob at ${newBlob.url}`,
      );

      // 3. Create the final, permanent media record in our database
      await this.mediaService.create({
        userId: userId,
        url: newBlob.url, // The permanent Vercel Blob URL
        key: newBlob.pathname, // The path for deletion
        filename: file.name,
        size: newSize, // The accurate size
        type: newBlob.contentType || file.type,
      });

      this.logger.log(`Successfully saved media record for ${file.key}`);
    } catch (error) {
      this.logger.error(
        `Failed to process and save webhook for key: ${file.key}`,
        error,
      );
    }
  }
}
