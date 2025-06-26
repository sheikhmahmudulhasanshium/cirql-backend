import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '../schemas/notification.schema';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  // This allows the value to be either a string or a Mongoose ObjectId,
  // which resolves the type conflict in the auth service.
  @ApiProperty({ description: 'The ID of the user to notify.', type: String })
  @IsNotEmpty()
  userId: string | Types.ObjectId;

  @ApiProperty({ description: 'The title of the notification.' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'The message body of the notification.' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    enum: NotificationType,
    description: 'The type of notification.',
  })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ required: false, description: 'Optional URL to link to.' })
  @IsOptional()
  @IsString()
  linkUrl?: string;
}
