// cirql-backend/src/upload/media.controller.ts

import {
  All,
  Controller,
  Get,
  Injectable,
  Logger,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createRouteHandler, type FileRouter } from 'uploadthing/server';
import { createUploadthingRouter } from './uploadthing.core';
import { MediaService } from './media.service';
import { InjectModel } from '@nestjs/mongoose';
import { Media, MediaDocument } from './schemas/media.schema';
import { Model, Types } from 'mongoose';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { Readable } from 'stream';
import { Group, GroupDocument } from '../social/schemas/group.schema';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Ticket, TicketDocument } from '../support/schemas/ticket.schema';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

// --- START OF THE CRITICAL FIX ---
// Define a more accurate type for the handler object returned by createRouteHandler
type UploadThingRouteHandler = {
  GET: (req: Request, res: Response) => Promise<void>;
  POST: (req: Request, res: Response) => Promise<void>;
};
// --- END OF THE CRITICAL FIX ---

@ApiTags('Media')
@Controller('media')
@Injectable()
export class MediaController {
  // --- START OF THE CRITICAL FIX ---
  // Use the new, correct type for the route handler property
  private readonly uploadthingRouteHandler: UploadThingRouteHandler;
  // --- END OF THE CRITICAL FIX ---
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {
    this.logger.log(
      'Initializing MediaController and creating Uploadthing router...',
    );

    const uploadthingRouter: FileRouter = createUploadthingRouter(
      this.mediaService,
      this.mediaModel,
      this.jwtService,
      this.usersService,
    );

    // --- START OF THE CRITICAL FIX ---
    // The cast now matches the correct object shape
    this.uploadthingRouteHandler = createRouteHandler({
      router: uploadthingRouter,
    }) as unknown as UploadThingRouteHandler;
    // --- END OF THE CRITICAL FIX ---
    this.logger.log('Uploadthing router successfully initialized');
  }

  @All('upload')
  @ApiOperation({
    summary: 'Handle file uploads and webhook callbacks via UploadThing.',
  })
  @ApiBearerAuth()
  async handleUpload(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log(
      `Request received for /media/upload. Forwarding to uploadthing.`,
    );

    // --- START OF THE CRITICAL FIX ---
    // Both the initial upload and the webhook use the POST method.
    // We now correctly call the .POST method ON the handler object.
    // This resolves the "is not a function" TypeError.
    await this.uploadthingRouteHandler.POST(req, res);
    // --- END OF THE CRITICAL FIX ---
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "Get a list of the current user's uploaded files." })
  @ApiResponse({
    status: 200,
    description: 'A list of media files owned by the user.',
    type: [Media],
  })
  async getMyFiles(
    @CurrentUser() user: UserDocument,
  ): Promise<MediaDocument[]> {
    this.logger.log(`Fetching files for owner: ${user.id}`);
    return this.mediaModel.find({ owner: user._id }).exec();
  }

  @Get('all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({
    summary: 'Get a list of all files in the system (Admin/Owner only).',
  })
  @ApiResponse({
    status: 200,
    description: 'A list of all media files.',
    type: [Media],
  })
  async getAllFiles(
    @CurrentUser() user: UserDocument,
  ): Promise<MediaDocument[]> {
    this.logger.log(`Admin ${user.id} fetching all files.`);
    return this.mediaModel.find().sort({ createdAt: -1 }).exec();
  }

  @Get('group/:groupId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a list of files shared in a specific group.' })
  @ApiResponse({
    status: 200,
    description: 'A list of media files shared in the group.',
    type: [Media],
  })
  async getGroupFiles(
    @Param('groupId', ParseObjectIdPipe) groupId: string,
    @CurrentUser() user: UserDocument,
  ): Promise<MediaDocument[]> {
    const group = await this.groupModel.findById(groupId).lean().exec();
    if (!group) throw new NotFoundException('Group not found.');
    const isMember = group.members
      .map((id) => id.toString())
      .includes(user._id.toString());
    if (!isMember && !user.roles.includes(Role.Admin)) {
      throw new ForbiddenException('You are not a member of this group.');
    }
    this.logger.log(`User ${user.id} fetching files for group ${groupId}`);
    return this.mediaModel
      .find({ contextModel: 'Group', contextId: new Types.ObjectId(groupId) })
      .exec();
  }

  @Get('ticket/:ticketId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get a list of files shared in a specific support ticket.',
  })
  @ApiResponse({
    status: 200,
    description: 'A list of media files shared in the ticket.',
    type: [Media],
  })
  async getTicketFiles(
    @Param('ticketId', ParseObjectIdPipe) ticketId: string,
    @CurrentUser() user: UserDocument,
  ): Promise<MediaDocument[]> {
    const ticket = await this.ticketModel.findById(ticketId).lean().exec();
    if (!ticket) throw new NotFoundException('Ticket not found.');

    const ticketOwnerId =
      ticket.user instanceof Types.ObjectId
        ? ticket.user.toString()
        : (ticket.user as UserDocument)?._id?.toString();

    const isOwner = ticketOwnerId && ticketOwnerId === user._id.toString();

    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view files for this ticket.',
      );
    }
    this.logger.log(`User ${user.id} fetching files for ticket ${ticketId}`);
    return this.mediaModel
      .find({ contextModel: 'Ticket', contextId: new Types.ObjectId(ticketId) })
      .exec();
  }

  @Get('download/:mediaId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Download a specific media file by its ID.' })
  async downloadFile(
    @Param('mediaId', ParseObjectIdPipe) mediaId: string,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) throw new NotFoundException('Media file not found.');
    let hasAccess = false;
    const ownerId = media.owner.toString();
    const userId: string = user._id.toString();
    const isAdmin =
      user.roles.includes(Role.Admin) || user.roles.includes(Role.Owner);
    if (isAdmin) {
      hasAccess = true;
    } else {
      switch (media.visibility) {
        case 'public':
          hasAccess = true;
          break;
        case 'private':
          hasAccess = ownerId === userId;
          break;
        case 'shared':
          if (media.contextModel === 'Group' && media.contextId) {
            const group = await this.groupModel
              .findById(media.contextId)
              .lean()
              .exec();
            if (
              group &&
              group.members.map((id) => id.toString()).includes(userId)
            ) {
              hasAccess = true;
            }
          } else if (media.contextModel === 'Ticket' && media.contextId) {
            const ticket = await this.ticketModel
              .findById(media.contextId)
              .lean()
              .exec();

            const ticketOwnerId =
              ticket?.user instanceof Types.ObjectId
                ? ticket.user.toString()
                : (ticket?.user as UserDocument)?._id?.toString();

            if (ticketOwnerId && ticketOwnerId === userId) {
              hasAccess = true;
            }
          }
          break;
      }
    }
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have permission to access this file.',
      );
    }
    try {
      const stream = await this.mediaService.getDownloadStream(
        media.googleFileId,
      );
      if (stream instanceof Readable) {
        stream.pipe(res);
      } else {
        throw new InternalServerErrorException(
          'Failed to obtain a valid file stream.',
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to stream file ${media.googleFileId} from Google Drive: ${errorMessage}`,
      );
      throw new NotFoundException(
        'The source file could not be retrieved from storage.',
      );
    }
  }
}
