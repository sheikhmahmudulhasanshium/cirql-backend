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
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { AnnouncementsService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserDocument } from 'src/users/schemas/user.schema';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = user._id.toString();
    return this.announcementsService.create(createAnnouncementDto, userId);
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find all announcements',
    description:
      'Public users can only see visible announcements. Admins can use the "visible" query parameter to see hidden ones.',
  })
  findAll(
    @CurrentUser() user: UserDocument | undefined,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('visible', new ParseBoolPipe({ optional: true })) visible?: boolean,
  ) {
    let finalVisible = visible;
    const isAdmin =
      user &&
      (user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner));

    if (!isAdmin) {
      finalVisible = true;
    }

    return this.announcementsService.findAll(type, page, limit, finalVisible);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = user._id.toString();
    return this.announcementsService.update(id, updateAnnouncementDto, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    await this.announcementsService.remove(id, userId);
  }
}
