// src/announcement/announcement.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { UserDocument } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name)
    private announcementModel: Model<AnnouncementDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  private isAuthorized(user: UserDocument): boolean {
    return user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);
  }

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    creator: UserDocument,
  ): Promise<Announcement> {
    if (!this.isAuthorized(creator)) {
      throw new ForbiddenException(
        'You do not have permission to create announcements.',
      );
    }

    const createdAnnouncement: AnnouncementDocument =
      await this.announcementModel.create(createAnnouncementDto);

    if (createdAnnouncement.visible) {
      await this.notificationsService.createGlobalNotification({
        title: `New Announcement: ${createdAnnouncement.title}`,
        message: createdAnnouncement.content.substring(0, 100) + '...',
        type: NotificationType.ANNOUNCEMENT,
        linkUrl: `/announcements/${createdAnnouncement.id}`,
      });
    }

    return createdAnnouncement;
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
    updater: UserDocument,
  ): Promise<Announcement> {
    if (!this.isAuthorized(updater)) {
      throw new ForbiddenException(
        'You do not have permission to update announcements.',
      );
    }
    const originalAnnouncement = await this.findOne(id);

    const updatedAnnouncement: AnnouncementDocument | null =
      await this.announcementModel
        .findByIdAndUpdate(id, updateAnnouncementDto, { new: true })
        .exec();

    if (!updatedAnnouncement) {
      throw new NotFoundException(`Announcement with id ${id} not found`);
    }

    if (updatedAnnouncement.visible && !originalAnnouncement.visible) {
      await this.notificationsService.createGlobalNotification({
        title: `New Announcement: ${updatedAnnouncement.title}`,
        message: updatedAnnouncement.content.substring(0, 100) + '...',
        type: NotificationType.ANNOUNCEMENT,
        linkUrl: `/announcements/${updatedAnnouncement.id}`,
      });
    }

    return updatedAnnouncement;
  }

  async remove(id: string, remover: UserDocument): Promise<void> {
    if (!this.isAuthorized(remover)) {
      throw new ForbiddenException(
        'You do not have permission to delete announcements.',
      );
    }
    const result: AnnouncementDocument | null = await this.announcementModel
      .findByIdAndDelete(id)
      .exec();
    if (!result) {
      throw new NotFoundException(`Announcement with id ${id} not found`);
    }
  }
}
