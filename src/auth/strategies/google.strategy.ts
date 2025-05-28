// src/auth/strategies/google.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile as GoogleProfile, // Renamed original Profile
  StrategyOptions,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new InternalServerErrorException(
        'Google OAuth environment variables are not properly configured.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    } as StrategyOptions);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile, // Use the (renamed) Profile type
    done: VerifyCallback,
  ): Promise<any> {
    const googleId = profile.id;

    // More robust (verbose) optional chaining
    const email =
      profile.emails && profile.emails[0] && profile.emails[0].value;
    const picture =
      profile.photos && profile.photos[0] && profile.photos[0].value;
    const firstName = profile.name && profile.name.givenName;
    const lastName = profile.name && profile.name.familyName;

    if (!googleId) {
      console.error(
        'Google profile missing id:',
        JSON.stringify(profile, null, 2),
      );
      return done(
        new InternalServerErrorException('Google profile is missing ID.'),
        false,
      );
    }
    if (!email) {
      console.error(
        'Google profile missing email:',
        JSON.stringify(profile, null, 2),
      );
      return done(
        new InternalServerErrorException('Email not provided by Google OAuth.'),
        false,
      );
    }

    try {
      const user: UserDocument = await this.authService.validateOAuthLogin(
        googleId,
        email,
        firstName,
        lastName,
        picture,
      );
      done(null, user);
    } catch (err) {
      console.error('Error during Google OAuth validation:', err);
      done(err, false);
    }
  }
}
