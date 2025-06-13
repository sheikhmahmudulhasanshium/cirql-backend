// FILE: src/social/dto/manage-group-member.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ManageGroupMemberDto {
  @ApiProperty({
    description:
      'The MongoDB ObjectId of the user to add or remove from the group.',
    example: '663a4b9b9a6b1d4a9c8b4d8e',
  })
  @IsMongoId({ message: 'memberId must be a valid MongoDB ObjectId' })
  memberId: string;
}
