// src/users/users.controller.ts
import {
  Controller,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  UseGuards,
  ValidationPipe,
  // NotFoundException, // Not directly used in controller, service handles it
  // ForbiddenException, // Will be used when RBAC is implemented
  Req,
  HttpCode,
  HttpStatus,
  // Optional, // Not used
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Request as ExpressRequest } from 'express';

// Define AuthenticatedRequest for routes that ARE protected
interface AuthenticatedRequest extends ExpressRequest {
  user: UserDocument; // For protected routes, user is guaranteed by AuthGuard
}

// PotentiallyAuthenticatedRequest is not used in the current simplified public routes
// interface PotentiallyAuthenticatedRequest extends ExpressRequest {
//   user?: UserDocument;
// }

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of users.',
    type: User,
    isArray: true,
  })
  async findAll(): Promise<UserDocument[]> {
    return this.usersService.findAll();
  }

  @Get('profile/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ApiResponse({
    status: 200,
    description: 'Current user profile.',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyProfile(@Req() req: AuthenticatedRequest): UserDocument {
    // req.user is guaranteed by AuthGuard, no need for !req.user check here as guard handles it
    return req.user;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID (Public)' })
  @ApiParam({
    name: 'id',
    description: 'User ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'User found.', type: User })
  @ApiResponse({ status: 404, description: 'User not found.' }) // Service throws NotFoundException
  async findOne(
    @Param('id', new ParseObjectIdPipe()) id: string,
  ): Promise<UserDocument> {
    return this.usersService.findById(id); // Service handles NotFoundException
  }

  @Patch('profile/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User (self) not found.' }) // Service handles NotFoundException
  @ApiResponse({
    status: 409,
    description: 'Conflict (e.g., email already in use).',
  })
  async updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: false,
      }),
    )
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    // req.user is guaranteed by AuthGuard
    const userId = req.user._id.toString();
    return this.usersService.update(userId, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a specific user by ID (requires admin permissions)',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully.',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Admin access required.',
  }) // For RBAC
  @ApiResponse({ status: 404, description: 'User not found.' }) // Service handles NotFoundException
  @ApiResponse({
    status: 409,
    description: 'Conflict (e.g., email already in use).',
  })
  // TODO: Implement RBAC (e.g., @Roles(Role.Admin))
  async update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: false,
      }),
    )
    updateUserDto: UpdateUserDto,
    // @Req() req: AuthenticatedRequest, // Uncomment when RBAC is implemented and req.user is used
  ): Promise<UserDocument> {
    // Example RBAC check:
    // if (!req.user.roles.includes(Role.Admin)) { // Assuming roles on user
    //   throw new ForbiddenException('You do not have permission to update this user.');
    // }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user by ID (requires admin permissions)' })
  @ApiParam({
    name: 'id',
    description: 'User ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Admin access required.',
  }) // For RBAC
  @ApiResponse({ status: 404, description: 'User not found.' }) // Service handles NotFoundException
  @HttpCode(HttpStatus.NO_CONTENT)
  // TODO: Implement RBAC (e.g., @Roles(Role.Admin))
  async remove(
    @Param('id', new ParseObjectIdPipe()) id: string,
    // @Req() req: AuthenticatedRequest, // Uncomment when RBAC is implemented and req.user is used
  ): Promise<void> {
    // Example RBAC check:
    // if (!req.user.roles.includes(Role.Admin)) { // Assuming roles on user
    //  throw new ForbiddenException('You do not have permission to delete users.');
    // }
    await this.usersService.remove(id);
  }
}
