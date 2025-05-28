// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Req,
  UseGuards,
  Redirect, // Keep
  HttpStatus, // Keep for status codes
  // UnauthorizedException, // Remove if not explicitly thrown by this controller
  // HttpCode, // Remove if not explicitly used by @HttpCode decorator
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokenResponse, SanitizedUser } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Types } from 'mongoose';
// No direct 'express' import needed for this controller if using @Redirect

interface AuthenticatedRequest extends ExpressRequest {
  user?: UserDocument | SanitizedUser;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Guard redirects
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL' })
  @Redirect() // Use NestJS's @Redirect decorator
  googleAuthRedirect(@Req() req: AuthenticatedRequest): {
    url: string;
    statusCode: number;
  } {
    // Explicit return type
    const user = req.user as UserDocument;

    if (!user) {
      const errorUrl = `${this.configService.get<string>('FRONTEND_URL')}/login?error=authenticationFailed`;
      // Using HttpStatus.FOUND (302) which is common for temporary redirects.
      // Other options include HttpStatus.MOVED_PERMANENTLY (301) if appropriate.
      return { url: errorUrl, statusCode: HttpStatus.FOUND };
    }

    const tokenResponse: AuthTokenResponse = this.authService.login(user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const successUrl = `${frontendUrl}/auth/callback?token=${tokenResponse.accessToken}`;

    return { url: successUrl, statusCode: HttpStatus.FOUND };
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check authentication status and get user profile' })
  checkAuthStatus(@Req() req: AuthenticatedRequest): SanitizedUser {
    const userDocument = req.user as UserDocument;
    const plainUserObject = userDocument.toObject<
      User & { _id: Types.ObjectId }
    >();

    const sanitizedUserResponse: SanitizedUser = {
      _id: plainUserObject._id,
      email: plainUserObject.email,
      firstName: plainUserObject.firstName,
      lastName: plainUserObject.lastName,
      picture: plainUserObject.picture,
    };
    return sanitizedUserResponse;
  }
}
