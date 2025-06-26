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
  Patch,
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
import { BannedUserGuard } from '../common/guards/banned-user.guard';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('public-ticket')
  @HttpCode(HttpStatus.OK)
  async createPublic(
    @Body(new ValidationPipe()) dto: CreatePublicTicketDto,
  ): Promise<{ message: string }> {
    await this.supportService.createPublicTicket(dto);
    return { message: 'Your ticket has been created successfully!' };
  }

  @Post('appeal-ticket')
  @UseGuards(AuthGuard('jwt'), BannedUserGuard)
  @HttpCode(HttpStatus.CREATED)
  createAppeal(
    @Body(new ValidationPipe()) dto: CreateAppealDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.createAppealTicket(dto, user);
  }

  @Post('tickets')
  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  create(
    @Body(new ValidationPipe()) createTicketDto: CreateSupportDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.createTicket(createTicketDto, user);
  }

  @Post('tickets/:id/messages')
  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  addMessage(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body(new ValidationPipe()) addMessageDto: UpdateSupportDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.addMessage(id, addMessageDto, user);
  }

  @Post('tickets/:id/seen')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  markAsSeen(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.markTicketAsSeen(id, user);
  }

  @Get('tickets')
  @UseGuards(AuthGuard('jwt'))
  getTicketsForUser(@CurrentUser() user: UserDocument) {
    // --- THIS IS THE FIX ---
    // Pass the ObjectId directly, not a string version of it.
    return this.supportService.getTicketsForUser(user._id);
    // --- END OF FIX ---
  }

  @Get('tickets/:id')
  @UseGuards(AuthGuard('jwt'))
  getTicketById(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.getTicketById(id, user);
  }

  @Get('admin/tickets')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  getAllTicketsForAdmin() {
    return this.supportService.getAllTicketsForAdmin();
  }

  @Patch('tickets/:id/close')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @HttpCode(HttpStatus.OK)
  closeTicket(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.supportService.closeTicket(id, user);
  }
}
