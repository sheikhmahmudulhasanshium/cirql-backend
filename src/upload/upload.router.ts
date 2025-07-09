// src/upload/upload.router.ts
import { createUploadthing, type FileRouter } from 'uploadthing/express';
import { Types } from 'mongoose';
import { MediaService } from './media.service';

const f = createUploadthing();

// Define a type for the metadata we expect to receive from our controller
interface AuthMetadata {
  userId: string;
  mediaService: MediaService; // Expect the service instance
}

export const ourFileRouter: FileRouter = {
  mediaUploader: f({
    image: { maxFileSize: '8MB', maxFileCount: 10 },
    audio: { maxFileSize: '32MB', maxFileCount: 5 },
    video: { maxFileSize: '256MB', maxFileCount: 2 },
    'application/pdf': { maxFileSize: '32MB', maxFileCount: 5 },
    'application/zip': { maxFileSize: '128MB', maxFileCount: 1 },
    blob: { maxFileSize: '64MB', maxFileCount: 5 },
  }).onUploadComplete(async ({ metadata, file }) => {
    if (!metadata) {
      console.error('[UPLOAD_ERROR] Metadata is missing for file:', file.url);
      return;
    }
    const { userId, mediaService } = metadata as AuthMetadata;

    // Use the service to create a record in our database
    await mediaService.create({
      userId: new Types.ObjectId(userId),
      url: file.url,
      key: file.key,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

    console.log(`[UPLOAD_SUCCESS] User: ${userId}, File: ${file.url}`);
  }),

  profilePicture: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ metadata, file }) => {
    if (!metadata) {
      console.error(
        '[PROFILE_PIC_ERROR] Metadata is missing for file:',
        file.url,
      );
      return;
    }
    const { userId, mediaService } = metadata as AuthMetadata;

    await mediaService.create({
      userId: new Types.ObjectId(userId),
      url: file.url,
      key: file.key,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

    console.log(`[PROFILE_PIC_SUCCESS] User: ${userId}, File: ${file.url}`);
  }),
};

export type OurFileRouter = typeof ourFileRouter;
