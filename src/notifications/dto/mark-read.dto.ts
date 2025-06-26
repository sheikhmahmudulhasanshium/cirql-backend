import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId } from 'class-validator';

export class MarkNotificationsReadDto {
  @ApiProperty({
    description: 'An array of notification IDs to mark as read.',
    type: [String],
    example: ['60f8f8f8f8f8f8f8f8f8f8f8', '60f8f8f8f8f8f8f8f8f8f8f9'],
  })
  @IsArray()
  @IsMongoId({
    each: true,
    message: 'Each ID in notificationIds must be a valid MongoDB ObjectId.',
  })
  notificationIds: string[];
}
