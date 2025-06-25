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
    profile: GoogleProfile,
  ): Promise<UserDocument> {
    this.logger.debug(
      `Validating Google profile for: ${
        typeof profile.displayName === 'string'
          ? profile.displayName
          : 'Unknown'
      }`,
    );

    try {
      const tokenInfo = await this.googleClient.getTokenInfo(accessToken);
      const email = tokenInfo.email;
      const googleId = tokenInfo.sub;

      if (!email || !googleId) {
        throw new UnauthorizedException(
          'Could not retrieve valid email or user ID from Google token.',
        );
      }

      const firstName: string | undefined =
        profile.name && typeof profile.name.givenName === 'string'
          ? profile.name.givenName
          : undefined;

      const lastName: string | undefined =
        profile.name && typeof profile.name.familyName === 'string'
          ? profile.name.familyName
          : undefined;

      const picture: string | undefined =
        profile.photos &&
        Array.isArray(profile.photos) &&
        profile.photos.length > 0 &&
        profile.photos[0] &&
        typeof profile.photos[0].value === 'string'
          ? profile.photos[0].value
          : undefined;

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
