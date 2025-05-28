// src/users/dto/update-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

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
  @IsString() // You might want IsUrl() here after installing class-validator
  picture?: string;

  // Add other fields that can be updated, e.g., bio, preferences, etc.
  // Do NOT include password here for general updates. Password updates
  // should typically have their own dedicated flow with current password verification.
  // Also, googleId should generally not be updatable by the user directly.
}
