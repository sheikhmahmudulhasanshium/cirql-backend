import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, SortOrder } from 'mongoose';
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
import { SendMailOptions } from 'nodemailer';
import { EditMessageDto } from './dto/edit-message.dto';
import { AdminTicketsQueryDto } from './dto/admin-tickets-query.dto';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type LeanPopulatedUser = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  picture?: string;
};

export interface TicketSummary {
  _id: Types.ObjectId;
  user?: LeanPopulatedUser | null;
  guestName?: string;
  guestEmail?: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  isLocked: boolean;
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
      .select('_id email firstName')
      .lean()
      .exec();

    const notificationPromises = adminUsers.map((admin) =>
      this.notificationsService.createNotification({
        userId: admin._id,
        title: `New Ticket: ${ticket.subject}`,
        message: `A new support ticket has been submitted by ${submittedBy}.`,
        type: NotificationType.TICKET_ADMIN_ALERT,
        linkUrl: `/contacts/${ticket._id.toString()}`,
      }),
    );
    await Promise.all(notificationPromises);

    const ticketUrl = `${this.emailService.getFrontendUrl()}/contacts/${ticket._id.toString()}`;
    const emailSubject = `[New Ticket] ${ticket.subject}`;

    const emailTextBody = `
      New Support Ticket Alert
      A new support ticket requires your attention.
      Submitted by: ${submittedBy}
      Preview:
      "${initialMessageContent.substring(0, 150)}..."
      You can view the full ticket and reply by visiting:
      ${ticketUrl}
    `;

