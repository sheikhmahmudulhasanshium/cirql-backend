import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { AnnouncementType } from '../entities/announcement.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Title of the announcement' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Content of the announcement' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ enum: AnnouncementType, description: 'Type of announcement' })
  @IsNotEmpty()
  @IsEnum(AnnouncementType)
  type: AnnouncementType;

  @ApiProperty({ required: false, description: 'Visibility status' })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiProperty({
    required: false,
    description:
      'Expiration date (ISO format or null for no expiration, optional field)',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expirationDate?: string | null;

  @ApiProperty({ required: false, description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false, description: 'Link URL' })
  @IsOptional()
  @IsString()
  linkUrl?: string;
}
