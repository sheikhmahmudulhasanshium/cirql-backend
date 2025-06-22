// src/auth/strategies/google.strategy.ts

import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile as GoogleProfile,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

// This type helps us define the structure of the params object from the callback
type GoogleOAuth2Params = {
  id_token: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>(
      'GOOGLE_CALLBACK_TO_BACKEND_URL',
    );

    if (!clientID || !clientSecret || !callbackURL) {
      throw new InternalServerErrorException(
        'Google OAuth environment variables are not configured correctly.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.googleClient = new OAuth2Client(clientID);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    params: GoogleOAuth2Params,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    // --- FIX: The eslint-disable comment has been removed ---
    const idToken = params.id_token;

    if (!idToken) {
      return done(
        new UnauthorizedException(
          'Google authentication failed: ID token not found.',
        ),
        false,
      );
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      if (ticket) {
        const payload: TokenPayload | undefined = ticket.getPayload();

        if (payload && payload.email && payload.sub) {
          // Payload is valid, proceed with login/user creation
          const user: UserDocument = await this.authService.validateOAuthLogin(
            payload.sub,
            payload.email,
            payload.given_name,
            payload.family_name,
            payload.picture,
          );

          return done(null, user);
        } else {
          // Payload exists but is missing required fields
          throw new UnauthorizedException(
            'Google authentication failed: Token payload is invalid or missing required fields.',
          );
        }
      } else {
        // Ticket itself is null or undefined, verification failed
        throw new UnauthorizedException('ID token could not be verified.');
      }
    } catch (err) {
      // Use a type assertion `as Error` to tell TypeScript that `err` has a `message` property.
      const errorMessage = (err as Error).message || 'Unknown error';
      this.logger.error(`Google ID Token verification failed: ${errorMessage}`);
      return done(
        new UnauthorizedException(
          'Google ID Token verification failed. Please try again.',
        ),
        false,
      );
    }
  }
}
