import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Length } from 'class-validator';

export class Login2faDto {
  @ApiProperty({
    description: 'The user ID for whom the 2FA code is being verified.',
    example: '60f8f8f8f8f8f8f8f8f8f8f8',
  })
  @IsNotEmpty()
  @IsMongoId({ message: 'User ID must be a valid MongoDB ObjectId.' })
  userId: string;

  @ApiProperty({
    description: 'The 6-digit code from the email.',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be 6 digits.' })
  code: string;
}
