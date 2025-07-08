// src/auth/dto/login-2fa.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Login2faDto {
  @ApiProperty({
    description: 'The 6-character code from the email.',
    example: 'A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be 6 characters.' })
  code: string;
}
