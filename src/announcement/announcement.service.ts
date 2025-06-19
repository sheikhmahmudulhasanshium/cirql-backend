import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error, FilterQuery } from 'mongoose'; // <-- Import FilterQuery
import {
  Announcement,
  AnnouncementDocument,
  AnnouncementType, // <-- Import AnnouncementType
} from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnnouncementsService {
  private readonly adminList: string[];
  private readonly logger = new Logger(AnnouncementsService.name);

  // ... (no changes to constructor or helper methods)
  private getAdminListConfig(): string {
    const adminListString = this.configService.get<string>('ADMIN_LIST');
    return adminListString ?? '[]';
  }

  constructor(
    @InjectModel(Announcement.name)
    private announcementModel: Model<AnnouncementDocument>,
    private readonly configService: ConfigService,
  ) {
    const safeAdminListString = this.getAdminListConfig();
    this.adminList = this.parseAdminList(safeAdminListString);
    this.logger.debug(
      `Initialized with admin list: ${JSON.stringify(this.adminList)}`,
    );
  }

  private parseAdminList(adminListString: string): string[] {
    try {
      const parsed = JSON.parse(adminListString) as unknown;
      if (!Array.isArray(parsed)) {
        this.logger.error(
          'ADMIN_LIST is not a valid JSON array. No users will be considered admins.',
        );
        return [];
      }
      const stringArray: string[] = parsed.filter(
        (item): item is string => typeof item === 'string',
      );
      if (stringArray.length < parsed.length) {
        this.logger.warn(
          'ADMIN_LIST contains non-string values. Ignoring non-string values.',
        );
      }
      return stringArray;
    } catch (error) {
      this.logger.error(
        'Error parsing ADMIN_LIST environment variable:',
        error,
        'No users will be considered admins.',
      );
      return [];
    }
  }

  private isAdmin(userId: string): boolean {
    return this.adminList.includes(userId);
  }

  // ... (no changes to create, findAllSimple)
  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    userId: string,
  ): Promise<Announcement> {
    if (!this.isAdmin(userId)) {
      this.logger.warn(
        `User ${userId} attempted to create an announcement without admin privileges.`,
      );
      throw new ForbiddenException(
        'You do not have permission to create announcements.',
      );
    }
    const createdAnnouncement = new this.announcementModel({
      ...createAnnouncementDto,
      createdBy: userId,
    });
    this.logger.log(`Announcement created by admin ${userId}`);
    return createdAnnouncement.save();
  }

  async findAllSimple(): Promise<Announcement[]> {
    try {
      const announcements = await this.announcementModel.find().exec();
      this.logger.log(
        `Retrieved all announcements (simple get): ${announcements.length} announcements`,
      );
      return announcements;
    } catch (error) {
      this.logger.error(
        'Error while retrieving all announcements (simple get):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve announcements.',
      );
    }
  }
  // *** LINTER FIXES APPLIED HERE ***
  async findAll(
    type?: string,
    page: number = 1,
    limit: number = 10,
    visible?: boolean,
  ): Promise<{ data: Announcement[]; total: number }> {
    const skip = (page - 1) * limit;

    // Use Mongoose's `FilterQuery` for type safety instead of `any`.
    const filter: FilterQuery<AnnouncementDocument> = {};

    if (type) {
      // The `as AnnouncementType` cast might be needed if `type` is just a string
      // to satisfy the schema's enum type.
      filter.type = type as AnnouncementType;
    }

    if (visible !== undefined) {
      filter.visible = visible;
    }

    const data = await this.announcementModel
      .find(filter) // `filter` is now a strongly typed object
      .sort({ createdAt: 'desc' })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.announcementModel.countDocuments(filter).exec(); // Also strongly typed
    this.logger.log(
      `Found ${data.length} announcements with filter ${JSON.stringify(
        filter,
      )} (total: ${total})`,
    );
    return { data, total };
  }

  // ... (no changes to findOne, update, or remove)
  async findOne(id: string): Promise<Announcement> {
    try {
      const announcement = await this.announcementModel.findById(id).exec();
      if (!announcement) {
        this.logger.warn(`Announcement with id ${id} not found`);
        throw new NotFoundException(`Announcement with id ${id} not found`);
      }
      this.logger.log(`Announcement with id ${id} found`);
      return announcement;
    } catch (error) {
      if (error instanceof Error.CastError && error.kind === 'ObjectId') {
        this.logger.error(`Invalid ObjectId ${id} provided`);
        throw new BadRequestException(`Invalid Announcement ID: ${id}`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateAnnouncementDto: UpdateAnnouncementDto,
    userId: string,
  ): Promise<Announcement> {
    if (!this.isAdmin(userId)) {
      this.logger.warn(
        `User ${userId} attempted to update announcement ${id} without admin privileges.`,
      );
      throw new ForbiddenException(
        'You do not have permission to update announcements.',
      );
    }

    try {
      const updatedAnnouncement = await this.announcementModel
        .findByIdAndUpdate(
          id,
          {
            ...updateAnnouncementDto,
            updatedBy: userId,
          },
          { new: true, runValidators: true },
        )
        .exec();
      if (!updatedAnnouncement) {
        this.logger.warn(`Announcement with id ${id} not found for update`);
        throw new NotFoundException(`Announcement with id ${id} not found`);
      }
      this.logger.log(`Announcement ${id} updated by admin ${userId}`);
      return updatedAnnouncement;
    } catch (error) {
      if (error instanceof Error.CastError && error.kind === 'ObjectId') {
        this.logger.error(`Invalid ObjectId ${id} provided for update`);
        throw new BadRequestException(`Invalid Announcement ID: ${id}`);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      const announcement = await this.announcementModel.findById(id).exec();
      if (!announcement) {
        this.logger.warn(`Announcement with id ${id} not found for deletion`);
        throw new NotFoundException(`Announcement with id ${id} not found`);
      }

      if (userId && !this.isAdmin(userId)) {
        this.logger.warn(
          `User ${userId} attempted to delete announcement ${id} without admin privileges.`,
        );
        throw new ForbiddenException(
          'You do not have permission to delete announcements.',
        );
      }

      const result = await this.announcementModel.findByIdAndDelete(id).exec();
      if (!result) {
        this.logger.warn(
          `Announcement with id ${id} not found for deletion after check`,
        );
        throw new NotFoundException(`Announcement with id ${id} not found`);
      }
      this.logger.log(`Announcement ${id} deleted`);
    } catch (error) {
      if (error instanceof Error.CastError && error.kind === 'ObjectId') {
        this.logger.error(`Invalid ObjectId ${id} provided for deletion`);
        throw new BadRequestException(`Invalid Announcement ID: ${id}`);
      }
      throw error;
    }
  }
}
