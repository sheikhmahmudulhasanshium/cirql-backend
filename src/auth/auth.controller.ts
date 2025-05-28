// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Req,
  UseGuards,
  Redirect,
  HttpStatus,
  Query,
  InternalServerErrorException,
  Logger, // For better logging
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokenResponse, SanitizedUser } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../users/schemas/user.schema'; // Adjust path if needed
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Types } from 'mongoose';

interface AuthenticatedRequest extends ExpressRequest {
  user?: UserDocument | SanitizedUser; // From Passport & JWT Strategy
}

interface OAuthStatePayload {
  finalRedirectUri: string;
}

function getAllowedFrontendOrigins(configService: ConfigService): string[] {
  const originsString = configService.get<string>('ALLOWED_FRONTEND_ORIGINS');
  if (originsString) {
    return originsString
      .split(',')
      .map((origin) => origin.trim().toLowerCase())
      .filter(Boolean);
  }
  const primaryFrontendUrl = configService.get<string>('FRONTEND_URL');
  const defaultAllowed = [
    primaryFrontendUrl
      ? new URL(primaryFrontendUrl).origin.toLowerCase()
      : undefined,
    'http://localhost:3000',
  ].filter(
    (origin): origin is string =>
      typeof origin === 'string' && origin.length > 0,
  );

  if (defaultAllowed.length === 0 && process.env.NODE_ENV !== 'test') {
    // Using the global Logger here as 'this.logger' isn't available in a standalone function
    Logger.warn(
      '[AuthUtils] ALLOWED_FRONTEND_ORIGINS not set and FRONTEND_URL did not yield a valid origin. This might cause redirect issues.',
      'getAllowedFrontendOrigins',
    );
  }
  return defaultAllowed;
}

