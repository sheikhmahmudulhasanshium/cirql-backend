import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'An array of roles to assign to the user.',
    enum: Role,
    isArray: true,
    example: [Role.User, Role.Admin],
  })
  @IsArray()
  @IsEnum(Role, {
    each: true,
    message: 'Each role must be a valid role value.',
  })
  roles: Role[];
}
