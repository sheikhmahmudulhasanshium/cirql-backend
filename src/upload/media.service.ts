import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { del } from '@vercel/blob';
import { Media, MediaDocument } from './schemas/media.schema';
import { AttachmentService } from './attachment.service';

export interface CreateMediaParams {
  userId: Types.ObjectId;
  url: string;
  key: string;
  filename: string;
  size: number;
  type: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    private readonly attachmentService: AttachmentService,
  ) {}

  async createFromUrl(
    urlToFetch: string,
    userId: Types.ObjectId,
  ): Promise<MediaDocument> {
    // --- FIX: Use .toString() for logging the ObjectId ---
    this.logger.log(
      `Processing upload from URL for user ${userId.toString()}: ${urlToFetch}`,
    );
    try {
      const originalFilename =
        urlToFetch.split('/').pop()?.split('?')[0] || 'file-from-url';
      // --- FIX: Use .toString() for logging the ObjectId ---
      const newFilename = `user-media/${userId.toString()}/${Date.now()}-${originalFilename}`;

      // Use the updated service method
      const uploadResult = await this.attachmentService.uploadFromUrl(
        newFilename,
        urlToFetch,
      );

      const { blob, size } = uploadResult;

      const mediaRecord = await this.create({
        userId: userId,
        url: blob.url,
        key: blob.pathname,
        filename: originalFilename,
        // --- FIX: Use the size from the uploadResult ---
        size: size,
        type: blob.contentType || 'application/octet-stream',
      });

      this.logger.log(
        `Successfully created media record ${mediaRecord.id} from URL ${urlToFetch}`,
      );
      return mediaRecord;
    } catch (error) {
      this.logger.error(
        `Failed to process upload from URL: ${urlToFetch}`,
        error,
      );
      throw new BadRequestException(
        `Could not fetch or upload the file from the provided URL. Please ensure it is a direct, public link to a file.`,
      );
    }
  }

  async create(params: CreateMediaParams): Promise<MediaDocument> {
    try {
      const newMedia = await this.mediaModel.create(params);
      this.logger.log(
        `Created media record ${newMedia.id} for user ${newMedia.userId.toString()}`,
      );
      return newMedia;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to create media record for user ${params.userId.toString()}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `An unknown error occurred while creating media record`,
          String(error),
        );
      }
      throw error;
    }
  }

  async findForUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: MediaDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = { userId: userId };
    const [data, total] = await Promise.all([
      this.mediaModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.mediaModel.countDocuments(query),
    ]);
    return { data: data as MediaDocument[], total };
  }

  async deleteById(mediaId: string, userId: string): Promise<void> {
    const media = await this.mediaModel.findById(mediaId);

    if (!media) {
      throw new NotFoundException('Media file not found.');
    }

    if (media.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this file.',
      );
    }

    try {
      // --- FIX: The 'del' function requires the full URL of the blob ---
      await del(media.url);
      this.logger.log(`Deleted file from Vercel Blob: ${media.url}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Could not delete file from Vercel Blob: ${media.url}`,
          error.message,
        );
      } else {
        this.logger.error(
          `Could not delete file from Vercel Blob: ${media.url}`,
          String(error),
        );
      }
    }

    await this.mediaModel.findByIdAndDelete(media.id);
    this.logger.log(`Deleted media record from database: ${media.id}`);
  }
}
