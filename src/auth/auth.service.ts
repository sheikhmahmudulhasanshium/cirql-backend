import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { EmailService } from '../email/email.service';
import {
  PasswordResetToken,
  PasswordResetToken as PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from './encryption.service';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';

export interface SanitizedUser {
  _id: Types.ObjectId;
  email: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  picture: string | undefined;
  roles: Role[];
  is2FAEnabled: boolean;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: SanitizedUser;
}

export interface PartialAuthTokenResponse {
  accessToken: string;
  isTwoFactorRequired: true;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(PasswordResetToken.name)
    private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  login(user: UserDocument): AuthTokenResponse | PartialAuthTokenResponse {
    if (user.is2FAEnabled) {
      const payload = {
        sub: user._id.toString(),
        isTwoFactorAuthenticationComplete: false,
      };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '5m' });
      return { accessToken, isTwoFactorRequired: true };
    }
    return this.getFullAccessToken(user);
  }

  async loginWith2fa(user: UserDocument): Promise<AuthTokenResponse> {
    await this.usersService.updateLastLogin(user._id);
    return this.getFullAccessToken(user);
  }

  private getFullAccessToken(user: UserDocument): AuthTokenResponse {
    const payload = {
      email: user.email,
      sub: user._id.toString(),
      roles: user.roles,
      isTwoFactorAuthenticationComplete: true,
    };
    const accessToken = this.jwtService.sign(payload);
    const sanitizedUser: SanitizedUser = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      roles: user.roles,
      is2FAEnabled: user.is2FAEnabled,
    };
    return { accessToken, user: sanitizedUser };
  }

  async generateTwoFactorSecret(user: UserDocument): Promise<{
    secret: string;
    otpAuthUrl: string;
  }> {
    if (!user.email) {
      throw new BadRequestException(
        'User email is required to generate a 2FA secret.',
      );
    }
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Cirql', secret);
    const encryptedSecret = this.encryptionService.encrypt(secret);
    await this.usersService.setTwoFactorSecret(
      user._id.toString(),
      encryptedSecret,
    );
    return { secret, otpAuthUrl };
  }

  async generateQrCodeDataURL(otpAuthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpAuthUrl);
  }

  async isTwoFactorCodeValid(
    twoFactorCode: string,
    user: UserDocument,
  ): Promise<boolean> {
    this.logger.debug(`Validating 2FA code for user ${user.id}`);
    if (!user.twoFactorAuthSecret) {
      this.logger.warn(`User ${user.id} has no 2FA secret for validation.`);
      return false;
    }

    const decryptedSecret = this.encryptionService.decrypt(
      user.twoFactorAuthSecret,
    );
    const isTotpValid = authenticator.verify({
      token: twoFactorCode,
      secret: decryptedSecret,
    });

    if (isTotpValid) {
      this.logger.log(`User ${user.id} provided a valid TOTP code.`);
      return true;
    }
    this.logger.debug(
      `User ${user.id} provided an invalid TOTP code. Checking backup codes...`,
    );

    if (
      user.twoFactorAuthBackupCodes &&
      user.twoFactorAuthBackupCodes.length > 0
    ) {
      for (let i = 0; i < user.twoFactorAuthBackupCodes.length; i++) {
        const hashedCode = user.twoFactorAuthBackupCodes[i];
        if (await bcrypt.compare(twoFactorCode, hashedCode)) {
          this.logger.log(
            `User ${user.id} provided a valid backup code. Invalidating it now.`,
          );
          await this.usersService.invalidateBackupCode(user._id, i);
          return true;
        }
      }
    }

    this.logger.warn(
      `All validation failed for user ${user.id}. Code is invalid.`,
    );
    return false;
  }

  async enableTwoFactorAuth(
    requestingUser: UserDocument,
    twoFactorCode: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.usersService.findByIdWith2FASecret(
      requestingUser._id.toString(),
    );
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.is2FAEnabled) {
      throw new BadRequestException('2FA is already enabled.');
    }
    if (!user.twoFactorAuthSecret) {
      throw new BadRequestException(
        '2FA secret not found. Please generate a new QR code and start over.',
      );
    }
    const isCodeValid = await this.isTwoFactorCodeValid(twoFactorCode, user);
    if (!isCodeValid) {
      throw new BadRequestException('Invalid authentication code.');
    }
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );
    this.logger.log(`Generating and hashing backup codes for user ${user.id}`);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );
    await this.usersService.enable2FA(user._id.toString(), hashedBackupCodes);
    await this.auditService.createLog({
      actor: user,
      action: AuditAction.TFA_ENABLED,
      targetId: user._id,
      targetType: 'User',
    });
    return { backupCodes };
  }

  async disableTwoFactorAuth(
    requestingUser: UserDocument,
    twoFactorCode: string,
  ): Promise<void> {
    const user = await this.usersService.findByIdWith2FASecret(
      requestingUser._id.toString(),
    );
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (!user.is2FAEnabled) {
      throw new BadRequestException('2FA is not currently enabled.');
    }
    const isCodeValid = await this.isTwoFactorCodeValid(twoFactorCode, user);
    if (!isCodeValid) {
      throw new UnauthorizedException(
        'Invalid authentication code. Cannot disable 2FA.',
      );
    }
    await this.usersService.disable2FA(user._id.toString());
    await this.auditService.createLog({
      actor: user,
      action: AuditAction.TFA_DISABLED,
      targetId: user._id,
      targetType: 'User',
    });
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
      .find({
        expiresAt: { $gt: new Date() },
      })
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
      return this.usersService.create({
        googleId,
        email,
        firstName,
        lastName,
        picture,
      });
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
