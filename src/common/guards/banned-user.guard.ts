// src/auth/guards/banned-user.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserDocument } from '../../users/schemas/user.schema';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@Injectable()
export class BannedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // This guard should only be used after a guard that attaches the user (e.g., AuthGuard('jwt'))
    if (!user) {
      // Deny access if user object is not present, though this shouldn't happen in a proper setup.
      return false;
    }

    if (user.accountStatus === 'banned') {
      return true; // Allow access if user is banned.
    }

    // For any other status, deny access.
    throw new ForbiddenException(
      'This action is only available for suspended accounts.',
    );
  }
}
