//cirql-backend/src/upload/media.controller.ts` (Updated)**

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateMediaFromUrlDto } from './dto/create-media-from-url.dto';

@ApiTags('Media')
@Controller('media')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // --- START: NEW ENDPOINT FOR URL UPLOADS ---
  @Post('from-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Fetch a file from a URL and save it as media' })
  async createMediaFromUrl(
    @CurrentUser() user: UserDocument,
    @Body() createMediaFromUrlDto: CreateMediaFromUrlDto,
  ) {
    return this.mediaService.createFromUrl(createMediaFromUrlDto.url, user._id);
  }
  // --- END: NEW ENDPOINT ---

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save metadata for a successfully uploaded file' })
  async createMediaRecord(
    @CurrentUser() user: UserDocument,
    @Body() createMediaDto: CreateMediaDto,
  ) {
    return this.mediaService.create({
      ...createMediaDto,
      userId: user._id,
    });
  }
}
