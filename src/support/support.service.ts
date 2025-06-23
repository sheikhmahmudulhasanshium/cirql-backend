// src/support/support.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument } from './schemas/ticket.schema';
import { Message } from './schemas/message.schema';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { Role } from '../common/enums/role.enum';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';

// --- THE FINAL FIX: Ensure the type guard ALWAYS returns a boolean ---
function isUserDocument(
  user: Types.ObjectId | UserDocument | undefined,
): user is UserDocument {
  // The double negation (!!) coerces the result to a strict boolean.
  return !!(user && typeof user === 'object' && 'roles' in user);
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
    await ticket.save();

    const adminEmail = this.emailService.getAdminEmail();
    const senderName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

    if (isAdmin) {
      const recipientEmail =
        ticket.user && isUserDocument(ticket.user)
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

  async createPublicTicket(dto: CreatePublicTicketDto): Promise<Ticket> {
    this.logger.log(`Creating public ticket from guest: ${dto.email}`);
    const newTicket = new this.ticketModel({
      category: dto.category,
      subject: `[${dto.category}] - New Inquiry from ${dto.name}`,
      guestName: dto.name,
      guestEmail: dto.email,
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

  async getTicketsForUser(userId: Types.ObjectId): Promise<Ticket[]> {
    return this.ticketModel
      .find({ user: userId })
      .sort({ updatedAt: -1 })
      .select('-messages')
      .exec();
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

  async getAllTicketsForAdmin(): Promise<Ticket[]> {
    return this.ticketModel
      .find()
      .populate('user', 'firstName lastName email picture')
      .sort({ updatedAt: -1 })
      .select('-messages')
      .exec();
  }
}
