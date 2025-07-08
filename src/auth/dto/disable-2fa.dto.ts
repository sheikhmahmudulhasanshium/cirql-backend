// src/auth/dto/disable-2fa.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Disable2faDto {
  @ApiProperty({
    description: "The 6-character verification code sent to the user's email.",
    example: 'A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 characters.' })
  code: string;
}