function isValidFrontendCallbackUrl(
  urlToTest: string | undefined,
  configService: ConfigService,
  logger: Logger, // Pass logger instance
): boolean {
  if (!urlToTest) return false;
  try {
    const parsedUrl = new URL(urlToTest.toLowerCase());
    const allowedOrigins = getAllowedFrontendOrigins(configService);

    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'test') {
      logger.warn(
        // Use passed logger
        '[AuthUtils] No allowed frontend origins configured for validation.',
        'isValidFrontendCallbackUrl',
      );
      return false;
    }

    const isValid =
      allowedOrigins.includes(parsedUrl.origin) &&
      parsedUrl.pathname === '/auth/google/callback';
    if (!isValid) {
      logger.warn(
        // Use passed logger
        `[AuthUtils] URL from state ('${urlToTest}') is not valid or not in allowed origins: ${allowedOrigins.join(', ')}`,
        'isValidFrontendCallbackUrl',
      );
    }
    return isValid;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.warn(
      // Use passed logger
      `[AuthUtils] Error parsing or validating URL from state: '${urlToTest}'. Error: ${errorMessage}`,
      e instanceof Error ? e.stack : undefined, // Pass stack if Error instance
      'isValidFrontendCallbackUrl',
    );
    return false;
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {
    // <--- REMOVED 'async' KEYWORD
    this.logger.log('Initiating Google OAuth flow...');
    // AuthGuard('google') handles the redirection.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL for backend processing' })
  @Redirect()
  googleAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Query('state') state?: string,
  ): { url: string; statusCode: number } {
    this.logger.log(
      `Received Google callback. User from Passport: ${req.user ? (req.user as UserDocument).email : 'null'}. State: ${state}`,
    );
    const user = req.user as UserDocument;

    let finalFrontendCallbackUriFromState: string | undefined;

    if (state) {
      try {
        const parsedJson: unknown = JSON.parse(decodeURIComponent(state));
        if (
          typeof parsedJson === 'object' &&
          parsedJson !== null &&
          'finalRedirectUri' in parsedJson &&
          typeof (parsedJson as { finalRedirectUri: unknown })
            .finalRedirectUri === 'string'
        ) {
          const potentialUri = (parsedJson as OAuthStatePayload)
            .finalRedirectUri;
          if (
            isValidFrontendCallbackUrl(
              // Pass this.logger here
              potentialUri,
              this.configService,
              this.logger,
            )
          ) {
            finalFrontendCallbackUriFromState = potentialUri;
            this.logger.log(
              `Successfully parsed and validated finalRedirectUri from state: ${finalFrontendCallbackUriFromState}`,
            );
          }
        } else {
          this.logger.warn(
            `Parsed state does not match expected OAuthStatePayload structure: ${JSON.stringify(parsedJson)}`,
          );
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        this.logger.warn(
          `Failed to parse state parameter: '${state}'. Error: ${errorMessage}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
    }

    const primaryFrontendCallbackUrl = `${this.configService.get<string>('FRONTEND_URL')!}/auth/google/callback`;
    const targetFrontendCallbackUrl =
      finalFrontendCallbackUriFromState || primaryFrontendCallbackUrl;

    if (!user) {
      this.logger.error(
        'User not found in request after Google OAuth processing. This indicates an issue with the Passport strategy or guard.',
      );
      const errorRedirectUrl = new URL(targetFrontendCallbackUrl);
      errorRedirectUrl.search = '';
      errorRedirectUrl.pathname = '/login';
      errorRedirectUrl.searchParams.set(
        'error',
        'authenticationFailedAfterOAuth',
      );
      this.logger.log(
        `Redirecting to error URL: ${errorRedirectUrl.toString()}`,
      );
      return { url: errorRedirectUrl.toString(), statusCode: HttpStatus.FOUND };
    }

    try {
      const tokenResponse: AuthTokenResponse = this.authService.login(user);

      const successRedirectUrl = new URL(targetFrontendCallbackUrl);
      successRedirectUrl.search = '';
      successRedirectUrl.searchParams.set('token', tokenResponse.accessToken);

      this.logger.log(
        `Successfully generated token. Redirecting to frontend: ${successRedirectUrl.toString()}`,
      );
      return {
        url: successRedirectUrl.toString(),
        statusCode: HttpStatus.FOUND,
      };
    } catch (error) {
      // No need for ': any' if you type check
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error during token generation';
      const errorStack = error instanceof Error ? error.stack : undefined; // Get stack if available
      this.logger.error(
        `Error during token generation or final redirect construction: ${errorMessage}`,
        errorStack, // Log the stack
      );
      const errorRedirectUrl = new URL(targetFrontendCallbackUrl);
      errorRedirectUrl.search = '';
      errorRedirectUrl.pathname = '/login';
      errorRedirectUrl.searchParams.set('error', 'tokenGenerationFailed');
      this.logger.log(
        `Redirecting to error URL after token error: ${errorRedirectUrl.toString()}`,
      );
      return { url: errorRedirectUrl.toString(), statusCode: HttpStatus.FOUND };
    }
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check authentication status and get user profile' })
  checkAuthStatus(@Req() req: AuthenticatedRequest): SanitizedUser {
    const userDocument = req.user as UserDocument;
    this.logger.log(
      `Status check for user: ${userDocument ? userDocument.email : 'No user found in JWT'}`,
    );

    if (!userDocument) {
      throw new InternalServerErrorException(
        'User not found in request after JWT validation.',
      );
    }
    if (typeof userDocument.toObject !== 'function') {
      this.logger.error(
        'User object from JWT strategy does not have toObject method:',
        userDocument,
      );
      throw new InternalServerErrorException('Invalid user object structure.');
    }
    const plainUserObject = userDocument.toObject<
      User & { _id: Types.ObjectId }
    >();
    if (!plainUserObject._id) {
      this.logger.error(
        'User object is missing _id after toObject():',
        plainUserObject,
      );
      throw new InternalServerErrorException(
        'User ID missing after processing.',
      );
    }

    return {
      _id: plainUserObject._id,
      email: plainUserObject.email,
      firstName: plainUserObject.firstName,
      lastName: plainUserObject.lastName,
      picture: plainUserObject.picture,
    };
  }
}
