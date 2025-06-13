// FILE: src/social/dto/send-friend-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({
    description: 'The MongoDB ObjectId of the user to send the request to.',
    example: '663a4b9b9a6b1d4a9c8b4d8e',
  })
  @IsMongoId({ message: 'recipientId must be a valid MongoDB ObjectId' })
  recipientId: string;
}
