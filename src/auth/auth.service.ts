// src/auth/auth.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';
import { LoginDto } from './dto/login.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/schemas/activity-log.schema';

interface Jwt2faPartialPayload {
  sub: string;
  isTwoFactorAuthenticationComplete: false;
}

interface JwtAccessPayload {
  sub: string;
  email: string | undefined;
  roles: Role[];
  firstName: string | undefined;
  lastName: string | undefined;
  picture: string | undefined;
  is2FAEnabled: boolean;
  accountStatus: string;
  isTwoFactorAuthenticationComplete: true;
}

export interface SanitizedUser {
  _id: Types.ObjectId;
  email: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  picture: string | undefined;
  roles: Role[];
  is2FAEnabled: boolean;
  accountStatus: string;
  banReason?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: SanitizedUser;
}

export interface TwoFactorRequiredResponse {
  isTwoFactorRequired: true;
  partialAccessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private static readonly MAX_2FA_ATTEMPTS = 5;

  constructor(
    @InjectModel(PasswordResetToken.name)
    private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly activityService: ActivityService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<AuthTokenResponse | TwoFactorRequiredResponse> {
    const { email, password } = loginDto;
    const user = await this.usersService.findOneByEmailForAuth(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.twoFactorLockoutUntil && new Date() < user.twoFactorLockoutUntil) {
      throw new ForbiddenException(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.is2FAEnabled) {
      if (!user.email) {
        throw new InternalServerErrorException(
          'Two-factor authentication cannot proceed without a verified email.',
        );
      }
      await this.generateAndSend2faCode(user);
      const { accessToken } = this.getPartialAccessToken(user);
      return { isTwoFactorRequired: true, partialAccessToken: accessToken };
    }

    await this.usersService.updateLastLogin(user);
    return this.getFullAccessToken(user);
  }

  async loginWith2faCode(
    user: UserDocument,
    code: string,
  ): Promise<AuthTokenResponse> {
    if (
      !user.is2FAEnabled ||
      !user.twoFactorAuthenticationCode ||
      !user.twoFactorAuthenticationCodeExpires
    ) {
      throw new UnauthorizedException('Invalid 2FA request.');
    }

    if (user.twoFactorLockoutUntil && new Date() < user.twoFactorLockoutUntil) {
      const minutesRemaining = Math.ceil(
        (user.twoFactorLockoutUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Please try again in ${minutesRemaining} minutes.`,
      );
    }

    if (new Date() > user.twoFactorAuthenticationCodeExpires) {
      throw new UnauthorizedException(
        'Code has expired. Please log in again to get a new code.',
      );
    }

    const isCodeMatch = await bcrypt.compare(
      code,
      user.twoFactorAuthenticationCode,
    );

    if (!isCodeMatch) {
      user.twoFactorAttempts = (user.twoFactorAttempts || 0) + 1;
      if (user.twoFactorAttempts >= AuthService.MAX_2FA_ATTEMPTS) {
        user.twoFactorLockoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        user.twoFactorAttempts = 0;
        await user.save();
        this.logger.warn(`User ${user.id} locked out due to 2FA failures.`);
        throw new ForbiddenException(
          'Too many failed attempts. Your account is locked for 24 hours for security.',
        );
      }
      await user.save();
      throw new UnauthorizedException('Invalid two-factor code.');
    }

    user.twoFactorAttempts = 0;
    user.twoFactorLockoutUntil = undefined;
    user.twoFactorAuthenticationCode = undefined;
    user.twoFactorAuthenticationCodeExpires = undefined;
    await user.save();

    await this.usersService.updateLastLogin(user);
    return this.getFullAccessToken(user);
  }

  async enableTwoFactorAuth(user: UserDocument): Promise<void> {
    if (user.is2FAEnabled) {
      throw new BadRequestException('2FA is already enabled.');
    }
    await this.usersService.set2FA(user._id.toString(), true);
    await this.auditService.createLog({
      actor: user,
      action: AuditAction.TFA_ENABLED,
      targetId: user._id,
      targetType: 'User',
    });
  }

  async disableTwoFactorAuth(
    user: UserDocument,
    disable2faDto: Disable2faDto,
  ): Promise<void> {
    if (!user.is2FAEnabled) {
      throw new BadRequestException('2FA is not enabled.');
    }

    const userWith2faSecret = await this.usersService.findByIdForAuth(user._id);
    if (
      !userWith2faSecret?.twoFactorAuthenticationCode ||
      !userWith2faSecret?.twoFactorAuthenticationCodeExpires
    ) {
      throw new BadRequestException(
        'No verification code has been issued. Please request a code first.',
      );
    }

    if (new Date() > userWith2faSecret.twoFactorAuthenticationCodeExpires) {
      throw new UnauthorizedException(
        'Code has expired. Please request a new code.',
      );
    }

    const isCodeMatch = await bcrypt.compare(
      disable2faDto.code,
      userWith2faSecret.twoFactorAuthenticationCode,
    );

    if (!isCodeMatch) {
      throw new UnauthorizedException('Invalid verification code.');
    }

    userWith2faSecret.is2FAEnabled = false;
    userWith2faSecret.twoFactorAuthenticationCode = undefined;
    userWith2faSecret.twoFactorAuthenticationCodeExpires = undefined;
    userWith2faSecret.twoFactorAttempts = 0;
    userWith2faSecret.twoFactorLockoutUntil = undefined;
    await userWith2faSecret.save();

    await this.auditService.createLog({
      actor: user,
      action: AuditAction.TFA_DISABLED,
      targetId: user._id,
      targetType: 'User',
    });
  }

  public async generateAndSend2faCode(user: UserDocument): Promise<void> {
    if (!user.email) return;

    // --- MODIFICATION: Generate 6-character alphanumeric code ---
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const randomBytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(randomBytes[i] % characters.length);
    }
    // --- END MODIFICATION ---

    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    user.twoFactorAuthenticationCode = hashedCode;
    user.twoFactorAuthenticationCodeExpires = expiresAt;
    user.twoFactorAttempts = 0;
    await user.save();

    await this.emailService.sendTwoFactorLoginCodeEmail(user.email, code);
  }

  getFullAccessToken(user: UserDocument): AuthTokenResponse {
    const payload: JwtAccessPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      is2FAEnabled: user.is2FAEnabled,
      accountStatus: user.accountStatus,
      isTwoFactorAuthenticationComplete: true,
    };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user: this.sanitizeUser(user) };
  }

  getPartialAccessToken(user: UserDocument): { accessToken: string } {
    const payload: Jwt2faPartialPayload = {
      sub: user._id.toString(),
      isTwoFactorAuthenticationComplete: false,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '5m' });
    return { accessToken };
  }

  sanitizeUser(user: UserDocument): SanitizedUser {
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      roles: user.roles,
      is2FAEnabled: user.is2FAEnabled,
      accountStatus: user.accountStatus,
      banReason: user.banReason,
    };
  }

  async handleForgotPasswordRequest(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmailForAuth(email);
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent user: ${email}.`,
      );
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetTokenModel.create({
      userId: user._id,
      token: hashedToken,
      expiresAt,
    });
    await this.emailService.sendPasswordResetEmail(email, rawToken);
  }

  async handleResetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token: rawToken, password } = resetPasswordDto;
    const potentialTokens = await this.passwordResetTokenModel.find({
      expiresAt: { $gt: new Date() },
    });
    let validTokenDoc: PasswordResetTokenDocument | null = null;
    for (const doc of potentialTokens) {
      if (await bcrypt.compare(rawToken, doc.token)) {
        validTokenDoc = doc;
        break;
      }
    }
    if (!validTokenDoc) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    const user = await this.usersService.findById(validTokenDoc.userId);
    if (!user) {
      await this.passwordResetTokenModel.findByIdAndDelete(validTokenDoc._id);
      throw new NotFoundException(
        'User associated with this token no longer exists.',
      );
    }
    user.password = password;
    await user.save();
    await this.passwordResetTokenModel.findByIdAndDelete(validTokenDoc._id);
  }

  async validateOAuthLogin(
    googleId: string,
    email: string,
    firstName: string | undefined,
    lastName: string | undefined,
    picture: string | undefined,
  ): Promise<UserDocument> {
    this.logger.log(`Validating OAuth login for email: ${email}`);
    try {
      let user = await this.usersService.findOneByEmailForAuth(email);
      if (user) {
        if (!user.googleId) user.googleId = googleId;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.picture = picture || user.picture;
        return user.save();
      }
      user = await this.usersService.findOneByGoogleId(googleId);
      if (user) {
        user.email = email;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.picture = picture || user.picture;
        return user.save();
      }
      this.logger.log(`Creating new user for email: ${email}`);
      const newUser = await this.usersService.create({
        googleId,
        email,
        firstName,
        lastName,
        picture,
      });

      try {
        await this.activityService.logEvent({
          userId: newUser._id,
          action: ActivityAction.USER_REGISTER,
        });
      } catch (logError) {
        this.logger.error(
          'Failed to log registration activity after user creation',
          logError,
        );
      }

      return newUser;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Error in validateOAuthLogin for ${email}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error processing OAuth login.');
    }
  }
}
