// src/auth/strategies/google.strategy.ts

import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20'; // Profile is no longer needed
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema';
import { OAuth2Client } from 'google-auth-library';

interface GoogleTokenPayload {
  email?: string;
  email_verified?: boolean;
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

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

  // This is the cleanest signature: we only declare the parameters we actually use.
  async validate(accessToken: string): Promise<UserDocument> {
    this.logger.debug(`Validating Google profile for email via token...`);

    try {
      const tokenInfo = (await this.googleClient.getTokenInfo(
        accessToken,
      )) as GoogleTokenPayload;

      const email = tokenInfo.email;
      const googleId = tokenInfo.sub;

      if (!email || !googleId) {
        throw new UnauthorizedException(
          'Could not retrieve valid email or user ID from Google token.',
        );
      }

      this.logger.debug(`Token validated for email: ${email}`);

      const firstName = tokenInfo.given_name;
      const lastName = tokenInfo.family_name;
      const picture = tokenInfo.picture;

      const user = await this.authService.validateOAuthLogin(
        googleId,
        email,
        firstName,
        lastName,
        picture,
      );

      return user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Google token validation failed: ${errorMessage}`,
        errorStack,
      );
      throw new UnauthorizedException('Failed to validate Google token.');
    }
  }
}
