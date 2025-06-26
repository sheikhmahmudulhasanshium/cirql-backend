import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: "User's email address",
    example: 'new.email@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @ApiPropertyOptional({
    description: "User's first name",
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name",
    example: 'Doette',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({
    description: "URL to user's profile picture",
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Picture must be a valid URL.' })
  picture?: string;
}
