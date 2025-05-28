// src/auth/strategies/google.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile as GoogleProfile, // Keep using this alias
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
    profile: GoogleProfile, // Using the aliased GoogleProfile
    done: VerifyCallback,
  ): Promise<any> {
    // Log the profile to see its actual structure in Vercel logs if issues persist
    // console.log('Google Profile Received:', JSON.stringify(profile, null, 2));

    const googleId = profile.id; // 'id' is usually guaranteed on the Profile type

    // 'emails' is generally reliable as an array on the Profile type
    const email = profile.emails?.[0]?.value;

    // Access name and photos primarily from _json which is usually more stable.
    // The 'profile.name' and 'profile.photos' on the base Profile type can be optional or less structured.
    // The _json object often has these with consistent naming.
    const firstName = profile._json?.given_name;
    const lastName = profile._json?.family_name;
    const picture = profile._json?.picture;

    // Fallback if _json doesn't have them, but Profile type itself might (though it caused errors)
    // We can make these fallbacks conditional to avoid 'any' if possible.
    // However, for now, let's prioritize _json and assume it's sufficient.
    // If you find _json is missing these, we'll need to see the logged 'profile' object.

    // const alternativeFirstName = profile.name?.givenName; // If Profile.name is typed
    // const alternativeLastName = profile.name?.familyName;   // If Profile.name is typed
    // const alternativePicture = profile.photos?.[0]?.value; // If Profile.photos is typed

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

    // If primary email from profile.emails is missing, try _json.email
    // Also consider checking profile._json.email_verified if that's important
    const finalEmail = email || profile._json?.email;

    if (!finalEmail) {
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
      // The types of firstName, lastName, picture will be string | undefined here,
      // which should be compatible with validateOAuthLogin's expected string | undefined.
      const user: UserDocument = await this.authService.validateOAuthLogin(
        googleId,
        finalEmail,
        firstName, // Now string | undefined
        lastName, // Now string | undefined
        picture, // Now string | undefined
      );
      done(null, user);
    } catch (err) {
      console.error('Error during Google OAuth validation:', err);
      done(err, false);
    }
  }
}
