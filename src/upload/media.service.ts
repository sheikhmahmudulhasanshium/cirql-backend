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
    limit = 30,
  ): Promise<{
    data: MediaDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const query = { userId: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.mediaModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.mediaModel.countDocuments(query).exec(),
    ]);
    return { data: data as MediaDocument[], total, page, limit };
  }

  async deleteById(mediaId: string, userId: string): Promise<void> {
    const media = await this.mediaModel.findById(mediaId).exec();

    if (!media) {
      throw new NotFoundException('Media file not found.');
    }

    if (media.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this file.',
      );
    }

    try {
      // The key from UploadThing is used for deletion.
      await del(media.url);
      this.logger.log(
        `Deleted file from Vercel Blob/UploadThing: ${media.url}`,
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Could not delete file from provider: ${media.url}`,
          error.message,
        );
      } else {
        this.logger.error(
          `Could not delete file from provider: ${media.url}`,
          String(error),
        );
      }
      // Do not re-throw; we should still delete the DB record.
    }

    await this.mediaModel.findByIdAndDelete(media.id).exec();
    this.logger.log(`Deleted media record from database: ${media.id}`);
  }
}
