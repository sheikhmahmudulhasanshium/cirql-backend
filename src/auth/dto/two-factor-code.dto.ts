import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({
    description:
      'The 6-digit code from the authenticator app or an 8-character backup code.',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  code: string;
}
