// src/social/dto/create-group.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'The name of the group.',
    example: 'Awesome Study Group',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'A short description of the group.',
    example: 'We focus on advanced NestJS topics.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // --- NEW PROPERTIES ---
  @ApiPropertyOptional({
    description: 'URL of the group icon from the uploader.',
  })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Key/ID of the blob for the group icon.',
  })
  @IsOptional()
  @IsString()
  iconKey?: string;
  // --- END NEW PROPERTIES ---
}
