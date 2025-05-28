import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokenResponse, SanitizedUser } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express'; // Renamed import
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  ApiTags,
  ApiOperation,
  // ApiResponse, // Removed unused import
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Types } from 'mongoose';

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
    // Removed unused _req parameter
    // Guard redirects
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL' })
  googleAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse, // Use the renamed ExpressResponse type
  ) {
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
