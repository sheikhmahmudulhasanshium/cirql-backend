// FILE: src/social/groups.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
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
    const ownerId = req.user._id.toString(); // <-- FIX
    return { message: 'Create group endpoint', ownerId, ...createGroupDto };
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update a group you own' })
  updateGroup(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseObjectIdPipe) groupId: Types.ObjectId,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    const ownerId = req.user._id.toString(); // <-- FIX
    return {
      message: 'Update group endpoint',
      ownerId,
      groupId: groupId.toString(), // <-- FIX
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
    const requesterId = req.user._id.toString(); // <-- FIX
    return {
      message: 'Add member endpoint',
      requesterId,
      groupId: groupId.toString(), // <-- FIX
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
    const requesterId = req.user._id.toString(); // <-- FIX
    return {
      message: 'Remove member endpoint',
      requesterId,
      groupId: groupId.toString(), // <-- FIX
      memberId: memberId.toString(), // <-- FIX
    };
  }
}
