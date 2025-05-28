// src/auth/strategies/google.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile,
  StrategyOptions,
} from 'passport-google-oauth20'; // Import StrategyOptions
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema'; // Corrected import path

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
      // This should ideally be caught by Joi validation in AppModule at startup
      throw new InternalServerErrorException(
        'Google OAuth environment variables are not properly configured.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false, // Important for constructor overload selection
    } as StrategyOptions); // The cast is kept as passport-google-oauth20 options can be complex.
    // If TypeScript doesn't complain without it and it works, it can be removed.
    // Given passReqToCallback: false, StrategyOptions (without request) is the correct type.
  }

  async validate(
    accessToken: string,
    refreshToken: string, // refreshToken might be undefined depending on Google's response and your settings
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    // 'any' is acceptable here as 'done' callback handles final typing for Passport
    const { id, name, emails, photos } = profile;

    // Ensure emails and photos exist and have at least one entry
    const email = emails?.[0]?.value;
    const picture = photos?.[0]?.value;
    const firstName = name?.givenName;
    const lastName = name?.familyName;

    // accessToken and refreshToken can be stored if needed for future API calls to Google on behalf of the user
    // For example: const googleAuthData = { accessToken, refreshToken };

    try {
      // AuthService.validateOAuthLogin handles user creation/update logic
      const user: UserDocument = await this.authService.validateOAuthLogin(
        id, // googleId
        email,
        firstName,
        lastName,
        picture,
      );
      // The 'user' object (UserDocument) will be attached to req.user
      done(null, user);
    } catch (err) {
      // Pass error to Passport, which will typically result in a 500 or appropriate error response
      console.error('Error during Google OAuth validation:', err);
      done(err, false);
    }
  }
}
