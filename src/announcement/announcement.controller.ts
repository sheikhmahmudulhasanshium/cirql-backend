// src/announcement/announcement.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnnouncementsService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { UserDocument } from 'src/users/schemas/user.schema'; // Assuming you have a UserDocument

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDocument;
}

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user._id.toString();
    return this.announcementsService.create(createAnnouncementDto, userId);
  }
  // New route for simple get without filter with auth
  @Get('simple')
  @UseGuards(AuthGuard('jwt')) // Protect this route with JWT auth
  @ApiBearerAuth()
  findAllSimpleAuth(): Promise<any> {
    return this.announcementsService.findAllSimple();
  }

  // New route for simple get without filter (no auth)
  @Get('simple/public')
  findAllSimplePublic(): Promise<any> {
    return this.announcementsService.findAllSimple();
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('visible', new DefaultValuePipe(true)) visible: boolean = true,
  ) {
    return this.announcementsService.findAll(type, page, limit, visible);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user._id.toString();
    return this.announcementsService.update(id, updateAnnouncementDto, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on successful deletion
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Inject request
    const userId = req.user._id.toString(); // Extract userId if needed
    await this.announcementsService.remove(id, userId); // Pass userId for admin check
  }
}
