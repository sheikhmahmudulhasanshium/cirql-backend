import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Defines the data transfer object for creating a user profile.
 * All properties are optional, allowing for partial profile creation.
 */
export class CreateProfileDto {
  @ApiPropertyOptional({
    description: "A short, professional headline for the user's profile.",
    example: 'Senior Software Engineer at Cirql',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  @ApiPropertyOptional({
    description: 'A brief biography or summary about the user.',
    example:
      'Passionate about building scalable and user-friendly web applications.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: "The user's physical location.",
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: "A URL to the user's personal or professional website.",
    example: 'https://johndoe.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL.' })
  website?: string;
}
