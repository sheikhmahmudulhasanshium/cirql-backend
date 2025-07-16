import {
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupportDto {
  @ApiPropertyOptional({ description: 'The content of the reply message.' })
  @IsOptional() // This allows the field to be missing entirely
  @IsString()
  @MinLength(1) // This ensures if it IS provided, it's not just whitespace
  content?: string; // The '?' makes it optional in TypeScript

  @ApiPropertyOptional({
    type: [String],
    description: 'An array of URLs to attachments for the reply.',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachments?: string[];
}
