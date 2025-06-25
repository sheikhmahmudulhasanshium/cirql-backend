// src/auth/strategies/google.strategy.ts

import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema';
import { OAuth2Client } from 'google-auth-library';

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
    profile: GoogleProfile, // Use the base type
  ): Promise<UserDocument> {
    this.logger.debug(`Validating Google profile for: ${profile.displayName}`);

    try {
      const tokenInfo = await this.googleClient.getTokenInfo(accessToken);
      const email = tokenInfo.email;
      const googleId = tokenInfo.sub;

      if (!email || !googleId) {
        throw new UnauthorizedException(
          'Could not retrieve valid email or user ID from Google token.',
        );
      }

      // Safely access potentially optional properties
      const firstName = profile.name?.givenName;
      const lastName = profile.name?.familyName;
      const picture = profile.photos?.[0]?.value;

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
