// cirql-backend/src/upload/uploadthing.core.ts

import { createUploadthing, type FileRouter } from 'uploadthing/server';
import { MediaService } from './media.service';
import { Model, Types } from 'mongoose';
import { MediaDocument } from './schemas/media.schema';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

const f = createUploadthing();
const logger = new Logger('UploadthingCore');

export function createUploadthingRouter(
  mediaService: MediaService,
  mediaModel: Model<MediaDocument>,
  jwtService: JwtService,
  usersService: UsersService,
): FileRouter {
  return {
    mediaUploader: f({
      image: { maxFileSize: '4MB', maxFileCount: 10 },
      video: { maxFileSize: '16MB', maxFileCount: 5 },
      blob: { maxFileSize: '16MB', maxFileCount: 20 },
    })
      .middleware(async ({ req, input }) => {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new Error('Unauthorized: No token provided');
        }
        const token = authHeader.substring(7);

        let payload: { sub: string };
        try {
          payload = await jwtService.verifyAsync(token);
        } catch {
          throw new Error('Unauthorized: Invalid token');
        }

        const user: UserDocument | null = await usersService.findById(
          payload.sub,
        );

        if (!user) {
          throw new Error('Unauthorized: User not found');
        }

        let groupId: string | undefined;
        let ticketId: string | undefined;

        if (input && typeof input === 'object') {
          const inputAsRecord = input as Record<string, unknown>;
          if (typeof inputAsRecord.groupId === 'string') {
            groupId = inputAsRecord.groupId;
          }
          if (typeof inputAsRecord.ticketId === 'string') {
            ticketId = inputAsRecord.ticketId;
          }
        }

        logger.log(
          `Middleware AUTHENTICATED: user=${user.id}, group=${groupId ?? 'N/A'}, ticket=${ticketId ?? 'N/A'}`,
        );

        // Your successful fix is incorporated here.
        return {
          userId: user.id as string,
          groupId,
          ticketId,
        };
      })
      .onUploadComplete(async ({ metadata, file }) => {
        const userId =
          typeof (metadata as Record<string, unknown>)?.userId === 'string'
            ? ((metadata as Record<string, unknown>).userId as string)
            : undefined;
        const groupId =
          typeof (metadata as Record<string, unknown>)?.groupId === 'string'
            ? ((metadata as Record<string, unknown>).groupId as string)
            : undefined;
        const ticketId =
          typeof (metadata as Record<string, unknown>)?.ticketId === 'string'
            ? ((metadata as Record<string, unknown>).ticketId as string)
            : undefined;

        if (!userId) {
          throw new Error('Upload metadata is missing a valid userId.');
        }

        const fileName =
          typeof (file as Record<string, unknown>)?.name === 'string'
            ? ((file as Record<string, unknown>).name as string)
            : 'untitled';
        const fileSize =
          typeof (file as Record<string, unknown>)?.size === 'number'
            ? ((file as Record<string, unknown>).size as number)
            : 0;
        const fileType =
          typeof (file as Record<string, unknown>)?.type === 'string'
            ? ((file as Record<string, unknown>).type as string)
            : 'application/octet-stream';
        const fileUrl =
          typeof (file as Record<string, unknown>)?.url === 'string'
            ? ((file as Record<string, unknown>).url as string)
            : '';

        logger.log(`Upload complete for user: ${userId}`);

        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch uploaded file from URL: ${fileUrl}`,
            );
          }
          const arrayBuffer = await response.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);

          const { googleFileId, thumbnailLink } = await mediaService.uploadFile(
            fileBuffer,
            fileName,
            fileType,
          );

          const mediaData: Partial<MediaDocument> = {
            googleFileId,
            thumbnailLink,
            owner: new Types.ObjectId(userId),
            filename: fileName,
            size: fileSize,
            type: fileType,
          };

          if (groupId) {
            mediaData.visibility = 'shared';
            mediaData.contextId = new Types.ObjectId(groupId);
            mediaData.contextModel = 'Group';
          } else if (ticketId) {
            mediaData.visibility = 'shared';
            mediaData.contextId = new Types.ObjectId(ticketId);
            mediaData.contextModel = 'Ticket';
          } else {
            mediaData.visibility = 'private';
          }

          const newMedia = new mediaModel(mediaData);
          await newMedia.save();
          logger.log(
            `Successfully saved media to DB. Google File ID: ${googleFileId}`,
          );

          return {
            uploadedBy: userId,
            mediaId: newMedia._id.toString(),
          };
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'An unknown error occurred';
          logger.error('Error in onUploadComplete callback', errorMessage);
          throw new Error(
            `Failed to process file after upload: ${errorMessage}`,
          );
        }
      }),
  };
}
