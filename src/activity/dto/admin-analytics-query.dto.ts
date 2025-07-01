import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum AnalyticsPeriod {
  // --- NEW: Add a test period ---
  ONE_MINUTE = '1m',
  TWELVE_HOURS = '12h',
  ONE_DAY = '1d',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  ONE_YEAR = '365d',
}

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'The time period for the analytics data.',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.SEVEN_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.SEVEN_DAYS;
}
