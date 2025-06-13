// FILE: src/social/groups.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  // Get, // REMOVED: No GET endpoints are defined yet
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

import { GroupsService } from './groups.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Types } from 'mongoose';

// Import the new DTOs
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ManageGroupMemberDto } from './dto/manage-group-member.dto';

interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@ApiTags('Social - Groups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  createGroup(
    @Req() req: AuthenticatedRequest,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    const ownerId = req.user._id.toHexString();
    // TODO: Pass the DTO and ownerId to the service
    // return this.groupsService.create(ownerId, createGroupDto);
    return { message: 'Create group endpoint', ownerId, ...createGroupDto };
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update a group you own' })
  updateGroup(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseObjectIdPipe) groupId: Types.ObjectId,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    const ownerId = req.user._id.toHexString();
    // TODO: The service will need to verify ownership before updating
    // return this.groupsService.update(ownerId, groupId.toHexString(), updateGroupDto);
    return {
      message: 'Update group endpoint',
      ownerId,
      groupId: groupId.toHexString(),
      ...updateGroupDto,
    };
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: 'Add a member to a group' })
  addMember(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseObjectIdPipe) groupId: Types.ObjectId,
    @Body() manageGroupMemberDto: ManageGroupMemberDto,
  ) {
    const requesterId = req.user._id.toHexString();
    // TODO: The service would handle permissions (e.g., only owner can add members)
    // return this.groupsService.addMember(requesterId, groupId.toHexString(), manageGroupMemberDto.memberId);
    return {
      message: 'Add member endpoint',
      requesterId, // ADDED: Include the variable in the return object
      groupId: groupId.toHexString(),
      ...manageGroupMemberDto,
    };
  }

  @Delete(':groupId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a group' })
  removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseObjectIdPipe) groupId: Types.ObjectId,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    const requesterId = req.user._id.toHexString();
    // TODO: The service would handle permissions
    // return this.groupsService.removeMember(requesterId, groupId.toHexString(), memberId.toHexString());
    return {
      message: 'Remove member endpoint',
      requesterId, // This was already correct, but shown for consistency
      groupId: groupId.toHexString(),
      memberId: memberId.toHexString(),
    };
  }
}
