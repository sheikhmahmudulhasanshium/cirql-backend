// src/support/dto/create-appeal.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAppealDto {
  @ApiProperty({
    description: "The user's message explaining their appeal.",
    example:
      'I understand why I was banned and I would like to request a second chance...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20, {
    message: 'Appeal message must be at least 20 characters long.',
  })
  message: string;
}
