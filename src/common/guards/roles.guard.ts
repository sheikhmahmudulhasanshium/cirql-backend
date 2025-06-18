// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { UserDocument } from '../../users/schemas/user.schema';

// Define a type for Express requests that are guaranteed to have a user property
interface AuthenticatedRequest extends Request {
  user: UserDocument;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator is used, the guard allows access.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // For a route protected by roles, a user must exist and have roles.
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException(
        'Access Denied: User information is missing.',
      );
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      user.roles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'You do not have the necessary permissions.',
      );
    }

    return true;
  }
}
