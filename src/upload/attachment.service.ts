import { Injectable, Logger } from '@nestjs/common';
import { put, del, PutBlobResult } from '@vercel/blob';
import { Readable } from 'stream';

// --- START: NEW TYPE DEFINITION ---
// This new interface defines the return shape of our updated method.
export interface UploadFromUrlResult {
  blob: PutBlobResult;
  size: number;
}
// --- END: NEW TYPE DEFINITION ---

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  // --- START: MODIFIED METHOD ---
  // The method now returns our new interface Promise<UploadFromUrlResult>
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

      // Capture the size from the 'content-length' header. Fallback to 0 if not present.
      const size = parseInt(response.headers.get('content-length') || '0', 10);

      const blob = await put(filename, response.body, { access: 'public' });
      this.logger.log(`Successfully uploaded ${filename} to ${blob.url}`);

      // Return both the blob result and the captured size
      return { blob, size };
    } catch (error) {
      this.logger.error(`Failed to upload ${filename} from URL`, error);
      throw new Error(`Could not upload from URL: ${filename}`);
    }
  }
  // --- END: MODIFIED METHOD ---

  async deleteAttachment(key?: string): Promise<void> {
    if (!key) {
      this.logger.warn('Attempted to delete blob without a key.');
      return;
    }
    try {
      // The 'del' function from vercel/blob expects the full URL.
      await del(key);
      this.logger.log(`Successfully deleted blob: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete blob ${key}`, error);
      // Do not re-throw, as the primary operation should still succeed
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
