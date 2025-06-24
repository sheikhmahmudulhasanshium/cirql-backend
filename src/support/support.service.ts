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
import { Message } from './schemas/message.schema';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { Role } from '../common/enums/role.enum';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { CreateAppealDto } from './dto/create-appeal.dto'; // --- ADDED IMPORT ---

function isUserDocument(
  user: Types.ObjectId | UserDocument | undefined,
): user is UserDocument {
  return !!(user && typeof user === 'object' && 'roles' in user);
}

export interface TicketSummaryDto extends Omit<Ticket, 'messages'> {
  _id: Types.ObjectId;
  hasUnseenMessages: boolean;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly emailService: EmailService,
  ) {}

  async addMessage(
    ticketId: string,
    addMessageDto: UpdateSupportDto,
    user: UserDocument,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('user', 'email firstName lastName');
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException(
        'This ticket is closed and cannot be replied to.',
      );
    }

    const isOwner =
      !!ticket.user &&
      isUserDocument(ticket.user) &&
      ticket.user._id.equals(user._id);
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access this ticket.',
      );
    }

    const newMessage = new this.messageModel({
      ticketId: ticket._id,
      sender: user._id,
      content: addMessageDto.content,
      attachments: addMessageDto.attachments || [],
    });

    await newMessage.save();
    ticket.messages.push(newMessage._id as Types.ObjectId);

    if (isAdmin) {
      ticket.lastSeenByUserAt = null;
      ticket.lastSeenByAdminAt = new Date();
    } else {
      ticket.lastSeenByAdminAt = null;
      ticket.lastSeenByUserAt = new Date();
    }
    await ticket.save();

    const adminEmail = this.emailService.getAdminEmail();
    const senderName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

    if (isAdmin) {
      const recipientEmail = isUserDocument(ticket.user)
        ? ticket.user.email
        : ticket.guestEmail;
      if (recipientEmail) {
        this.logger.log(
          `Admin replied to ticket ${ticketId}. Notifying user at ${recipientEmail}`,
        );
        await this.emailService.sendTicketReplyEmail({
          to: recipientEmail,
          ticketId: ticket._id.toHexString(),
          ticketSubject: ticket.subject,
          replyContent: addMessageDto.content,
          replierName: senderName,
        });
        this.logger.log(`Sending copy of admin reply to ${adminEmail}`);
        await this.emailService.sendTicketReplyEmail({
          to: adminEmail,
          ticketId: ticket._id.toHexString(),
          ticketSubject: `[Admin Reply Sent] ${ticket.subject}`,
          replyContent: addMessageDto.content,
          replierName: senderName,
        });
      }
    } else {
      this.logger.log(
        `User replied to ticket ${ticketId}. Notifying admin at ${adminEmail}`,
      );
      await this.emailService.sendTicketReplyEmail({
        to: adminEmail,
        ticketId: ticket._id.toHexString(),
        ticketSubject: `[New User Reply] ${ticket.subject}`,
        replyContent: addMessageDto.content,
        replierName: senderName,
      });
    }
    return this.getTicketById(ticketId, user);
  }

  async markTicketAsSeen(ticketId: string, user: UserDocument): Promise<void> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);
    const isOwner = ticket.user && ticket.user.equals(user._id);
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    const now = new Date();
    if (isAdmin) {
      if (!ticket.lastSeenByAdminAt || now > ticket.lastSeenByAdminAt) {
        ticket.lastSeenByAdminAt = now;
      }
    } else if (isOwner) {
      if (!ticket.lastSeenByUserAt || now > ticket.lastSeenByUserAt) {
        ticket.lastSeenByUserAt = now;
      }
    }
    await ticket.save();
    this.logger.log(
      `Ticket ${ticketId} marked as seen by user ${user.id} (role: ${isAdmin ? 'Admin' : 'User'}).`,
    );
  }

  async closeTicket(
    ticketId: string,
    adminUser: UserDocument,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('user', 'email firstName');
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    const isAdmin =
      adminUser.roles.includes(Role.Admin) ||
      adminUser.roles.includes(Role.Owner);
    if (!isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to close tickets.',
      );
    }
    if (ticket.status === TicketStatus.CLOSED) {
      return ticket;
    }
    ticket.status = TicketStatus.CLOSED;
    await ticket.save();
    this.logger.log(
      `Ticket ${ticketId} has been closed by admin ${adminUser.id}.`,
    );
    const recipientEmail = isUserDocument(ticket.user)
      ? ticket.user.email
      : ticket.guestEmail;
    if (recipientEmail) {
      const adminName =
        `${adminUser.firstName ?? ''} ${adminUser.lastName ?? ''}`.trim();
      await this.emailService.sendTicketReplyEmail({
        to: recipientEmail,
        ticketId: ticket._id.toHexString(),
        ticketSubject: `[Closed] ${ticket.subject}`,
        replyContent: `This support ticket has been closed by our support team. If you have further questions, please create a new ticket.`,
        replierName: adminName,
      });
      this.logger.log(`Sent ticket closure notification to ${recipientEmail}.`);
    }
    return ticket;
  }

  // --- NEW METHOD ---
  async createAppealTicket(
    dto: CreateAppealDto,
    user: UserDocument,
  ): Promise<Ticket> {
    const subject = `[Ban Appeal] - From User: ${user.firstName || user.email}`;
    this.logger.log(`Creating ban appeal ticket for user ${user.id}`);

    const newTicket = new this.ticketModel({
      category: TicketCategory.OTHER, // Consider adding a 'BAN_APPEAL' to the enum
      subject: subject,
      user: user._id,
      guestName:
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Banned User',
      guestEmail: user.email,
      lastSeenByAdminAt: null, // Ensure admin has not seen it yet
      status: TicketStatus.OPEN,
    });

    const initialMessage = new this.messageModel({
      ticketId: newTicket._id,
      sender: user._id,
      content: dto.message,
    });

    const savedMessage = await initialMessage.save();
    newTicket.messages.push(savedMessage._id as Types.ObjectId);
    await newTicket.save();

    // Notify admin about the new appeal using the existing contact form email method
    if (user.email) {
      await this.emailService.sendContactFormEmail({
        name: `${user.firstName || 'Banned User'} (ID: ${user.id})`,
        fromEmail: user.email,
        message: `A new ban appeal has been submitted.\n\n---\n\n${dto.message}`,
      });
    }

    return newTicket;
  }

  async createPublicTicket(dto: CreatePublicTicketDto): Promise<Ticket> {
    this.logger.log(`Creating public ticket from guest: ${dto.email}`);
    const newTicket = new this.ticketModel({
      category: dto.category,
      subject: `[${dto.category}] - New Inquiry from ${dto.name}`,
      guestName: dto.name,
      guestEmail: dto.email,
      lastSeenByAdminAt: null,
    });
    const initialMessage = new this.messageModel({
      ticketId: newTicket._id,
      content: dto.message,
    });
    const savedMessage = await initialMessage.save();
    newTicket.messages.push(savedMessage._id as Types.ObjectId);
    await newTicket.save();
    this.logger.log(`Public ticket from ${dto.email} saved to database.`);
    try {
      await this.emailService.sendContactFormEmail({
        name: dto.name,
        fromEmail: dto.email,
        message: `A new support ticket has been created from the public contact form.\n\nCategory: ${dto.category}\n\nMessage:\n${dto.message}`,
      });
      this.logger.log(
        `Email notification sent for public ticket from ${dto.email}`,
      );
    } catch (emailError: unknown) {
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : 'An unknown error occurred during email sending.';
      this.logger.error(
        `Failed to send email for public ticket, but the ticket was saved. Email: ${dto.email}`,
        errorMessage,
      );
    }
    return newTicket;
  }

  async createTicket(
    createTicketDto: CreateSupportDto,
    user: UserDocument,
  ): Promise<Ticket> {
    const recentTicket = await this.ticketModel.findOne({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 60000) },
    });
    if (recentTicket) {
      throw new ForbiddenException(
        'You can only create one ticket per minute.',
      );
    }
    const subject = `[${createTicketDto.category}] - ${createTicketDto.subject}`;
    const newTicket = new this.ticketModel({
      ...createTicketDto,
      user: user._id,
      subject,
      lastSeenByUserAt: new Date(),
      lastSeenByAdminAt: null,
    });
    const initialMessage = new this.messageModel({
      ticketId: newTicket._id,
      sender: user._id,
      content: createTicketDto.initialMessage,
      attachments: createTicketDto.attachments || [],
    });
    const savedMessage = await initialMessage.save();
    newTicket.messages.push(savedMessage._id as Types.ObjectId);
    await newTicket.save();
    return newTicket;
  }

  async getTicketsForUser(userId: Types.ObjectId): Promise<TicketSummaryDto[]> {
    const tickets = await this.ticketModel
      .find({ user: userId })
      .sort({ updatedAt: -1 })
      .select('-messages')
      .lean()
      .exec();
    return tickets.map((ticket) => ({
      ...ticket,
      hasUnseenMessages:
        ticket.lastSeenByUserAt === null ||
        ticket.updatedAt > ticket.lastSeenByUserAt,
    }));
  }

  async getTicketById(ticketId: string, user: UserDocument): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate({
        path: 'messages',
        populate: {
          path: 'sender',
          model: 'User',
          select: 'firstName picture roles',
        },
      })
      .exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);
    if (isAdmin) {
      return ticket;
    }
    if (
      ticket.user &&
      ticket.user instanceof Types.ObjectId &&
      ticket.user.equals(user._id)
    ) {
      return ticket;
    }
    throw new ForbiddenException('You cannot view this ticket.');
  }

  async getAllTicketsForAdmin(): Promise<TicketSummaryDto[]> {
    const tickets = await this.ticketModel
      .find()
      .populate('user', 'firstName lastName email picture')
      .sort({ updatedAt: -1 })
      .select('-messages')
      .lean()
      .exec();
    return tickets.map((ticket) => ({
      ...ticket,
      hasUnseenMessages:
        ticket.lastSeenByAdminAt === null ||
        ticket.updatedAt > ticket.lastSeenByAdminAt,
    }));
  }
}
