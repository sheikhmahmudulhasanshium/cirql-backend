// src/auth/strategies/jwt.strategy.ts
import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt'; // Removed StrategyOptions import for now
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
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
        'JWT_SECRET is not defined in environment variables.',
      );
    }
    super({
      // Removed 'as StrategyOptions' cast
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      // passReqToCallback: false, // This is the default and makes types clearer if added
    });
  }

  async validate(payload: JwtPayload): Promise<UserDocument> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload.');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid.');
    }
    return user;
  }
}
