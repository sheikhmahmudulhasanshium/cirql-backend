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
  ParseBoolPipe, // <-- Import ParseBoolPipe
} from '@nestjs/common';
import { AnnouncementsService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { UserDocument } from 'src/users/schemas/user.schema';

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDocument;
}

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // No changes to Post
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

  // No changes to simple gets
  @Get('simple')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findAllSimpleAuth(): Promise<any> {
    return this.announcementsService.findAllSimple();
  }

  @Get('simple/public')
  findAllSimplePublic(): Promise<any> {
    return this.announcementsService.findAllSimple();
  }

  // *** MAJOR CHANGE HERE ***
  // This single endpoint now handles both public and admin views.
  // It does NOT require auth, as public users need access.
  // The service layer handles what data is returned.
  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    // This allows the 'visible' param to be 'true', 'false', or absent (undefined)
    @Query('visible', new ParseBoolPipe({ optional: true })) visible?: boolean,
  ) {
    return this.announcementsService.findAll(type, page, limit, visible);
  }

  // No changes to findOne, Patch, or Delete
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user._id.toString();
    await this.announcementsService.remove(id, userId);
  }
}
