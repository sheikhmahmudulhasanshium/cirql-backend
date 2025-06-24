// src/users/users.controller.ts

import {
  Controller,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { UsersService, AdminUserListView } from './users.service';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Request as ExpressRequest } from 'express';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Types } from 'mongoose';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { PublicProfileDto } from './dto/public-profile.dto';
import { BanUserDto } from './dto/ban-user.dto'; // --- ADDED IMPORT ---

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDocument;
}

class PaginationMetadata {
  @ApiProperty() totalItems: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}
class AdminUserDto {
  @ApiProperty() _id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() accountStatus: string;
  @ApiProperty({ enum: Role, isArray: true }) roles: Role[];
  @ApiProperty({ type: Date, nullable: true }) lastLogin: Date | null;
  @ApiProperty() is2FAEnabled: boolean;
}
class PaginatedUsersResponse {
  @ApiProperty() success: boolean;
  @ApiProperty({ type: [AdminUserDto] }) data: AdminUserListView[];
  @ApiProperty({ type: PaginationMetadata }) pagination: PaginationMetadata;
}
class PaginatedPublicUsersResponse {
  @ApiProperty() success: boolean;
  @ApiProperty({ type: [PublicProfileDto] }) data: PublicProfileDto[];
  @ApiProperty({ type: PaginationMetadata }) pagination: PaginationMetadata;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users (Admin/Owner only)',
    description: 'Provides a detailed, paginated list of all user accounts.',
  })
  @ApiQuery({
    name: 'accountStatus',
    required: false,
    type: String,
    description: 'Filter by account status (e.g., "active")',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number, default: 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page, default: 10',
  })
  @ApiResponse({ status: 200, type: PaginatedUsersResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Insufficient permissions.',
  })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('accountStatus') accountStatus?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<PaginatedUsersResponse> {
    const {
      data,
      total,
      page: currentPage,
      limit: pageSize,
    } = await this.usersService.findAll(
      req.user.roles,
      accountStatus,
      page,
      limit,
    );

    return {
      success: true,
      data,
      pagination: {
        totalItems: total,
        currentPage,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get('directory')
  @ApiOperation({
    summary: 'Get public user directory (No Auth Required)',
    description:
      'Provides a paginated list of public, active user profiles available to anyone.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number, default: 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page, default: 10',
  })
  @ApiResponse({ status: 200, type: PaginatedPublicUsersResponse })
  async findPublic(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<PaginatedPublicUsersResponse> {
    const {
      data,
      total,
      page: currentPage,
      limit: pageSize,
    } = await this.usersService.findPublicProfiles(page, limit);
    return {
      success: true,
      data,
      pagination: {
        totalItems: total,
        currentPage,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get('profile/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ApiResponse({ status: 200, type: User })
  getMyProfile(@Req() req: AuthenticatedRequest): UserDocument {
    return req.user;
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID (Admin/Owner only)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<UserDocument> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id.toString()}" not found.`);
    }
    return user;
  }

  @Patch('profile/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiResponse({ status: 200, type: User })
  async updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const userId = req.user._id.toString();
    return this.usersService.update(userId, updateUserDto);
  }

  @Patch(':id/roles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a user's roles (Admin/Owner only)" })
  @ApiParam({ name: 'id', description: 'The ID of the user to update' })
  @ApiResponse({
    status: 200,
    description: 'User roles updated successfully.',
    type: User,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. You cannot change these roles.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateRoles(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateUserRolesDto: UpdateUserRolesDto,
  ): Promise<UserDocument> {
    return this.usersService.updateUserRoles(id, updateUserRolesDto, req.user);
  }

  // --- NEW ENDPOINTS START ---

  @Patch(':id/ban')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ban a user's account (Admin/Owner only)" })
  @ApiParam({ name: 'id', description: 'The ID of the user to ban' })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully.',
    type: User,
  })
  async banUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() banUserDto: BanUserDto,
  ): Promise<UserDocument> {
    return this.usersService.banUser(id, banUserDto, req.user);
  }

  @Patch(':id/unban')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unban a user's account (Admin/Owner only)" })
  @ApiParam({ name: 'id', description: 'The ID of the user to unban' })
  @ApiResponse({
    status: 200,
    description: 'User unbanned successfully.',
    type: User,
  })
  async unbanUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserDocument> {
    return this.usersService.unbanUser(id, req.user);
  }

  // --- NEW ENDPOINTS END ---

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user by ID (Admin/Owner only)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, type: User })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user by ID (Admin/Owner only)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 204, description: 'User deleted successfully.' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.usersService.remove(id, req.user);
  }
}
