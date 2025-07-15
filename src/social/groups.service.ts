// src/social/groups.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from './schemas/group.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createGroup(
    ownerId: string,
    createGroupDto: CreateGroupDto,
  ): Promise<GroupDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    // FIX: Await the .create() promise
    return await this.groupModel.create({
      ...createGroupDto,
      owner: ownerObjectId,
      members: [ownerObjectId],
    });
  }

  async getGroupById(groupId: string): Promise<GroupDocument> {
    const group = await this.groupModel
      .findById(groupId)
      .populate('owner members', 'firstName lastName picture')
      .exec();
    if (!group) {
      throw new NotFoundException('Group not found.');
    }
    return group;
  }

  async updateGroup(
    requesterId: string,
    groupId: string,
    updateGroupDto: UpdateGroupDto,
  ): Promise<GroupDocument> {
    const group = await this.getGroupById(groupId);

    if (group.owner.toString() !== requesterId) {
      throw new ForbiddenException(
        'You do not have permission to update this group.',
      );
    }

    Object.assign(group, updateGroupDto);
    return group.save();
  }

  async deleteGroup(requesterId: string, groupId: string): Promise<void> {
    const group = await this.getGroupById(groupId);
    if (group.owner.toString() !== requesterId) {
      throw new ForbiddenException(
        'You do not have permission to delete this group.',
      );
    }
    await this.groupModel
      .deleteOne({ _id: new Types.ObjectId(groupId) })
      .exec();
  }

  async addMember(
    requesterId: string,
    groupId: string,
    memberId: string,
  ): Promise<GroupDocument> {
    const [group, member] = await Promise.all([
      this.getGroupById(groupId),
      this.usersService.findById(memberId),
    ]);

    if (
      group.owner.toString() !== requesterId &&
      !group.members.map((m) => m.toString()).includes(requesterId)
    ) {
      throw new ForbiddenException(
        'You must be a member or owner to add new members.',
      );
    }

    if (!member) {
      throw new NotFoundException('User to be added not found.');
    }

    const memberObjectId = new Types.ObjectId(memberId);

    if (group.members.map((m) => m.toString()).includes(memberId)) {
      throw new ConflictException(
        'This user is already a member of the group.',
      );
    }

    group.members.push(memberObjectId);
    return group.save();
  }

  async removeMember(
    requesterId: string,
    groupId: string,
    memberId: string,
  ): Promise<void> {
    const group = await this.getGroupById(groupId);

    const isOwner = group.owner.toString() === requesterId;
    const isSelfRemoval = requesterId === memberId;

    if (!isOwner && !isSelfRemoval) {
      throw new ForbiddenException(
        'You can only remove yourself or be removed by the group owner.',
      );
    }

    if (group.owner.toString() === memberId) {
      throw new BadRequestException('The group owner cannot be removed.');
    }

    const initialLength = group.members.length;
    group.members = group.members.filter((m) => m.toString() !== memberId);

    if (group.members.length === initialLength) {
      throw new NotFoundException('Member not found in this group.');
    }

    await group.save();
  }
}
