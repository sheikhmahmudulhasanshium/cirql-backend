import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError, FilterQuery } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
  AnnouncementType,
} from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnnouncementsService {
  private readonly adminList: string[];
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name)
    private announcementModel: Model<AnnouncementDocument>,
    private readonly configService: ConfigService,
  ) {
    const adminListString =
      this.configService.get<string>('ADMIN_LIST') ?? '[]';
    this.adminList = this.parseAdminList(adminListString);
    this.logger.debug(
      `Initialized with admin list: ${JSON.stringify(this.adminList)}`,
    );
  }

  private parseAdminList(adminListString: string): string[] {
    try {
      const parsed = JSON.parse(adminListString) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === 'string')
      ) {
        return parsed;
      }
      this.logger.error(
        'ADMIN_LIST is not a valid JSON array of strings. No users will be considered admins.',
      );
      return [];
    } catch (error) {
      this.logger.error(
        'Error parsing ADMIN_LIST environment variable:',
        error,
      );
      return [];
    }
  }

  private isAdmin(userId: string): boolean {
    return this.adminList.includes(userId);
  }

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    userId: string,
  ): Promise<Announcement> {
    if (!this.isAdmin(userId)) {
      throw new ForbiddenException(
        'You do not have permission to create announcements.',
      );
    }
    const createdAnnouncement = new this.announcementModel(
      createAnnouncementDto,
    );
    return createdAnnouncement.save();
  }

  async findAllSimple(): Promise<Announcement[]> {
    try {
      return await this.announcementModel.find().exec();
    } catch (error) {
      this.logger.error(
        'Error while retrieving all simple announcements:',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve announcements.',
      );
    }
  }

  async findAll(
    type?: string,
    page: number = 1,
    limit: number = 10,
    visible?: boolean,
  ): Promise<{ data: Announcement[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<AnnouncementDocument> = {};

    if (type) {
      filter.type = type as AnnouncementType;
    }
    if (visible !== undefined) {
      filter.visible = visible;
    }

    const data = await this.announcementModel
      .find(filter)
      .sort({ createdAt: 'desc' })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.announcementModel.countDocuments(filter).exec();
    return { data, total };
  }

  async findOne(id: string): Promise<Announcement> {
    try {
      const announcement = await this.announcementModel.findById(id).exec();
      if (!announcement) {
        throw new NotFoundException(`Announcement with id ${id} not found`);
      }
      return announcement;
    } catch (error) {
      if (
        error instanceof MongooseError.CastError &&
        error.kind === 'ObjectId'
      ) {
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
      throw new ForbiddenException(
        'You do not have permission to update announcements.',
      );
    }
    const updatedAnnouncement = await this.announcementModel
      .findByIdAndUpdate(id, updateAnnouncementDto, { new: true })
      .exec();

    if (!updatedAnnouncement) {
      throw new NotFoundException(`Announcement with id ${id} not found`);
    }
    return updatedAnnouncement;
  }

  async remove(id: string, userId: string): Promise<void> {
    if (!this.isAdmin(userId)) {
      throw new ForbiddenException(
        'You do not have permission to delete announcements.',
      );
    }
    const result = await this.announcementModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Announcement with id ${id} not found`);
    }
  }
}
