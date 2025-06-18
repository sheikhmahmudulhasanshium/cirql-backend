import {
  Controller,
  Get,
  Req,
  UseGuards,
  Redirect,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  HttpCode,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokenResponse, SanitizedUser } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../users/schemas/user.schema';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface OAuthState {
  finalRedirectUri?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('2fa/generate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a new 2FA secret and QR code for setup' })
  @ApiResponse({
    status: 201,
    description:
      'Returns a data URL for a QR code to be displayed to the user.',
  })
  async generate2faSecret(@CurrentUser() user: UserDocument) {
    const { otpAuthUrl } = await this.authService.generateTwoFactorSecret(user);
    const qrCodeDataUrl =
      await this.authService.generateQrCodeDataURL(otpAuthUrl);
    return { qrCodeDataUrl };
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enable 2FA by verifying the first code' })
  @ApiResponse({
    status: 201,
    description: '2FA enabled. Returns a list of single-use backup codes.',
  })
  async enable2fa(
    @CurrentUser() user: UserDocument,
    @Body() { code }: TwoFactorCodeDto,
  ) {
    const { backupCodes } = await this.authService.enableTwoFactorAuth(
      user,
      code,
    );
    return {
      message:
        '2FA has been successfully enabled. Please save these backup codes securely! They will not be shown again.',
      backupCodes,
    };
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable 2FA by providing a valid 2FA code',
  })
  @ApiResponse({
    status: 200,
    description: '2FA has been successfully disabled.',
  })
  async disable2fa(
    @CurrentUser() user: UserDocument,
    @Body() { code }: TwoFactorCodeDto,
  ) {
    await this.authService.disableTwoFactorAuth(user, code);
    return {
      message: 'Two-factor authentication has been successfully disabled.',
    };
  }

  @Post('2fa/authenticate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-2fa'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify the 2FA code to complete the login process',
    description:
      'This endpoint requires the temporary token from the initial login step.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Returns the full access token and user profile.',
  })
  async authenticate2fa(
    @CurrentUser() user: UserDocument,
    @Body() { code }: TwoFactorCodeDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.authService.isTwoFactorCodeValid(code, user);
    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid authentication code.');
    }
    return this.authService.loginWith2fa(user);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL' })
  @Redirect()
  googleAuthRedirect(
    @CurrentUser() user: UserDocument,
    @Req() req: ExpressRequest,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    let defaultSuccessUrl = `${frontendUrl}/auth/google/callback`;
    // --- THIS IS THE FIX ---
    const default2faUrl = `${frontendUrl}/log-in/verify-2fa`;
    const state = req.query.state as string | undefined;
    if (state) {
      try {
        const decodedState = JSON.parse(
          decodeURIComponent(state),
        ) as OAuthState;
        if (decodedState.finalRedirectUri) {
          defaultSuccessUrl = decodedState.finalRedirectUri;
        }
      } catch {
        this.logger.warn('Could not parse OAuth state parameter.');
      }
    }
    if (!user) {
      this.logger.error('User object not found on request after Google OAuth.');
      const errorUrl = new URL(`${frontendUrl}/sign-in`);
      errorUrl.searchParams.set('error', 'authenticationFailed');
      return { url: errorUrl.toString() };
    }
    const authResult = this.authService.login(user);
    if ('isTwoFactorRequired' in authResult && authResult.isTwoFactorRequired) {
      const redirectUrl = new URL(default2faUrl);
      redirectUrl.searchParams.set('token', authResult.accessToken);
      return { url: redirectUrl.toString() };
    } else {
      const redirectUrl = new URL(defaultSuccessUrl);
      redirectUrl.searchParams.set('token', authResult.accessToken);
      return { url: redirectUrl.toString() };
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate the password reset process' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.handleForgotPasswordRequest(forgotPasswordDto.email);
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset a user's password using a token" })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.handleResetPassword(resetPasswordDto);
    return { message: 'Your password has been successfully reset.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge user logout' })
  logout(): { message: string } {
    return { message: 'Logout acknowledged. Please clear your token.' };
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check auth status and get current user profile' })
  checkAuthStatus(@CurrentUser() user: UserDocument): SanitizedUser {
    if (!user) {
      throw new InternalServerErrorException(
        'User not found after JWT validation.',
      );
    }
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      roles: user.roles,
      is2FAEnabled: user.is2FAEnabled,
    };
  }
}
