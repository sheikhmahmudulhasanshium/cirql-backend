import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LogPageViewDto {
  @ApiProperty({
    description: 'The URL path the user visited.',
    example: '/settings',
    maxLength: 256,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256) // To prevent overly long URLs
  url: string;
}
