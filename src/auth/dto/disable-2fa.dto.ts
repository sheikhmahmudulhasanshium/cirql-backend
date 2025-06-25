import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class Disable2faDto {
  @ApiProperty({
    description: "The user's current password to confirm 2FA deactivation.",
    example: 'mySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}
