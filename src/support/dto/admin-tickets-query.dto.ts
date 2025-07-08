// src/support/dto/admin-tickets-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { TicketStatus } from '../schemas/ticket.schema';

// We define valid sort options to prevent arbitrary field sorting.
export enum AdminTicketSortOption {
  UPDATED_AT_DESC = 'updatedAt:desc',
  UPDATED_AT_ASC = 'updatedAt:asc',
  SUBJECT_ASC = 'subject:asc',
  SUBJECT_DESC = 'subject:desc',
}

export class AdminTicketsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter tickets by their status.',
    enum: TicketStatus,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description:
      'Filter for tickets that are locked (true) or not locked (false).',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true) // Handles query param string "true"
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: 'Sort tickets by a specific field and order.',
    enum: AdminTicketSortOption,
    default: AdminTicketSortOption.UPDATED_AT_DESC,
  })
  @IsOptional()
  @IsString()
  @IsEnum(AdminTicketSortOption)
  sortBy?: AdminTicketSortOption = AdminTicketSortOption.UPDATED_AT_DESC;
}
