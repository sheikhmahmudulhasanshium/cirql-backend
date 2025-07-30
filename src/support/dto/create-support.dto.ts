//src/support/dto/create-support.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  MaxLength,
  MinLength,
  IsMongoId, // --- MODIFICATION: Import IsMongoId ---
} from 'class-validator';
import { TicketCategory } from '../schemas/ticket.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportDto {
  @ApiProperty({
    enum: TicketCategory,
    description: 'The category of the support ticket.',
  })
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @ApiProperty({ description: 'The subject line of the ticket.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  subject: string;

  @ApiPropertyOptional({ description: 'The initial message from the user.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  initialMessage?: string;

  // --- MODIFICATION: Changed from IsUrl to IsMongoId ---
  @ApiPropertyOptional({
    type: [String],
    description: 'An array of Media IDs to attach to the message.',
    example: ['663a4b9b9a6b1d4a9c8b4d8e'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
    message: 'Each attachment must be a valid Media ID.',
  })
  attachments?: string[];
}
