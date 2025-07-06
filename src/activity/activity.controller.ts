import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserDocument } from '../users/schemas/user.schema';
import { ActivityService, NavigationStats } from './activity.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ActivityAction } from './schemas/activity-log.schema';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GrowthChartDataDto, HeartbeatDto } from './dto/activity-summery.dto';
import { LogPageViewDto } from './dto/log-page-view.dto';
// --- START OF FIX: Import the new DTO class ---
import { NavigationStatsDto } from './dto/navigation-stats.dto';
// --- END OF FIX ---

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('page-view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log a user page view event' })
  async logPageView(
    @CurrentUser() user: UserDocument,
    @Body() logPageViewDto: LogPageViewDto,
  ) {
    if (
      logPageViewDto.url.startsWith('/_next') ||
      logPageViewDto.url.startsWith('/api')
    ) {
      return { success: true, message: 'Ignored internal route.' };
    }

    await this.activityService.logEvent({
      userId: user._id,
      action: ActivityAction.PAGE_VIEW,
      details: { url: logPageViewDto.url },
    });
    return { success: true, message: 'Page view acknowledged.' };
  }

  @Get('me/navigation-stats')
  @ApiOperation({
    summary: "Get the user's navigation stats (last visited and most visited)",
  })
  // --- START OF FIX: Use the DTO class instead of the interface ---
  @ApiResponse({ status: 200, type: NavigationStatsDto })
  // --- END OF FIX ---
  getMyNavigationStats(
    @CurrentUser() user: UserDocument,
  ): Promise<NavigationStats> {
    return this.activityService.getNavigationStats(user._id.toString());
  }

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
