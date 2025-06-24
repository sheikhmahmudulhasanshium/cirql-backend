// src/users/dto/ban-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class BanUserDto {
  @ApiProperty({
    description:
      'The reason for banning the user. This will be emailed to them.',
    example: 'Violation of community guidelines regarding spam.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Ban reason must be at least 10 characters long.' })
  reason: string;
}
