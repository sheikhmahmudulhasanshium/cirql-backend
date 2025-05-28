// src/auth/strategies/google.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile as GoogleProfile, // Keep the alias for clarity
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
      passReqToCallback: false, // This is fine
    } as StrategyOptions); // Cast to StrategyOptions if strictness demands it
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile, // Using the aliased GoogleProfile
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, photos, name, _json } = profile; // Destructure for easier access

    // console.log('Google Profile:', JSON.stringify(profile, null, 2)); // Helpful for debugging in Vercel logs

    const googleId = id;

    // Use optional chaining more defensively and access _json if direct properties are problematic
    const email = emails?.[0]?.value || _json?.email;
    const picture = photos?.[0]?.value || _json?.picture;
    const firstName = name?.givenName || _json?.given_name;
    const lastName = name?.familyName || _json?.family_name;

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
      // It's possible the email is in _json.email_verified if the primary one is missing
      // but for now, let's assume primary email is required.
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
