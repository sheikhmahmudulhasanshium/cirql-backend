// src/contact/contact.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsNotEmpty } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: "The sender's full name.",
    example: 'Jane Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: "The sender's email address.",
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The message content.',
    example: 'I have a question about your service...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}
