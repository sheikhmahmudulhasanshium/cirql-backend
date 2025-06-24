// src/auth/guards/banned-user.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserDocument } from '../../users/schemas/user.schema';

// This assumes your request object has a user property after the JWT guard runs.
interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@Injectable()
export class BannedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // The standard AuthGuard('jwt') should already ensure a user exists.
    if (!user) {
      return false; // Should not happen if AuthGuard is used first.
    }

    // This guard ONLY allows access if the user's status is 'banned'.
    if (user.accountStatus === 'banned') {
      return true;
    }

    // If the user is active or has any other status, they are forbidden.
    throw new ForbiddenException(
      'This action is only available for suspended accounts.',
    );
  }
}
