// src/social/recommendations.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { SocialProfile } from './schemas/social-profile.schema';

@ApiTags('Social - Recommendations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('social/recommendations')
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('users')
  @ApiOperation({
    summary: 'Get personalized user recommendations ("People You Might Know")',
    description:
      'Recommends users based on shared interests. Results are paginated and prioritized by the number of common interests, then by follower count.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination, starting from 1.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations per page.',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'A paginated list of recommended users.',
    type: [SocialProfile],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. A valid JWT is required.',
  })
  async getUserRecommendations(
    @CurrentUser() user: UserDocument,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<SocialProfile[]> {
    // --- START: LINTER FIX ---
    // Explicitly convert the ObjectId to a string before using it in the template literal.
    const userId = user._id.toString();
    this.logger.log(
      `Request for recommendations received for user ${userId}, page: ${page}, limit: ${limit}`,
    );
    // --- END: LINTER FIX ---

    // Fetch all recommendations from the service
    const allRecommendations =
      await this.recommendationsService.getUserRecommendations(user);

    // Manual pagination of the results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = allRecommendations.slice(startIndex, endIndex);

    return paginatedResults;
  }
}
