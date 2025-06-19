import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/schemas/user.schema';

export interface Jwt2faPayload {
  sub: string;
  isTwoFactorAuthenticationComplete: false;
}

@Injectable()
export class Jwt2faStrategy extends PassportStrategy(Strategy, 'jwt-2fa') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new InternalServerErrorException(
        'JWT_SECRET is not defined in the environment.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: Jwt2faPayload): Promise<UserDocument> {
    if (payload.isTwoFactorAuthenticationComplete) {
      throw new UnauthorizedException(
        'This token is not valid for 2FA verification.',
      );
    }

    const user = await this.usersService.findByIdWith2FASecret(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found or token is invalid.');
    }

    if (!user.is2FAEnabled) {
      throw new UnauthorizedException('2FA is not enabled for this user.');
    }

    return user;
  }
}
