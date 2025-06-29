import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/schemas/user.schema';

export interface Jwt2faPayload {
  sub: string;
  isTwoFactorAuthenticationComplete: boolean;
}

@Injectable()
export class Jwt2faStrategy extends PassportStrategy(Strategy, 'jwt-2fa') {
  private readonly logger = new Logger(Jwt2faStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      console.error(
        '[Jwt2faStrategy] CRITICAL: JWT_SECRET is not defined in the environment. This strategy will not function.',
      );
      throw new InternalServerErrorException(
        'JWT_SECRET is not defined for jwt-2fa strategy.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    this.logger.debug('Jwt2faStrategy initialized.');
  }

  async validate(payload: Jwt2faPayload): Promise<UserDocument> {
    this.logger.debug(
      `Validating JWT 2FA payload for user sub: ${payload.sub}`,
    );

    if (payload.isTwoFactorAuthenticationComplete) {
      this.logger.warn(
        `User ${payload.sub} attempted to use a fully authenticated token for 2FA step.`,
      );
      throw new UnauthorizedException(
        'This token is not valid for 2FA step-up verification.',
      );
    }

    let user: UserDocument | null = null;
    try {
      // --- THE FIX: Use the `findByIdForAuth` method ---
      // This method from your UsersService correctly selects the sensitive 2FA
      // fields (+twoFactorAuthenticationCode, etc.) from the database.
      user = await this.usersService.findByIdForAuth(payload.sub);
      // --- END OF FIX ---

      if (!user) {
        this.logger.warn(
          `User not found for 2FA validation with sub: ${payload.sub}`,
        );
        throw new UnauthorizedException('User not found based on token sub.');
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Unknown error during user validation';
      if (!(e instanceof UnauthorizedException)) {
        this.logger.error(
          `Error during 2FA user validation for sub ${payload.sub}: ${errorMessage}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
      if (e instanceof UnauthorizedException) {
        throw e;
      } else if (e instanceof Error && e.name === 'CastError') {
        this.logger.warn(
          `Invalid ID format for 2FA user validation: ${payload.sub}`,
        );
        throw new UnauthorizedException('Invalid user identifier format.');
      }
      throw new UnauthorizedException('User validation failed for 2FA.');
    }

    if (!user.is2FAEnabled) {
      this.logger.warn(
        `User ${user.email} (sub: ${user._id.toString()}) attempted 2FA, but 2FA is not enabled.`,
      );
      throw new UnauthorizedException('2FA is not enabled for this user.');
    }

    return user;
  }
}
