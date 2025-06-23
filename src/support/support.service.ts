// src/support/support.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket } from './schemas/ticket.schema';
import { Message } from './schemas/message.schema';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { Role } from '../common/enums/role.enum';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creates a ticket from the public form, saves it, AND sends an email notification.
   */
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
    } catch (emailError) {
      this.logger.error(
        `Failed to send email for public ticket, but the ticket was saved. Email: ${dto.email}`,
        emailError,
      );
    }

    return newTicket;
  }

  /**
   * Creates a new support ticket for an authenticated, logged-in user.
   */
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

  /**
   * Adds a new message to an existing ticket conversation.
   */
  async addMessage(
    ticketId: string,
    addMessageDto: UpdateSupportDto,
    user: UserDocument,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found.');

    if (!(ticket.user instanceof Types.ObjectId)) {
      throw new InternalServerErrorException('Invalid ticket owner data.');
    }
    const isOwner = ticket.user.equals(user._id);

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

    const savedNewMessage = await newMessage.save();
    ticket.messages.push(savedNewMessage._id as Types.ObjectId);

    await ticket.save();

    return this.getTicketById(ticketId, user);
  }

  /**
   * Retrieves all tickets for a specific authenticated user.
   */
  async getTicketsForUser(userId: Types.ObjectId): Promise<Ticket[]> {
    return this.ticketModel
      .find({ user: userId })
      .sort({ updatedAt: -1 })
      .select('-messages')
      .exec();
  }

  /**
   * Retrieves a single ticket by its ID, ensuring the requester has permission.
   */
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

    if (!ticket) throw new NotFoundException('Ticket not found.');

    if (!(ticket.user instanceof Types.ObjectId)) {
      // Allow admins to view guest tickets, which have no user object.
      const isAdmin =
        user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);
      if (!isAdmin) {
        throw new ForbiddenException('You cannot view this ticket.');
      }
      return ticket;
    }

    const isOwner = ticket.user.equals(user._id);
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot view this ticket.');
    }
    return ticket;
  }

  /**
   * Retrieves all tickets for the admin dashboard, populating user details.
   */
  async getAllTicketsForAdmin(): Promise<Ticket[]> {
    return this.ticketModel
      .find()
      .populate('user', 'firstName lastName email picture')
      .sort({ updatedAt: -1 })
      .select('-messages')
      .exec();
  }
}
