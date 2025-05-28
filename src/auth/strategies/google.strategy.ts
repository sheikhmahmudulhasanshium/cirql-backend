import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile as GoogleProfile,
  StrategyOptions,
  StrategyOptionsWithRequest, // Attempt to use this for passReqToCallback: true
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema'; // Adjust path if needed
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
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
        'Google OAuth environment variables (ID, SECRET, or GOOGLE_CALLBACK_TO_BACKEND_URL) are not properly configured.',
      );
    }

    // Prefer StrategyOptionsWithRequest if your @types/passport-google-oauth20 supports it well
    // otherwise, StrategyOptions should work if its definition of passReqToCallback is boolean.
    const strategyOptions: StrategyOptionsWithRequest | StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL, // This is where Google redirects TO THIS BACKEND
      scope: ['email', 'profile'],
      passReqToCallback: true, // To make `state` available via `req.query` if needed directly here,
      // but primarily ensures Google passes it through to the callback URL
      // which AuthController will then access.
    };

    super(strategyOptions);
  }

  async validate(
    req: Request, // `req` is available due to passReqToCallback: true
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    // The `state` parameter sent by the frontend in the initial /auth/google?state=...
    // will be passed back by Google in the query string to this backend callback.
    // We will access it in the AuthController using @Query('state').

    const googleId = profile.id;
    const email = profile.emails?.[0]?.value || profile._json?.email;
    const firstName = profile._json?.given_name;
    const lastName = profile._json?.family_name;
    const picture = profile._json?.picture;

    if (!googleId) {
      console.error(
        '[GoogleStrategy] Google profile missing id:',
        JSON.stringify(profile, null, 2),
      );
      return done(
        new InternalServerErrorException('Google profile is missing ID.'),
        false,
      );
    }

    if (!email) {
      console.error(
        '[GoogleStrategy] Google profile missing email:',
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
      // Passport will attach this 'user' object to req.user in the AuthController
      done(null, user);
    } catch (err) {
      console.error('[GoogleStrategy] Error during OAuth validation:', err);
      done(err, false);
    }
  }
}
