import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, IsNotEmpty } from 'class-validator';

export class CreateMediaFromUrlDto {
  @ApiProperty({
    description: 'The public URL of the file to upload.',
    example:
      'https://raw.githubusercontent.com/sheikhmahmudulhasanshium/cirql-frontend/refs/heads/main/public/logo.png',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
