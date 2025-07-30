//src/support/dto/update-support.dto.ts

import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  IsMongoId, // --- MODIFICATION: Import IsMongoId ---
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupportDto {
  @ApiPropertyOptional({ description: 'The content of the reply message.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  // --- MODIFICATION: Changed from IsUrl to IsMongoId ---
  @ApiPropertyOptional({
    type: [String],
    description: 'An array of Media IDs to attach to the reply.',
    example: ['663a4b9b9a6b1d4a9c8b4d8f'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
    message: 'Each attachment must be a valid Media ID.',
  })
  attachments?: string[];
}
