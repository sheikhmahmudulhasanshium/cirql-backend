// src/upload/media.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { del } from '@vercel/blob';
import { Media, MediaDocument } from './schemas/media.schema';

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
  ) {}

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

    // --- THIS IS THE FIX ---
    // Instead of creating a new ObjectId, we pass the userId string directly.
    // Mongoose will correctly handle the query. This avoids any potential
    // issues with ObjectId conversion or type mismatches.
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
    // --- END OF FIX ---

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
      await del(media.url);
      this.logger.log(`Deleted file from Vercel Blob: ${media.key}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Could not delete file from Vercel Blob: ${media.key}`,
          error.message,
        );
      } else {
        this.logger.error(
          `Could not delete file from Vercel Blob: ${media.key}`,
          String(error),
        );
      }
    }

    await this.mediaModel.findByIdAndDelete(media.id);
    this.logger.log(`Deleted media record from database: ${media.id}`);
  }
}
