import { Injectable, Logger } from '@nestjs/common';
import { put, del, PutBlobResult } from '@vercel/blob';
import { Readable } from 'stream';

export interface UploadFromUrlResult {
  blob: PutBlobResult;
  size: number;
}

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  async uploadFromUrl(
    filename: string,
    urlToFetch: string,
  ): Promise<UploadFromUrlResult> {
    this.logger.log(`Fetching from URL to upload: ${filename}`);
    try {
      const response = await fetch(urlToFetch);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const size = parseInt(response.headers.get('content-length') || '0', 10);

      // --- START OF FIX ---
      // 1. Capture the content type from the fetched file's headers.
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream';
      this.logger.log(`Detected content-type: ${contentType} for ${filename}`);

      // 2. Pass the captured contentType when uploading to your Vercel Blob.
      const blob = await put(filename, response.body, {
        access: 'public',
        contentType: contentType, // This is the required addition
      });
      // --- END OF FIX ---

      this.logger.log(`Successfully uploaded ${filename} to ${blob.url}`);

      return { blob, size };
    } catch (error) {
      this.logger.error(`Failed to upload ${filename} from URL`, error);
      throw new Error(`Could not upload from URL: ${filename}`);
    }
  }

  // --- The rest of the file is unchanged ---
  async deleteAttachment(key?: string): Promise<void> {
    if (!key) {
      this.logger.warn('Attempted to delete blob without a key.');
      return;
    }
    try {
      await del(key);
      this.logger.log(`Successfully deleted blob: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete blob ${key}`, error);
    }
  }

  async uploadAttachment(
    filename: string,
    content: Buffer | string | Readable,
  ): Promise<string> {
    this.logger.log(`Uploading attachment: ${filename}`);
    try {
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
