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
import { UserDocument } from '../users/schemas/user.schema';
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
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    const isOwner =
      ticket.user && ticket.user._id.toString() === user._id.toString();
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

    if (isAdmin && ticket.user?._id) {
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
      await this.emailService.sendTicketReplyEmail({
        to: this.emailService.getAdminEmail(),
        ticketId: ticket._id.toString(),
        ticketSubject: `[New User Reply] ${ticket.subject}`,
        replyContent: addMessageDto.content,
        replierName:
          `${ticket.user.firstName || 'User'} ${ticket.user.lastName || ''}`.trim(),
      });
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

    if (ticket.status === TicketStatus.CLOSED)
      return ticket as unknown as TicketDocument;

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
    return ticket as unknown as TicketDocument;
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

    const isOwner =
      ticket.user &&
      ticket.user._id.toString() === userPerformingAction._id.toString();

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You cannot view this ticket.');
    }
    return ticket as unknown as TicketDocument;
  }

  async markTicketAsSeen(ticketId: string, user: UserDocument): Promise<void> {
    const ticketFromDb = await this.ticketModel.findById(ticketId);
    if (!ticketFromDb) {
      throw new NotFoundException('Ticket not found.');
    }
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);

    const isOwner =
      ticketFromDb.user && ticketFromDb.user.toString() === user._id.toString();

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
    if (user.email) {
      await this.emailService.sendContactFormEmail({
        name: `${user.firstName || 'Banned User'} (ID: ${user.id})`,
        fromEmail: user.email,
        message: `A new ban appeal has been submitted.\n\n---\n\n${dto.message}`,
      });
    }
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
    try {
      await this.emailService.sendContactFormEmail({
        name: dto.name,
        fromEmail: dto.email,
        message: `A new support ticket has been created.\n\nCategory: ${dto.category}\n\nMessage:\n${dto.message}`,
      });
    } catch (emailError) {
      this.logger.error(
        `Failed to send email for public ticket, but ticket was saved. Email: ${dto.email}`,
        emailError,
      );
    }
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
      user: ticket.user,
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
      user: ticket.user,
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
