// src/social/dto/update-group.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class UpdateGroupDto {
  @ApiPropertyOptional({
    description: 'The new name of the group.',
    example: 'Advanced NestJS Study Group',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'The new description of the group.',
    example: 'We now focus on microservices with NestJS.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // --- NEW PROPERTIES ---
  @ApiPropertyOptional({ description: 'New URL of the group icon.' })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'New Key/ID of the blob for the icon.' })
  @IsOptional()
  @IsString()
  iconKey?: string;
  // --- END NEW PROPERTIES ---
}
