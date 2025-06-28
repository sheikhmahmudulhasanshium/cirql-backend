// src/support/support.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Ticket,
  TicketDocument,
  TicketStatus,
  TicketCategory,
} from './schemas/ticket.schema';
import {
  Message,
  MessageDocument as ActualMessageDocument,
} from './schemas/message.schema';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { Role } from '../common/enums/role.enum';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

export interface TicketSummary {
  _id: Types.ObjectId;
  user?: Types.ObjectId | Partial<UserDocument> | null;
  guestName?: string;
  guestEmail?: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  lastSeenByUserAt: Date | null;
  lastSeenByAdminAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasUnseenMessages: boolean;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<ActualMessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyAdminsOfNewTicket(
    ticket: TicketDocument,
    initialMessageContent: string,
    submittedBy: string,
  ): Promise<void> {
    const adminUsers = await this.userModel
      .find({ roles: { $in: [Role.Admin, Role.Owner] } })
      .select('_id')
      .lean()
      .exec();

    const notificationPromises = adminUsers.map((admin) =>
      this.notificationsService.createNotification({
        userId: admin._id,
        title: `New Ticket: ${ticket.subject}`,
        message: `A new support ticket has been submitted by ${submittedBy}.`,
        type: NotificationType.TICKET_ADMIN_ALERT,
        linkUrl: `/admin/support/${ticket._id.toString()}`,
      }),
    );
    await Promise.all(notificationPromises);

    await this.emailService.sendAdminTicketNotificationEmail({
      ticketId: ticket._id.toString(),
      ticketSubject: ticket.subject,
      submittedBy: submittedBy,
      preview: initialMessageContent.substring(0, 150) + '...',
    });
  }

