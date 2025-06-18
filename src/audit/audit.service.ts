// src/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditAction } from './schemas/audit-log.schema';
import { UserDocument } from '../users/schemas/user.schema';

interface CreateLogPayload {
  actor: UserDocument;
  action: AuditAction;
  targetId: string | Types.ObjectId;
  targetType: string;
  details?: { before?: any; after?: any };
  reason?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  async createLog(payload: CreateLogPayload): Promise<void> {
    try {
      const logEntry = new this.auditLogModel({
        actor: payload.actor._id,
        action: payload.action,
        targetId: payload.targetId,
        targetType: payload.targetType,
        details: payload.details,
        reason: payload.reason,
      });
      await logEntry.save();
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // IMPORTANT: We do not re-throw the error. A failure to create an
      // audit log should not cause the primary user action (e.g., role change) to fail.
    }
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find()
        .populate('actor', 'id firstName lastName email') // Populate actor with specific fields
        .sort({ createdAt: -1 }) // Show newest logs first
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments().exec(),
    ]);

    return { data: logs, total, page, limit };
  }
}
