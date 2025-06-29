// src/auth/dto/disable-2fa.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Disable2faDto {
  @ApiProperty({
    description: "The 6-digit verification code sent to the user's email.",
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits.' })
  code: string;
}
