// src/auth/strategies/jwt.strategy.ts

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
import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  isTwoFactorAuthenticationComplete: true;
  iat: number; // 'iat' (issued at) is a standard claim.
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<UserDocument> {
    if (!payload.isTwoFactorAuthenticationComplete) {
      throw new UnauthorizedException(
        'Two-factor authentication has not been completed.',
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token is invalid.');
    }

    // If a 'tokensValidFrom' date exists, check if the token
    // was issued *before* that date. If so, it's revoked.
    if (
      user.tokensValidFrom &&
      payload.iat * 1000 < user.tokensValidFrom.getTime()
    ) {
      throw new UnauthorizedException('Token has been revoked.');
    }

    return user;
  }
}
