import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTO for the user-facing summary
export class UserActivitySummaryDto {
  logins: number;
  profileViews: number;
  messagesSent: number;
  screenTimeMinutes: number;
}

// DTO for the heartbeat endpoint
export class HeartbeatDto {
  @ApiProperty({
    description: 'Duration of activity in milliseconds.',
    example: 60000,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1000)
  durationMs: number;
}

// DTOs for the admin analytics endpoint
export class WeeklyGrowthDto {
  newUsers: number;
  percentageChange: number;
}

export class ActiveUserDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  activityCount: number;
}

export class AdminAnalyticsDto {
  totalUsers: number;
  bannedUsers: number;
  weeklyGrowth: WeeklyGrowthDto;
  mostActiveUsers: ActiveUserDto[];
}

// NOTE: This DTO was added for the admin chart and is being reused here.
// No changes needed if it already exists.
export class GrowthChartDataDto {
  @ApiProperty({ example: '2023-10-28' })
  date: string;

  @ApiProperty({ example: 15 })
  count: number;
}
