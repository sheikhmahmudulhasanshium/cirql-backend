// src/support/support.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * PUBLIC ENDPOINT: Creates a support ticket from the unauthenticated contact form.
   */
  @Post('public-ticket')
  @HttpCode(HttpStatus.OK)
  async createPublic(
    @Body(new ValidationPipe()) dto: CreatePublicTicketDto,
  ): Promise<{ message: string }> {
    await this.supportService.createPublicTicket(dto);
    return { message: 'Your ticket has been created successfully!' };
  }

  /**
   * AUTHENTICATED ENDPOINT: Creates a support ticket for a logged-in user.
   */
  @Post('tickets')
  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  create(
    @Body(new ValidationPipe()) createTicketDto: CreateSupportDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.createTicket(createTicketDto, user);
  }

  /**
   * AUTHENTICATED ENDPOINT: Adds a message to an existing ticket.
   */
  @Post('tickets/:id/messages')
  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  addMessage(
    @Param('id') id: string,
    @Body(new ValidationPipe()) addMessageDto: UpdateSupportDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.addMessage(id, addMessageDto, user);
  }

  /**
   * AUTHENTICATED ENDPOINT: Gets all tickets for the currently logged-in user.
   */
  @Get('tickets')
  @UseGuards(AuthGuard('jwt'))
  getTicketsForUser(@CurrentUser() user: UserDocument) {
    return this.supportService.getTicketsForUser(user._id);
  }

  /**
   * AUTHENTICATED ENDPOINT: Gets a specific ticket by ID, checking for permission.
   */
  @Get('tickets/:id')
  @UseGuards(AuthGuard('jwt'))
  getTicketById(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.supportService.getTicketById(id, user);
  }

  /**
   * ADMIN-ONLY ENDPOINT: Gets all tickets in the system for the admin dashboard.
   */
  @Get('admin/tickets')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  getAllTicketsForAdmin() {
    return this.supportService.getAllTicketsForAdmin();
  }
}
