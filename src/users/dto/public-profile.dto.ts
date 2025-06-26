import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class PublicProfileDto {
  @ApiProperty()
  id: string | Types.ObjectId;

  @ApiProperty()
  firstName?: string;

  @ApiProperty()
  lastName?: string;

  @ApiProperty()
  picture?: string;
}
