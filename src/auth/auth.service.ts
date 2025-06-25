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
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import {
  PasswordResetToken,
  PasswordResetToken as PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';
import { TwoFactorToken } from './schemas/two-factor-token.schema';
import { LoginDto } from './dto/login.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface JwtAccessPayload {
  email: string | undefined;
  sub: string;
  roles: Role[];
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
  userId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(PasswordResetToken.name)
    private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(TwoFactorToken.name)
    private twoFactorTokenModel: Model<TwoFactorToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<AuthTokenResponse | TwoFactorRequiredResponse> {
    const { email, password } = loginDto;
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.is2FAEnabled) {
      if (!user.email) {
        this.logger.error(`User ${user.id} has 2FA enabled but no email.`);
        throw new InternalServerErrorException(
          'Two-factor authentication cannot proceed without a verified email.',
        );
      }
      await this.generateAndSend2faCode(user);
      return { isTwoFactorRequired: true, userId: user.id as string };
    }

    await this.usersService.updateLastLogin(user._id);
    return this.getFullAccessToken(user);
  }

  async loginWith2faCode(login2faDto: Login2faDto): Promise<AuthTokenResponse> {
    const { userId, code } = login2faDto;
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user for 2FA verification.');
    }

    const twoFactorToken = await this.twoFactorTokenModel.findOne({ userId });
    if (!twoFactorToken) {
      throw new UnauthorizedException('2FA code not found or expired.');
    }

    if (new Date() > twoFactorToken.expiresAt) {
      await twoFactorToken.deleteOne();
      throw new UnauthorizedException(
        '2FA code has expired. Please log in again.',
      );
    }

    const isCodeMatch = await bcrypt.compare(code, twoFactorToken.token);
    if (!isCodeMatch) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    await twoFactorToken.deleteOne();
    await this.usersService.updateLastLogin(user._id);
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
    if (!user.password) {
      throw new ForbiddenException(
        'Cannot disable 2FA for accounts without a password.',
      );
    }
    const isPasswordMatch = await bcrypt.compare(
      disable2faDto.password,
      user.password,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password.');
    }
    await this.usersService.set2FA(user._id.toString(), false);
    await this.auditService.createLog({
      actor: user,
      action: AuditAction.TFA_DISABLED,
      targetId: user._id,
      targetType: 'User',
    });
  }

  private async generateAndSend2faCode(user: UserDocument): Promise<void> {
    if (!user.email) return;

    await this.twoFactorTokenModel.deleteMany({ userId: user._id });

    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.twoFactorTokenModel.create({
      userId: user._id,
      token: hashedCode,
      expiresAt,
    });

    await this.emailService.sendTwoFactorLoginCodeEmail(user.email, code);
  }

  getFullAccessToken(user: UserDocument): AuthTokenResponse {
    const payload: JwtAccessPayload = {
      email: user.email,
      sub: user._id.toString(),
      roles: user.roles,
      isTwoFactorAuthenticationComplete: true,
    };
    const accessToken = this.jwtService.sign(payload);

    // This manual construction is the most robust way to satisfy the linter.
    const sanitizedUser: SanitizedUser = {
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

    return { accessToken, user: sanitizedUser };
  }

  async handleForgotPasswordRequest(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user || user.googleId) {
      this.logger.warn(
        `Password reset requested for non-existent or OAuth user: ${email}. Responding with generic success to prevent enumeration.`,
      );
      return;
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await this.passwordResetTokenModel.create({
      userId: user._id,
      token: hashedToken,
      expiresAt,
    });
    await this.emailService.sendPasswordResetEmail(email, rawToken);
  }

  async handleResetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token: rawToken, password } = resetPasswordDto;
    const potentialTokens = await this.passwordResetTokenModel
      .find({ expiresAt: { $gt: new Date() } })
      .populate('userId');
    let validTokenDoc: PasswordResetTokenDocument | null = null;
    for (const doc of potentialTokens) {
      if (await bcrypt.compare(rawToken, doc.token)) {
        validTokenDoc = doc;
        break;
      }
    }
    if (!validTokenDoc || !validTokenDoc.userId) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    const user = await this.usersService.findById(validTokenDoc.userId);
    if (!user) {
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
      let user = await this.usersService.findOneByEmail(email);
      let isNewUser = false;

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
      isNewUser = true;
      const newUser = await this.usersService.create({
        googleId,
        email,
        firstName,
        lastName,
        picture,
      });

      if (isNewUser) {
        this.logger.log(`Performing post-creation actions for ${newUser.id}`);
        const welcomeName = newUser.firstName || 'there';

        const userSettings = await this.settingsService.findOrCreateByUserId(
          newUser._id.toString(),
        );

        await this.notificationsService.createNotification({
          userId: newUser._id,
          title: 'Welcome to Cirql! 🎉',
          message:
            'We are thrilled to have you on board. Explore your profile to get started.',
          type: NotificationType.WELCOME,
          linkUrl: '/profile/me',
        });

        if (
          newUser.email &&
          userSettings.notificationPreferences.emailNotifications
        ) {
          await this.emailService.sendWelcomeEmail(newUser.email, welcomeName);
        }
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
