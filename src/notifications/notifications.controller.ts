import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { MarkNotificationsReadDto } from './dto/mark-read.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's notifications" })
  getNotifications(
    @CurrentUser() user: UserDocument,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getNotificationsForUser(
      user._id.toString(),
      page,
      limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: "Get the count of the user's unread notifications" })
  getUnreadCount(@CurrentUser() user: UserDocument) {
    return this.notificationsService.getUnreadCount(user._id.toString());
  }

  @Patch('read/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all of the user's notifications as read" })
  markAllAsRead(@CurrentUser() user: UserDocument) {
    return this.notificationsService.markAllAsRead(user._id.toString());
  }

  @Patch('read/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  markBatchAsRead(
    @CurrentUser() user: UserDocument,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.notificationsService.markAllAsRead(
      user._id.toString(),
      dto.notificationIds,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  markAsRead(
    @Param('id', ParseObjectIdPipe) notificationId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.notificationsService.markAsRead(
      notificationId,
      user._id.toString(),
    );
  }
}
