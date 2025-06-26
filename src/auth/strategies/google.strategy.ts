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

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

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
  }

  async validate(
    accessToken: string,
    refreshToken: string, // Often unused but required by the strategy's signature
    profile: GoogleProfile,
  ): Promise<UserDocument> {
    this.logger.debug(`Validating Google profile for: ${profile.displayName}`);

    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;

    if (!email || !googleId) {
      throw new UnauthorizedException(
        'Could not retrieve valid email or user ID from Google profile.',
      );
    }

    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;
    const picture = profile.photos?.[0]?.value;

    try {
      return await this.authService.validateOAuthLogin(
        googleId,
        email,
        firstName,
        lastName,
        picture,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Google validation failed: ${errorMessage}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new UnauthorizedException('Failed to validate Google profile.');
    }
  }
}