  async addMessage(
    ticketId: string,
    addMessageDto: UpdateSupportDto,
    user: UserDocument,
  ): Promise<TicketDocument> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate<{ user: UserDocument }>('user', 'email firstName lastName');

    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException(
        'This ticket is closed and cannot be replied to.',
      );
    }

    // FIX: Use a type-safe check. Since it's populated, we can safely access _id.
    const ticketOwnerId = ticket.user?._id;
    const isOwner =
      ticket.user && ticketOwnerId && user._id.equals(ticketOwnerId);

    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access this ticket.',
      );
    }

    const newMessage = await this.messageModel.create({
      ticketId: ticket._id,
      sender: user._id,
      content: addMessageDto.content,
      attachments: addMessageDto.attachments || [],
    });

    ticket.messages.push(newMessage._id);

    if (isAdmin) {
      ticket.status = TicketStatus.PENDING_USER_REPLY;
      ticket.lastSeenByAdminAt = new Date();
    } else {
      ticket.status = TicketStatus.OPEN;
      ticket.lastSeenByUserAt = new Date();
    }
    await ticket.save();

    if (isAdmin && ticket.user && ticket.user._id) {
      await this.notificationsService.createNotification({
        userId: ticket.user._id,
        title: `Reply to your ticket: ${ticket.subject}`,
        message: `A new reply has been added by our support team.`,
        type: NotificationType.SUPPORT_REPLY,
        linkUrl: `/contacts/${ticket._id.toString()}`,
      });
    }

    const recipientEmail = ticket.user?.email || ticket.guestEmail;
    if (isAdmin && recipientEmail) {
      await this.emailService.sendTicketReplyEmail({
        to: recipientEmail,
        ticketId: ticket._id.toString(),
        ticketSubject: `Re: ${ticket.subject}`,
        replyContent: addMessageDto.content,
        replierName: `${user.firstName} ${user.lastName}`,
      });
    } else if (isOwner && ticket.user) {
      const populatedUser = ticket.user;
      await this.notifyAdminsOfNewTicket(
        ticket,
        addMessageDto.content,
        `${populatedUser.firstName} ${populatedUser.lastName}`,
      );
    }

    return this.getTicketById(ticketId, user);
  }

  async closeTicket(
    ticketId: string,
    adminUser: UserDocument,
  ): Promise<TicketDocument> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate<{ user: UserDocument }>('user', 'email firstName');

    if (!ticket) throw new NotFoundException('Ticket not found.');

    if (ticket.status === TicketStatus.CLOSED) return ticket;

    ticket.status = TicketStatus.CLOSED;
    await ticket.save();
    this.logger.log(
      `Ticket ${ticketId} has been closed by admin ${adminUser.id}.`,
    );

    const recipientEmail = ticket.user?.email || ticket.guestEmail;
    if (recipientEmail) {
      await this.emailService.sendTicketReplyEmail({
        to: recipientEmail,
        ticketId: ticket._id.toString(),
        ticketSubject: `[Closed] ${ticket.subject}`,
        replyContent: `This support ticket has been closed by our support team. If you have further questions, please create a new ticket.`,
        replierName: `${adminUser.firstName} ${adminUser.lastName}`,
      });
    }
    return ticket;
  }

  async getTicketById(
    ticketId: string,
    userPerformingAction: UserDocument,
  ): Promise<TicketDocument> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate({
        path: 'messages',
        populate: {
          path: 'sender',
          model: 'User',
          select: 'firstName lastName picture roles',
        },
      })
      .populate<{ user: UserDocument }>('user', 'firstName lastName email')
      .exec();

    if (!ticket) throw new NotFoundException('Ticket not found.');

    const isAdmin =
      userPerformingAction.roles.includes(Role.Admin) ||
      userPerformingAction.roles.includes(Role.Owner);

    // FIX: Use a type-safe check. Since it's populated, we can safely access _id.
    const ticketOwnerId = ticket.user?._id;
    const isOwner =
      ticket.user &&
      ticketOwnerId &&
      userPerformingAction._id.equals(ticketOwnerId);

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You cannot view this ticket.');
    }
    return ticket;
  }

  async markTicketAsSeen(ticketId: string, user: UserDocument): Promise<void> {
    const ticketFromDb = await this.ticketModel.findById(ticketId);
    if (!ticketFromDb) {
      throw new NotFoundException('Ticket not found.');
    }
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);

    // FIX: This robust check handles both ObjectId and populated UserDocument cases.
    let isOwner = false;
    if (ticketFromDb.user) {
      const userIdToCompare =
        ticketFromDb.user instanceof Types.ObjectId
          ? ticketFromDb.user
          : ticketFromDb.user._id;
      isOwner = user._id.equals(userIdToCompare);
    }

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    if (isAdmin) {
      await this.ticketModel.updateOne(
        { _id: ticketId },
        { lastSeenByAdminAt: new Date() },
      );
    } else if (isOwner) {
      await this.ticketModel.updateOne(
        { _id: ticketId },
        { lastSeenByUserAt: new Date() },
      );
    }
    this.logger.log(`Ticket ${ticketId} marked as seen by user ${user.id}`);
  }

  async createAppealTicket(
    dto: CreateAppealDto,
    user: UserDocument,
  ): Promise<TicketDocument> {
    const subject = `[Ban Appeal] - From User: ${user.firstName || user.email}`;
    const newTicket = await this.ticketModel.create({
      category: TicketCategory.OTHER,
      subject: subject,
      user: user._id,
      guestName:
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Banned User',
      guestEmail: user.email,
      lastSeenByAdminAt: null,
      lastSeenByUserAt: new Date(),
      status: TicketStatus.OPEN,
      messages: [],
    });

    const initialMessage = await this.messageModel.create({
      ticketId: newTicket._id,
      sender: user._id,
      content: dto.message,
    });

    newTicket.messages.push(initialMessage._id);
    await newTicket.save();

    await this.notifyAdminsOfNewTicket(
      newTicket,
      dto.message,
      `${user.firstName || 'Banned User'} (ID: ${user.id})`,
    );

    return newTicket;
  }

  async createPublicTicket(
    dto: CreatePublicTicketDto,
  ): Promise<TicketDocument> {
    const newTicket = await this.ticketModel.create({
      category: dto.category,
      subject: `[${dto.category}] - New Inquiry from ${dto.name}`,
      guestName: dto.name,
      guestEmail: dto.email,
      status: TicketStatus.OPEN,
      messages: [],
      lastSeenByAdminAt: null,
      lastSeenByUserAt: null,
    });

    const initialMessage = await this.messageModel.create({
      ticketId: newTicket._id,
      sender: new Types.ObjectId('000000000000000000000000'),
      content: dto.message,
    });

    newTicket.messages.push(initialMessage._id);
    await newTicket.save();

    await this.notifyAdminsOfNewTicket(
      newTicket,
      dto.message,
      `${dto.name} (Guest)`,
    );

    return newTicket;
  }

  async createTicket(
    createTicketDto: CreateSupportDto,
    user: UserDocument,
  ): Promise<TicketDocument> {
    const recentTicket = await this.ticketModel.findOne({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 60000) },
    });
    if (recentTicket)
      throw new ForbiddenException(
        'You can only create one ticket per minute.',
      );
    const subject = `[${createTicketDto.category}] - ${createTicketDto.subject}`;

    const newTicket = await this.ticketModel.create({
      ...createTicketDto,
      subject,
      user: user._id,
      lastSeenByUserAt: new Date(),
      lastSeenByAdminAt: null,
      messages: [],
    });

    const initialMessage = await this.messageModel.create({
      ticketId: newTicket._id,
      sender: user._id,
      content: createTicketDto.initialMessage,
      attachments: createTicketDto.attachments || [],
    });

    newTicket.messages.push(initialMessage._id);
    await newTicket.save();

    await this.notifyAdminsOfNewTicket(
      newTicket,
      createTicketDto.initialMessage,
      `${user.firstName} ${user.lastName}`,
    );

    return newTicket;
  }

  async getTicketsForUser(userId: Types.ObjectId): Promise<TicketSummary[]> {
    const tickets = await this.ticketModel
      .find({ user: userId })
      .sort({ updatedAt: -1 })
      .select('-messages')
      .lean()
      .exec();

    return tickets.map((ticket) => ({
      _id: ticket._id,
      user: ticket.user as Types.ObjectId | undefined,
      guestName: ticket.guestName,
      guestEmail: ticket.guestEmail,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      lastSeenByUserAt: ticket.lastSeenByUserAt,
      lastSeenByAdminAt: ticket.lastSeenByAdminAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      hasUnseenMessages:
        ticket.lastSeenByUserAt === null ||
        (ticket.updatedAt &&
          ticket.lastSeenByUserAt &&
          ticket.updatedAt > ticket.lastSeenByUserAt),
    }));
  }

  async getAllTicketsForAdmin(): Promise<TicketSummary[]> {
    const tickets = await this.ticketModel
      .find()
      .populate('user', 'firstName lastName email picture')
      .sort({ updatedAt: -1 })
      .select('-messages')
      .lean()
      .exec();

    return tickets.map((ticket) => ({
      _id: ticket._id,
      user: ticket.user as Partial<UserDocument> | undefined,
      guestName: ticket.guestName,
      guestEmail: ticket.guestEmail,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      lastSeenByUserAt: ticket.lastSeenByUserAt,
      lastSeenByAdminAt: ticket.lastSeenByAdminAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      hasUnseenMessages:
        ticket.lastSeenByAdminAt === null ||
        (ticket.updatedAt &&
          ticket.lastSeenByAdminAt &&
          ticket.updatedAt > ticket.lastSeenByAdminAt),
    }));
  }
}
