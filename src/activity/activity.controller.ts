import { Controller, Get, Post, UseGuards, Body, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserDocument } from '../users/schemas/user.schema';
import { ActivityService } from './activity.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ActivityAction } from './schemas/activity-log.schema';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GrowthChartDataDto, HeartbeatDto } from './dto/activity-summery.dto';

// --- FIX: This interface is no longer needed because @CurrentUser is used ---
// interface AuthenticatedRequest {
//   user: UserDocument;
// }

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('me')
  @ApiOperation({
    summary: "Get the authenticated user's weekly activity summary",
  })
  getMyActivitySummary(@CurrentUser() user: UserDocument) {
    return this.activityService.getUserActivitySummary(user._id.toString());
  }

  @Get('me/chart')
  @ApiOperation({
    summary: "Get the authenticated user's activity data for charting",
  })
  @ApiResponse({ status: 200, type: [GrowthChartDataDto] })
  getMyActivityChartData(
    @CurrentUser() user: UserDocument,
    @Query() query: AdminAnalyticsQueryDto,
  ) {
    return this.activityService.getUserActivityChartData(
      user._id.toString(),
      query.period,
    );
  }

  @Post('heartbeat')
  @ApiOperation({ summary: 'Log user screen time activity' })
  async logHeartbeat(
    @CurrentUser() user: UserDocument,
    @Body() heartbeatDto: HeartbeatDto,
  ) {
    await this.activityService.logEvent({
      userId: user._id,
      action: ActivityAction.USER_HEARTBEAT,
      durationMs: heartbeatDto.durationMs,
    });
    return { success: true, message: 'Activity acknowledged.' };
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({
    summary: 'Get system-wide analytics for the admin dashboard',
  })
  getAdminAnalytics(@Query() query: AdminAnalyticsQueryDto) {
    return this.activityService.getAdminAnalytics(query.period);
  }

  @Get('admin/growth-chart')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: 'Get data for the user growth chart' })
  @ApiResponse({ status: 200, type: [GrowthChartDataDto] })
  getGrowthChartData(@Query() query: AdminAnalyticsQueryDto) {
    return this.activityService.getGrowthChartData(query.period);
  }
}
