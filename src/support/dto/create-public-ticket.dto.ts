// src/support/dto/create-public-ticket.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { TicketCategory } from '../schemas/ticket.schema';

export class CreatePublicTicketDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: TicketCategory, example: TicketCategory.FEEDBACK })
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @ApiProperty({ example: 'Great website!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}
