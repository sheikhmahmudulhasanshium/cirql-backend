import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  MaxLength,
  MinLength,
  IsUrl,
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

  // --- THIS IS THE FIX ---
  // The initial message is now optional.
  @ApiPropertyOptional({ description: 'The initial message from the user.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  initialMessage?: string;
  // --- END OF FIX ---

  @ApiPropertyOptional({
    type: [String],
    description: 'An array of URLs to attachments.',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachments?: string[];
}
