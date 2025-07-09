// src/upload/attachment.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { put, PutBlobResult } from '@vercel/blob';
import { Readable } from 'stream';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  /**
   * Uploads a file from a buffer to Vercel Blob for use as an email attachment.
   * @param filename - The desired filename for the attachment (e.g., 'invoice-123.pdf').
   * @param content - The content of the file as a Buffer or string.
   * @returns The public URL of the uploaded file.
   */
  async uploadAttachment(
    filename: string,
    content: Buffer | string | Readable,
  ): Promise<string> {
    this.logger.log(`Uploading attachment: ${filename}`);
    try {
      // The return type of `put` is `PutBlobResult`
      const blob: PutBlobResult = await put(
        `attachments/email/${Date.now()}-${filename}`,
        content,
        {
          access: 'public',
        },
      );

      this.logger.log(`Successfully uploaded to ${blob.url}`);
      return blob.url;
    } catch (error: unknown) {
      // Type the error as unknown for safety
      // Check if the error is an instance of Error to safely access .message
      if (error instanceof Error) {
        this.logger.error(
          `Failed to upload attachment ${filename}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to upload attachment ${filename} with a non-error object`,
          error,
        );
      }
      throw new Error(`Could not upload attachment: ${filename}`);
    }
  }
}
