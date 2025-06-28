// src/auth/dto/login-2fa.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Login2faDto {
  @ApiProperty({
    description: 'The 6-digit code from the email.',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be 6 digits.' })
  code: string;
}
