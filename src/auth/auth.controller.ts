// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Redirect,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  HttpCode,
  Body,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  AuthService,
  AuthTokenResponse,
  SanitizedUser,
  TwoFactorRequiredResponse,
} from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../users/schemas/user.schema';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<AuthTokenResponse | TwoFactorRequiredResponse> {
    return this.authService.login(loginDto);
  }

  @Post('2fa/verify-code')
  @UseGuards(AuthGuard('jwt-2fa'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the 2FA email code to complete login' })
  loginWith2faCode(
    @CurrentUser() user: UserDocument,
    @Body() login2faDto: Login2faDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.loginWith2faCode(user, login2faDto.code);
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable email-based 2FA for the current user' })
  async enable2fa(@CurrentUser() user: UserDocument) {
    await this.authService.enableTwoFactorAuth(user);
    return { message: 'Two-factor authentication has been enabled.' };
  }

  // --- START OF FIX: NEW ENDPOINT ---
  @Post('2fa/request-disable-code')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a code to disable 2FA' })
  async requestDisable2faCode(@CurrentUser() user: UserDocument) {
    // This reuses the exact same logic as generating a login code.
    await this.authService.generateAndSend2faCode(user);
    return { message: 'A verification code has been sent to your email.' };
  }
  // --- END OF FIX: NEW ENDPOINT ---

  // --- START OF FIX: MODIFIED ENDPOINT ---
  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable email-based 2FA using a verification code',
  })
  async disable2fa(
    @CurrentUser() user: UserDocument,
    @Body() disable2faDto: Disable2faDto, // This DTO now expects a `code`
  ) {
    // The service now handles code verification instead of password checking.
    await this.authService.disableTwoFactorAuth(user, disable2faDto);
    return { message: 'Two-factor authentication has been disabled.' };
  }
  // --- END OF FIX: MODIFIED ENDPOINT ---

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  async googleAuthRedirect(
    @CurrentUser() user: UserDocument,
    @Query('state') state?: string,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL not configured.');
    }

    let finalRedirectUrl = `${frontendUrl}/auth/google/callback`;
    if (state) {
      try {
        const decodedState = JSON.parse(
          decodeURIComponent(state),
        ) as OAuthState;
        if (decodedState.finalRedirectUri) {
          finalRedirectUrl = decodedState.finalRedirectUri;
        }
      } catch (error) {
        this.logger.warn('Could not parse OAuth state parameter.', error);
      }
    }

    if (!user) {
      const errorUrl = new URL(`${frontendUrl}/sign-in`);
      errorUrl.searchParams.set('error', 'authenticationFailed');
      return { url: errorUrl.toString() };
    }

    const redirectUrl = new URL(finalRedirectUrl);

    if (user.is2FAEnabled) {
      await this.authService.generateAndSend2faCode(user);
      const { accessToken: partialToken } =
        this.authService.getPartialAccessToken(user);
      redirectUrl.searchParams.set('token', partialToken);
    } else {
      const authResult = this.authService.getFullAccessToken(user);
      redirectUrl.searchParams.set('token', authResult.accessToken);
    }

    return { url: redirectUrl.toString() };
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
  @ApiOperation({ summary: "Reset or set a user's password using a token" })
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
    return {
      message:
        'Logout acknowledged. Please clear your token on the client-side.',
    };
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
    return this.authService.sanitizeUser(user);
  }
}
