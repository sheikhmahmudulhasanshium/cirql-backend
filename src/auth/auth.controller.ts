// src/auth/auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokenResponse, SanitizedUser } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Types } from 'mongoose'; // <--- IMPORT Types from mongoose

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() _req: AuthenticatedRequest) {
    // Guard redirects
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated with Google. Redirects with token.',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const user = req.user as UserDocument;

    if (!user) {
      return res.redirect(
        `${this.configService.get<string>('FRONTEND_URL')}/login?error=authenticationFailed`,
      );
    }

    const tokenResponse: AuthTokenResponse = this.authService.login(user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${tokenResponse.accessToken}`,
    );
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check authentication status and get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User is authenticated. Returns user profile.',
    type: SanitizedUser,
  })
  @ApiResponse({ status: 401, description: 'User is not authenticated.' })
  checkAuthStatus(@Req() req: AuthenticatedRequest): SanitizedUser {
    const userDocument = req.user as UserDocument;

    // Ensure 'User' class is imported from '../users/schemas/user.schema'
    // It seems like it is, from the imports at the top.
    const plainUserObject = userDocument.toObject<
      User & { _id: Types.ObjectId }
    >();

    const sanitizedUserResponse: SanitizedUser = {
      _id: plainUserObject._id, // This should now be correctly typed as Types.ObjectId
      email: plainUserObject.email,
      firstName: plainUserObject.firstName,
      lastName: plainUserObject.lastName,
      picture: plainUserObject.picture,
    };
    return sanitizedUserResponse;
  }
}
