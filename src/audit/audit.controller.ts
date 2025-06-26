import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditService } from './audit.service';
import { AuditLog } from './schemas/audit-log.schema';

class PaginationMetadata {
  @ApiProperty() totalItems: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}
class PaginatedAuditLogResponse {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty({ type: [AuditLog] }) data: AuditLog[];
  @ApiProperty({ type: PaginationMetadata }) pagination: PaginationMetadata;
}

@ApiTags('audit')
@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all audit logs (Owner only)' })
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
    description: 'Items per page, default: 20',
  })
  @ApiResponse({
    status: 200,
    description: 'A paginated list of audit logs.',
    type: PaginatedAuditLogResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Owner access required.',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedAuditLogResponse> {
    const {
      data,
      total,
      page: currentPage,
      limit: pageSize,
    } = await this.auditService.findAll(page, limit);
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
}