    const emailHtmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #1A1A2E;">New Support Ticket Alert</h2>
        <p>A new support ticket requires your attention.</p>
        <p><strong>Submitted by:</strong> ${submittedBy}</p>
        <hr style="border:none; border-top:1px solid #eee">
        <p><strong>Preview:</strong></p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 15px; margin: 0; font-style: italic;">
          ${initialMessageContent.substring(0, 150).replace(/\n/g, '<br>')}...
        </blockquote>
        <hr style="border:none; border-top:1px solid #eee">
        <p>You can view the full ticket and reply by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${ticketUrl}" style="background-color: #42F2A1; color: #1A1A2E; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket in Admin Panel</a>
        </p>
      </div>
    `;

    for (const admin of adminUsers) {
      if (!admin.email) {
        this.logger.warn(
          `Admin user ${admin._id.toString()} has no email, skipping notification.`,
        );
        continue;
      }

      const fromAddress = this.emailService.getAdminEmail();
      const fromDomain = fromAddress.split('@')[1] || 'localhost';

      const mailOptions: SendMailOptions = {
        from: `"CiRQL Admin Notifier" <${fromAddress}>`,
        to: admin.email,
        subject: emailSubject,
        html: emailHtmlBody,
        text: emailTextBody,
        headers: {
          'List-Unsubscribe': `<${this.emailService.getFrontendUrl()}/profile/settings>`,
          'Message-ID': `<${ticket._id.toString()}.${Date.now()}@${fromDomain}>`,
        },
      };

      try {
        await this.emailService.sendMail(mailOptions);
      } catch (error) {
        this.logger.error(
          `Failed to send new ticket notification email to admin: ${admin.email}`,
          error,
        );
      }

      await sleep(500);
    }
  }

  async addMessage(
    ticketId: string,
    addMessageDto: UpdateSupportDto,
    user: UserDocument,
  ): Promise<TicketDocument> {
    // --- THIS IS THE FIX ---
    // Ensure that either content or attachments are provided.
    if (
      (!addMessageDto.content || addMessageDto.content.trim() === '') &&
      (!addMessageDto.attachments || addMessageDto.attachments.length === 0)
    ) {
      throw new BadRequestException(
        'A message must have content or at least one attachment.',
      );
    }
    // --- END OF FIX ---

    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate<{ user: UserDocument }>('user', 'email firstName lastName')
      .exec();

    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (ticket.isLocked) {
      throw new ForbiddenException(
        'This ticket is locked and cannot be replied to.',
      );
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException(
        'This ticket is closed and cannot be replied to.',
      );
    }

    const ticketOwnerId = ticket.user?._id;
    const isOwner =
      ticket.user &&
      ticketOwnerId &&
      user._id.toString() === ticketOwnerId.toString();

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
      // --- THIS IS THE FIX ---
      // Provide a default empty string for content if it's not present
      content: addMessageDto.content || '',
      // --- END OF FIX ---
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

    // --- THIS IS THE FIX ---
    // Use a clearer message content for notifications
    const notificationContent =
      addMessageDto.content ||
      `[${addMessageDto.attachments?.length || 0} attachment(s)]`;
    // --- END OF FIX ---

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
        // --- THIS IS THE FIX ---
        replyContent: notificationContent,
        // --- END OF FIX ---
        replierName: `${user.firstName} ${user.lastName}`,
      });
    } else if (isOwner && ticket.user) {
      const populatedUser = ticket.user;
      await this.notifyAdminsOfNewTicket(
        ticket,
        // --- THIS IS THE FIX ---
        notificationContent,
        // --- END OF FIX ---
        `${populatedUser.firstName} ${populatedUser.lastName}`,
      );
    }

    return this.getTicketById(ticketId, user);
  }

  async editMessage(
    messageId: string,
    editMessageDto: EditMessageDto,
    user: UserDocument,
  ): Promise<ActualMessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.sender.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    const ticket = await this.ticketModel.findById(message.ticketId).exec();
    if (!ticket) {
      throw new NotFoundException(
        'The ticket associated with this message could not be found.',
      );
    }
    if (ticket.isLocked || ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException(
        'Cannot edit messages in a locked or closed ticket.',
      );
    }

    message.content = editMessageDto.content;
    message.editedAt = new Date();
    return message.save();
  }

  async closeTicket(
    ticketId: string,
    adminUser: UserDocument,
  ): Promise<TicketDocument> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate<{ user: UserDocument }>('user', 'email firstName')
      .exec();

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

  async lockTicket(ticketId: string): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId).exec();
    if (!ticket) throw new NotFoundException('Ticket not found.');
    ticket.isLocked = true;
    return ticket.save();
  }

  async unlockTicket(ticketId: string): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId).exec();
    if (!ticket) throw new NotFoundException('Ticket not found.');
    ticket.isLocked = false;
    return ticket.save();
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

    const ticketOwnerId = ticket.user?._id;
    const isOwner =
      ticket.user &&
      ticketOwnerId &&
      userPerformingAction._id.toString() === ticketOwnerId.toString();

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You cannot view this ticket.');
    }
    return ticket;
  }

  async markTicketAsSeen(ticketId: string, user: UserDocument): Promise<void> {
    const ticketFromDb = await this.ticketModel.findById(ticketId).exec();
    if (!ticketFromDb) {
      throw new NotFoundException('Ticket not found.');
    }
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);

    let isOwner = false;
    if (ticketFromDb.user) {
      const userIdToCompare =
        ticketFromDb.user instanceof Types.ObjectId
          ? ticketFromDb.user
          : ticketFromDb.user._id;
      isOwner = user._id.toString() === userIdToCompare.toString();
    }

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    if (isAdmin) {
      await this.ticketModel
        .updateOne(
          { _id: new Types.ObjectId(ticketId) },
          { lastSeenByAdminAt: new Date() },
        )
        .exec();
    } else if (isOwner) {
      await this.ticketModel
        .updateOne(
          { _id: new Types.ObjectId(ticketId) },
          { lastSeenByUserAt: new Date() },
        )
        .exec();
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
    // --- THIS IS THE FIX ---
    // Ensure that either a message or attachments are provided.
    if (
      (!createTicketDto.initialMessage ||
        createTicketDto.initialMessage.trim() === '') &&
      (!createTicketDto.attachments || createTicketDto.attachments.length === 0)
    ) {
      throw new BadRequestException(
        'A new ticket must have an initial message or at least one attachment.',
      );
    }
    // --- END OF FIX ---

    const recentTicket = await this.ticketModel
      .findOne({
        user: user._id,
        createdAt: { $gte: new Date(Date.now() - 60000) },
      })
      .exec();
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

    const initialMessageContent =
      createTicketDto.initialMessage ||
      `[${createTicketDto.attachments?.length || 0} attachment(s)]`;

    const initialMessage = await this.messageModel.create({
      ticketId: newTicket._id,
      sender: user._id,
      content: createTicketDto.initialMessage || '',
      attachments: createTicketDto.attachments || [],
    });

    newTicket.messages.push(initialMessage._id);
    await newTicket.save();

    await this.notifyAdminsOfNewTicket(
      newTicket,
      initialMessageContent,
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
      user: ticket.user as unknown as LeanPopulatedUser,
      guestName: ticket.guestName,
      guestEmail: ticket.guestEmail,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      isLocked: ticket.isLocked,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      hasUnseenMessages:
        ticket.lastSeenByUserAt === null ||
        (ticket.updatedAt &&
          ticket.lastSeenByUserAt &&
          ticket.updatedAt > ticket.lastSeenByUserAt),
    }));
  }

  async getAllTicketsForAdmin(
    query: AdminTicketsQueryDto,
  ): Promise<TicketSummary[]> {
    const filter: FilterQuery<TicketDocument> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.isLocked !== undefined) {
      filter.isLocked = query.isLocked;
    }

    const [field, order] = (query.sortBy || 'updatedAt:desc').split(':');
    const sortOption: { [key: string]: SortOrder } = {
      [field]: order === 'desc' ? -1 : 1,
    };

    const tickets = await this.ticketModel
      .find(filter)
      .sort(sortOption)
      .populate('user', '_id firstName lastName email picture')
      .select('-messages')
      .lean()
      .exec();

    return tickets.map((ticket) => ({
      _id: ticket._id,
      user: ticket.user as unknown as LeanPopulatedUser,
      guestName: ticket.guestName,
      guestEmail: ticket.guestEmail,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      isLocked: ticket.isLocked,
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
