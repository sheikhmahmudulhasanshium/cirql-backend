// src/support/dto/create-support.dto.ts
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

export class CreateSupportDto {
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  initialMessage: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachments?: string[];
}
