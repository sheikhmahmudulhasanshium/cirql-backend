import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName?: string;
  @ApiProperty() lastName?: string;
  @ApiProperty() picture?: string;
  @ApiProperty() headline?: string;
  @ApiProperty() bio?: string;
  @ApiProperty() location?: string;
  @ApiProperty() website?: string;
  @ApiProperty() isPrivate: boolean;
  @ApiProperty() accountStatus: string;
  @ApiProperty({ enum: Role, isArray: true }) roles: Role[];
  @ApiProperty() createdAt: Date;
}
