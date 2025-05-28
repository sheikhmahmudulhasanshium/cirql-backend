// src/auth/strategies/google.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile, // Profile from 'passport-google-oauth20'
  StrategyOptions,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    // ... constructor same as before
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
    profile: Profile, // Profile from 'passport-google-oauth20'
    done: VerifyCallback,
  ): Promise<any> {
    // const { id, name, emails, photos } = profile; // Avoid direct destructuring of potentially undefined properties

    const googleId = profile.id; // 'id' is usually guaranteed
    const email = profile.emails?.[0]?.value;
    const picture = profile.photos?.[0]?.value;
    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;

    if (!googleId) {
      console.error('Google profile missing id:', profile);
      return done(
        new InternalServerErrorException('Google profile is missing ID.'),
        false,
      );
    }
    // Email is critical for your authService.validateOAuthLogin
    if (!email) {
      console.error('Google profile missing email:', profile);
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
