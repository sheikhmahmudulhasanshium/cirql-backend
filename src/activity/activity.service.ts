import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  ActivityLog,
  ActivityLogDocument,
  ActivityAction,
} from './schemas/activity-log.schema';
import { AnalyticsPeriod } from './dto/admin-analytics-query.dto';
import {
  ActiveUserDto,
  AdminAnalyticsDto,
  GrowthChartDataDto,
  UserActivitySummaryDto,
} from './dto/activity-summery.dto';

interface LogPayload {
  userId: Types.ObjectId;
  action: ActivityAction;
  targetId?: Types.ObjectId | string;
  durationMs?: number;
}

interface AggregationGroupResult {
  _id: ActivityAction;
  count: number;
  totalDuration: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const getDateRange = (period: AnalyticsPeriod) => {
  const now = new Date();
  const startDate = new Date(now);
  const previousStartDate = new Date(now);

  switch (period) {
    case AnalyticsPeriod.ONE_MINUTE:
      startDate.setMinutes(now.getMinutes() - 1);
      previousStartDate.setMinutes(now.getMinutes() - 2);
      break;
    case AnalyticsPeriod.TWELVE_HOURS:
      startDate.setHours(now.getHours() - 12);
      previousStartDate.setHours(now.getHours() - 24);
      break;
    case AnalyticsPeriod.ONE_DAY:
      startDate.setDate(now.getDate() - 1);
      previousStartDate.setDate(now.getDate() - 2);
      break;
    case AnalyticsPeriod.SEVEN_DAYS:
      startDate.setDate(now.getDate() - 7);
      previousStartDate.setDate(now.getDate() - 14);
      break;
    case AnalyticsPeriod.THIRTY_DAYS:
      startDate.setDate(now.getDate() - 30);
      previousStartDate.setDate(now.getDate() - 60);
      break;
    case AnalyticsPeriod.ONE_YEAR:
      startDate.setFullYear(now.getFullYear() - 1);
      previousStartDate.setFullYear(now.getFullYear() - 2);
      break;
  }
  return { startDate, previousStartDate, endDate: now };
};

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  private throttleCache = new Map<string, number>();
  private readonly THROTTLE_PERIOD_MS = 30000;

  private userSummaryCache = new Map<
    string,
    CacheEntry<UserActivitySummaryDto>
  >();
  private adminAnalyticsCache = new Map<
    AnalyticsPeriod,
    CacheEntry<AdminAnalyticsDto>
  >();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async logEvent(payload: LogPayload): Promise<void> {
    if (payload.action === ActivityAction.USER_PROFILE_VIEW) {
      if (!payload.targetId) return;
      const cacheKey = `${payload.userId.toString()}:${payload.action}:${payload.targetId.toString()}`;
      const now = Date.now();
      if (
        this.throttleCache.has(cacheKey) &&
        now < (this.throttleCache.get(cacheKey) ?? 0)
      ) {
        return;
      }
      this.throttleCache.set(cacheKey, now + this.THROTTLE_PERIOD_MS);
    }
    try {
      await this.activityLogModel.create(payload);
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(
          `Failed to create activity log for user ${payload.userId.toString()}`,
          err.stack,
        );
      } else {
        this.logger.error(
          `Failed to create activity log with a non-error object for user ${payload.userId.toString()}`,
          err,
        );
      }
      throw new InternalServerErrorException('Could not log user activity.');
    }
  }

  async getUserActivitySummary(
    userId: string,
  ): Promise<UserActivitySummaryDto> {
    const now = Date.now();
    const cachedEntry = this.userSummaryCache.get(userId);
    if (cachedEntry && now < cachedEntry.expiresAt) {
      return cachedEntry.data;
    }
    const userObjectId = new Types.ObjectId(userId);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const results =
      await this.activityLogModel.aggregate<AggregationGroupResult>([
        { $match: { userId: userObjectId, createdAt: { $gte: oneWeekAgo } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            totalDuration: { $sum: '$durationMs' },
          },
        },
      ]);
    const summary: UserActivitySummaryDto = {
      logins: 0,
      profileViews: 0,
      messagesSent: 0,
      screenTimeMinutes: 0,
    };
    for (const result of results) {
      switch (result._id) {
        case ActivityAction.USER_LOGIN:
          summary.logins = result.count;
          break;
        case ActivityAction.USER_PROFILE_VIEW:
          summary.profileViews = result.count;
          break;
        case ActivityAction.TICKET_MESSAGE_SENT:
          summary.messagesSent = result.count;
          break;
        case ActivityAction.USER_HEARTBEAT:
          summary.screenTimeMinutes = Math.round(
            (result.totalDuration || 0) / 60000,
          );
          break;
      }
    }
    this.userSummaryCache.set(userId, {
      data: summary,
      expiresAt: now + this.CACHE_TTL_MS,
    });
    return summary;
  }

  async getAdminAnalytics(
    period: AnalyticsPeriod = AnalyticsPeriod.SEVEN_DAYS,
  ): Promise<AdminAnalyticsDto> {
    const now = Date.now();
    const cachedEntry = this.adminAnalyticsCache.get(period);
    if (cachedEntry && now < cachedEntry.expiresAt) {
      return cachedEntry.data;
    }

    const { startDate, previousStartDate, endDate } = getDateRange(period);

    const [
      totalUsers,
      bannedUsers,
      newThisPeriod,
      newLastPeriod,
      mostActiveUsers,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ accountStatus: 'banned' }).exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: startDate, $lt: endDate } })
        .exec(),
      this.userModel
        .countDocuments({
          createdAt: { $gte: previousStartDate, $lt: startDate },
        })
        .exec(),
      this.activityLogModel.aggregate<ActiveUserDto>([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            picture: '$userDetails.picture',
            activityCount: '$count',
          },
        },
      ]),
    ]);

    const growthPercentage =
      newLastPeriod > 0
        ? ((newThisPeriod - newLastPeriod) / newLastPeriod) * 100
        : newThisPeriod > 0
          ? 100
          : 0;

    const analyticsData = {
      totalUsers,
      bannedUsers,
      weeklyGrowth: {
        newUsers: newThisPeriod,
        percentageChange: parseFloat(growthPercentage.toFixed(2)),
      },
      mostActiveUsers,
    };

    this.adminAnalyticsCache.set(period, {
      data: analyticsData,
      expiresAt: now + this.CACHE_TTL_MS,
    });
    return analyticsData;
  }

  async getGrowthChartData(
    period: AnalyticsPeriod = AnalyticsPeriod.SEVEN_DAYS,
  ): Promise<GrowthChartDataDto[]> {
    const { startDate, endDate } = getDateRange(period);
    const results = await this.userModel.aggregate<GrowthChartDataDto>([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: '$count',
        },
      },
    ]);

    return results;
  }

  // --- NEW METHOD FOR USER-SPECIFIC CHART DATA ---
  async getUserActivityChartData(
    userId: string,
    period: AnalyticsPeriod = AnalyticsPeriod.SEVEN_DAYS,
  ): Promise<GrowthChartDataDto[]> {
    const { startDate, endDate } = getDateRange(period);
    const userObjectId = new Types.ObjectId(userId);

    const results = await this.activityLogModel.aggregate<GrowthChartDataDto>([
      {
        $match: {
          userId: userObjectId,
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: '$count',
        },
      },
    ]);

    return results;
  }
}
