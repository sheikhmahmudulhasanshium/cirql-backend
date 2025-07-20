import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateMediaDto } from './dto/create-media.dto';
import { Media, MediaDocument } from './schemas/media.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

// --- DTO Class for Swagger Documentation ---
class PaginationMetadata {
  @ApiProperty() totalItems: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}
class PaginatedMediaResponse {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty({ type: [Media] }) data: MediaDocument[];
  @ApiProperty({ type: PaginationMetadata }) pagination: PaginationMetadata;
}
// --- End DTO Class ---

@ApiTags('Media')
@Controller('media')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('my-uploads')
  @ApiOperation({ summary: "Get a paginated list of the current user's media" })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({ status: 200, type: PaginatedMediaResponse })
  async getMyUploads(
    @CurrentUser() user: UserDocument,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ): Promise<PaginatedMediaResponse> {
    const result = await this.mediaService.findForUser(
      user._id.toString(),
      page,
      limit,
    );
    return {
      success: true,
      data: result.data,
      pagination: {
        totalItems: result.total,
        currentPage: result.page,
        pageSize: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media file owned by the current user' })
  @ApiResponse({ status: 204, description: 'File deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async deleteMedia(
    @CurrentUser() user: UserDocument,
    @Param('mediaId', ParseObjectIdPipe) mediaId: string,
  ): Promise<void> {
    await this.mediaService.deleteById(mediaId, user._id.toString());
  }

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
