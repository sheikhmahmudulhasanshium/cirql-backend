import {
  Controller,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { GroupsService } from './groups.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ManageGroupMemberDto } from './dto/manage-group-member.dto';
import { GroupDocument } from './schemas/group.schema';

@ApiTags('Social - Groups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  createGroup(
    @CurrentUser() user: UserDocument,
    @Body() createGroupDto: CreateGroupDto,
  ): Promise<GroupDocument> {
    const ownerId = user._id.toString();
    return this.groupsService.createGroup(ownerId, createGroupDto);
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update a group you own' })
  updateGroup(
    @CurrentUser() user: UserDocument,
    @Param('groupId', ParseObjectIdPipe) groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ): Promise<GroupDocument> {
    const ownerId = user._id.toString();
    return this.groupsService.updateGroup(ownerId, groupId, updateGroupDto);
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: 'Add a member to a group' })
  addMember(
    @CurrentUser() user: UserDocument,
    @Param('groupId', ParseObjectIdPipe) groupId: string,
    @Body() manageGroupMemberDto: ManageGroupMemberDto,
  ): Promise<GroupDocument> {
    const requesterId = user._id.toString();
    return this.groupsService.addMember(
      requesterId,
      groupId,
      manageGroupMemberDto.memberId,
    );
  }

  @Delete(':groupId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a group' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: UserDocument,
    @Param('groupId', ParseObjectIdPipe) groupId: string,
    @Param('memberId', ParseObjectIdPipe) memberId: string,
  ): Promise<void> {
    const requesterId = user._id.toString();
    await this.groupsService.removeMember(requesterId, groupId, memberId);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get details of a specific group' })
  getGroup(
    @Param('groupId', ParseObjectIdPipe) groupId: string,
  ): Promise<GroupDocument> {
    return this.groupsService.getGroupById(groupId);
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete a group you own' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @CurrentUser() user: UserDocument,
    @Param('groupId', ParseObjectIdPipe) groupId: string,
  ): Promise<void> {
    const ownerId = user._id.toString();
    await this.groupsService.deleteGroup(ownerId, groupId);
  }
}
