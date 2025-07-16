//cirql-backend/src/upload/upload.router.ts` (Corrected and Updated)

import { createUploadthing, type FileRouter } from 'uploadthing/express';
import { Types } from 'mongoose';
import { MediaService } from './media.service';
import { AttachmentService } from './attachment.service';

const f = createUploadthing();

interface AuthMetadata {
  userId: string;
  mediaService: MediaService;
  attachmentService: AttachmentService; // Add attachmentService
}

// THIS IS THE CORE FIX FOR FILE STORAGE
const handleUploadToBlobStore = async (
  metadata: AuthMetadata,
  file: { url: string; key: string; name: string; size: number; type: string },
) => {
  const { attachmentService } = metadata;
  const newFilename = `user-media/${metadata.userId}/${Date.now()}-${file.name}`;

  // 1. Download from UploadThing's temp storage and upload to OUR Vercel Blob
  const newBlobResult = await attachmentService.uploadFromUrl(
    newFilename,
    file.url,
  );

  // --- START OF FIX ---
  // The url and pathname are now nested inside the 'blob' property of the result.
  // 2. Return the NEW blob details for saving to our database
  return {
    url: newBlobResult.blob.url,
    key: newBlobResult.blob.pathname, // Use pathname as the key for deletion
  };
  // --- END OF FIX ---
};

export const ourFileRouter: FileRouter = {
  // Router for general media uploads
  mediaUploader: f({
    image: { maxFileSize: '8MB', maxFileCount: 10 },
    audio: { maxFileSize: '32MB', maxFileCount: 5 },
    video: { maxFileSize: '256MB', maxFileCount: 2 },
    'application/pdf': { maxFileSize: '32MB', maxFileCount: 5 },
    blob: { maxFileSize: '64MB', maxFileCount: 5 },
  }).onUploadComplete(async ({ metadata, file }) => {
    if (!metadata) {
      console.error('[UPLOAD_ERROR] Metadata is missing for file:', file.url);
      return;
    }
    const { userId, mediaService } = metadata as AuthMetadata;
    const { url: newUrl, key: newKey } = await handleUploadToBlobStore(
      metadata,
      file,
    );

    await mediaService.create({
      userId: new Types.ObjectId(userId),
      url: newUrl,
      key: newKey,
      filename: file.name,
      size: file.size, // We use the size from the original UploadThing file object here.
      type: file.type,
    });
    console.log(`[BLOB_SUCCESS] User: ${userId}, File: ${newUrl}`);
  }),

  // Router for profile pictures and group icons
  imageUploader: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ metadata, file }) => {
    if (!metadata) {
      console.error('[IMAGE_UPLOAD_ERROR] Metadata missing for:', file.url);
      return;
    }
    // We don't save to DB here. We just re-upload it to our blob store
    // and the client will get the new URL and key to use in another request
    // (e.g., when updating a profile or creating/updating a group).
    const { url: newUrl, key: newKey } = await handleUploadToBlobStore(
      metadata,
      file,
    );
    console.log(`[IMAGE_BLOB_SUCCESS] Rerouted ${file.name} to ${newUrl}`);

    // Return the new URL and Key so the client-side uploader gets it
    return { newUrl, newKey };
  }),
};

export type OurFileRouter = typeof ourFileRouter;
