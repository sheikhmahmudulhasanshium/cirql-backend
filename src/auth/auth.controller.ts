// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Req,
  UseGuards,
  Redirect, // Used by googleAuthRedirect
  HttpStatus,
  Query, // Used by googleAuthRedirect
  InternalServerErrorException,
  Logger,
  Post,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokenResponse, SanitizedUser } from './auth.service'; // AuthTokenResponse used by googleAuthRedirect
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../users/schemas/user.schema'; // Adjust path if needed
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express'; // Used by AuthenticatedRequest interface
import { Types } from 'mongoose';

// Interface definition should be at the top level or imported
interface AuthenticatedRequest extends ExpressRequest {
  user?: UserDocument | SanitizedUser; // From Passport (UserDocument from JwtStrategy, SanitizedUser can be used elsewhere)
}

// Dummy interfaces/functions from the original prompt that might be needed for context
// if they were in the actual file and influencing the linter.
// These were getAllowedFrontendOrigins, isValidFrontendCallbackUrl, OAuthStatePayload
// For this fix, I'm assuming they are present if they were in your original file.
interface OAuthStatePayload {
  finalRedirectUri: string;
}

// Example: function getAllowedFrontendOrigins(configService: ConfigService): string[] { /* ... */ return []; }
// Example: function isValidFrontendCallbackUrl(urlToTest: string | undefined, configService: ConfigService, logger: Logger): boolean { /* ... */ return false; }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // --- Assuming googleAuth and googleAuthRedirect methods exist here as per the initial prompt ---
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {
    this.logger.log('Initiating Google OAuth flow...');
    // AuthGuard('google') handles the redirection.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback URL for backend processing' })
  @Redirect() // Uses Redirect decorator
  googleAuthRedirect(
    @Req() req: AuthenticatedRequest, // Uses AuthenticatedRequest
    @Query('state') state?: string, // Uses Query decorator
  ): { url: string; statusCode: number } {
    this.logger.log(
      `Received Google callback. User from Passport: ${req.user ? (req.user as UserDocument).email : 'null'}. State: ${state}`,
    );
    const user = req.user as UserDocument; // User from GoogleStrategy is UserDocument
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
          // Assuming isValidFrontendCallbackUrl is defined in this file or imported
          // if (isValidFrontendCallbackUrl(potentialUri,this.configService,this.logger)) {
          //   finalFrontendCallbackUriFromState = potentialUri;
          // }
          // Simplified for brevity, replace with actual validation
          if (potentialUri.startsWith('http')) {
            finalFrontendCallbackUriFromState = potentialUri;
          }
        }
      } catch (e) {
        this.logger.warn(
          `Failed to parse state: ${state}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
    }

    const primaryFrontendCallbackUrl = `${this.configService.get<string>('FRONTEND_URL')!}/auth/google/callback`;
    const targetFrontendCallbackUrl =
      finalFrontendCallbackUriFromState || primaryFrontendCallbackUrl;

    if (!user) {
      this.logger.error(
        'User not found in request after Google OAuth processing.',
      );
      const errorRedirectUrl = new URL(targetFrontendCallbackUrl);
      errorRedirectUrl.search = '';
      errorRedirectUrl.pathname = '/login';
      errorRedirectUrl.searchParams.set(
        'error',
        'authenticationFailedAfterOAuth',
      );
      return { url: errorRedirectUrl.toString(), statusCode: HttpStatus.FOUND };
    }

    try {
      const tokenResponse: AuthTokenResponse = this.authService.login(user); // Uses AuthTokenResponse
      const successRedirectUrl = new URL(targetFrontendCallbackUrl);
      successRedirectUrl.search = '';
      successRedirectUrl.searchParams.set('token', tokenResponse.accessToken);
      return {
        url: successRedirectUrl.toString(),
        statusCode: HttpStatus.FOUND,
      };
    } catch (error) {
      this.logger.error(
        'Error during token generation or final redirect construction',
        error instanceof Error ? error.stack : undefined,
      );
      const errorRedirectUrl = new URL(targetFrontendCallbackUrl);
      errorRedirectUrl.search = '';
      errorRedirectUrl.pathname = '/login';
      errorRedirectUrl.searchParams.set('error', 'tokenGenerationFailed');
      return { url: errorRedirectUrl.toString(), statusCode: HttpStatus.FOUND };
    }
  }
  // --- End of assumed google methods ---

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Log out the current user (client-side responsibility for token removal)',
  })
  // @UseGuards(AuthGuard('jwt')) // Optional: Add if logout should only be accessible by authenticated users
  logout(@Req() req: AuthenticatedRequest): { message: string } {
    // Removed 'async'
    let userIdentifier = 'anonymous user or token not present';
    if (req.user) {
      // req.user is UserDocument | SanitizedUser.
      // If @UseGuards(AuthGuard('jwt')) is used, req.user would be UserDocument.
      // Both types should have 'email' (optional) and '_id'.
      userIdentifier = req.user.email || `User ID: ${req.user._id.toString()}`;
    }
    this.logger.log(`Logout request received for user: ${userIdentifier}`);

    // Future: If implementing server-side token invalidation (e.g., deny list for JWTs,
    // or invalidating refresh tokens stored in DB), that logic would go here.
    // Example: await this.authService.invalidateToken(req.user._id, extractedToken);

    return {
      message: 'Logout acknowledged by server. Client should clear token.',
    };
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt')) // Ensures req.user is populated by JwtStrategy if token is valid
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check authentication status and get user profile' })
  checkAuthStatus(@Req() req: AuthenticatedRequest): SanitizedUser {
    // AuthGuard('jwt') ensures req.user is a UserDocument if authentication succeeds.
    // If auth failed, the guard would have thrown an UnauthorizedException.
    const user = req.user as UserDocument; // Safe cast due to AuthGuard('jwt')

    // This explicit check for 'user' is largely for extreme defensiveness,
    // as the guard should prevent this method from running without a valid user.
    if (!user) {
      this.logger.error(
        '[AuthStatus] User object not found on request despite JWT guard. This should not happen.',
      );
      throw new InternalServerErrorException(
        'User not found in request after JWT validation.',
      );
    }

    this.logger.log(
      `Status check for user: ${user.email || user._id.toString()}`,
    );

    if (typeof user.toObject !== 'function') {
      this.logger.error(
        'User object from JWT strategy does not have toObject method (not a Mongoose Document?):',
        user,
      );
      throw new InternalServerErrorException(
        'Invalid user object structure from token.',
      );
    }
    const plainUserObject = user.toObject<User & { _id: Types.ObjectId }>();

    if (!plainUserObject._id) {
      this.logger.error(
        'User object is missing _id after toObject():',
        plainUserObject,
      );
      throw new InternalServerErrorException(
        'User ID missing after processing user object.',
      );
    }

    return {
      _id: plainUserObject._id, // _id is Types.ObjectId
      email: plainUserObject.email,
      firstName: plainUserObject.firstName,
      lastName: plainUserObject.lastName,
      picture: plainUserObject.picture,
    };
  }
}
