// src/upload/media.controller.ts
import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Post,
  Body,
  ForbiddenException,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService, CreateMediaParams } from './media.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('Media')
// --- THIS IS THE FIX ---
// The controller's base path is simplified to '/media'.
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // This endpoint is now at POST /media
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a media record (for internal server-to-server use)',
  })
  async createMediaRecord(
    @Body() createMediaDto: CreateMediaParams,
    @Headers('x-uploadthing-webhook-secret') webhookSecret: string,
  ) {
    if (webhookSecret !== process.env.UPLOADTHING_WEBHOOK_SECRET) {
      throw new ForbiddenException('Invalid webhook secret.');
    }
    return this.mediaService.create(createMediaDto);
  }

  // This endpoint is now at GET /media/my-uploads
  @Get('my-uploads')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's uploaded media" })
  async getMyUploads(
    @CurrentUser() user: UserDocument,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.mediaService.findForUser(user._id.toString(), page, limit);
  }

  // This endpoint is now at DELETE /media/:id
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete one of the user's uploaded media files" })
  async deleteMedia(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) mediaId: string,
  ): Promise<void> {
    await this.mediaService.deleteById(mediaId, user._id.toString());
  }
}
