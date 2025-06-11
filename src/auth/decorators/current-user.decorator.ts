// FILE: src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../../users/schemas/user.schema';
import { Request } from 'express';

// Define a type for the Express request object that includes the 'user' property.
interface RequestWithUser extends Request {
  user: UserDocument;
}

/**
 * Extracts the user object attached to the request by Passport's AuthGuard.
 * Usage: @CurrentUser() user: UserDocument
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDocument => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
