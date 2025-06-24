// src/users/users.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { PublicProfileDto } from './dto/public-profile.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';
import { BanUserDto } from './dto/ban-user.dto';
import { EmailService } from '../email/email.service';

export type AdminUserListView = {
  _id: Types.ObjectId;
  email: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  accountStatus: string;
  roles: Role[];
  lastLogin: Date | null | undefined;
  is2FAEnabled: boolean;
};
export interface FindAllUsersResponse {
  data: AdminUserListView[];
  total: number;
  page: number;
  limit: number;
}
export interface FindPublicProfilesResponse {
  data: PublicProfileDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async findByIdWith2FASecret(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+twoFactorAuthSecret').exec();
  }
  async updateLastLogin(userId: Types.ObjectId): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { lastLogin: new Date() });
  }
  async setTwoFactorSecret(
    userId: string,
    secret: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { twoFactorAuthSecret: secret, is2FAEnabled: false },
      { new: true },
    );
  }
  async enable2FA(
    userId: string,
    hashedBackupCodes: string[],
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { is2FAEnabled: true, twoFactorAuthBackupCodes: hashedBackupCodes },
      { new: true },
    );
  }
  async disable2FA(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        is2FAEnabled: false,
        $unset: { twoFactorAuthSecret: '', twoFactorAuthBackupCodes: '' },
      },
      { new: true },
    );
  }
  async invalidateBackupCode(
    userId: Types.ObjectId,
    codeIndex: number,
  ): Promise<void> {
    const unsetField = `twoFactorAuthBackupCodes.${codeIndex}`;
    await this.userModel.updateOne(
      { _id: userId },
      { $unset: { [unsetField]: 1 } },
    );
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { twoFactorAuthBackupCodes: null } },
    );
  }

  async findAll(
    requestingUserRoles: Role[],
    accountStatus: string | undefined,
    page: number,
    limit: number,
  ): Promise<FindAllUsersResponse> {
    const filter: FilterQuery<UserDocument> = {};
    if (accountStatus) {
      filter.accountStatus = accountStatus;
    }
    const isAdmin = requestingUserRoles.some((role) =>
      [Role.Admin, Role.Owner].includes(role),
    );
    if (!isAdmin) {
      filter.accountStatus = 'active';
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    const sanitizedData: AdminUserListView[] = users.map((user) => ({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus,
      roles: user.roles,
      lastLogin: user.lastLogin,
      is2FAEnabled: user.is2FAEnabled,
    }));
    return { data: sanitizedData, total, page, limit };
  }

  async findPublicProfiles(
    page: number,
    limit: number,
  ): Promise<FindPublicProfilesResponse> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<UserDocument> = { accountStatus: 'active' };
    const [users, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    const sanitizedData: PublicProfileDto[] = users.map((user) => ({
      id: user._id.toHexString(),
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
    }));
    return { data: sanitizedData, total, page, limit };
  }

  async updateUserRoles(
    idToUpdate: string,
    updateUserRolesDto: UpdateUserRolesDto,
    requestingUser: UserDocument,
  ): Promise<UserDocument> {
    const userToUpdate = await this.findById(idToUpdate);
    if (!userToUpdate) {
      throw new NotFoundException(`User with ID "${idToUpdate}" not found.`);
    }
    if (userToUpdate.id === requestingUser.id) {
      throw new ForbiddenException('You cannot change your own roles.');
    }
    if (
      userToUpdate.roles.includes(Role.Owner) &&
      !requestingUser.roles.includes(Role.Owner)
    ) {
      throw new ForbiddenException(
        'Admins cannot modify the roles of an Owner.',
      );
    }
    if (
      updateUserRolesDto.roles.includes(Role.Owner) &&
      !requestingUser.roles.includes(Role.Owner)
    ) {
      throw new ForbiddenException(
        'Only an existing Owner can grant the Owner role.',
      );
    }
    const oldRoles = [...userToUpdate.roles];
    userToUpdate.roles = updateUserRolesDto.roles;
    const updatedUser = await userToUpdate.save();
    await this.auditService.createLog({
      actor: requestingUser,
      action: AuditAction.USER_ROLE_UPDATED,
      targetId: updatedUser._id,
      targetType: 'User',
      details: {
        before: { roles: oldRoles },
        after: { roles: updatedUser.roles },
      },
    });
    return updatedUser;
  }

  async banUser(
    idToBan: string,
    banUserDto: BanUserDto,
    requestingUser: UserDocument,
  ): Promise<UserDocument> {
    const userToBan = await this.findById(idToBan);
    if (!userToBan) {
      throw new NotFoundException(`User with ID "${idToBan}" not found.`);
    }
    if (userToBan.id === requestingUser.id) {
      throw new ForbiddenException('You cannot ban your own account.');
    }
    if (userToBan.roles.includes(Role.Owner)) {
      throw new ForbiddenException('The Owner account cannot be banned.');
    }

    userToBan.accountStatus = 'banned';
    userToBan.banReason = banUserDto.reason;
    const bannedUser = await userToBan.save();

    if (bannedUser.email) {
      await this.emailService.sendAccountStatusEmail(
        bannedUser.email,
        'Your Cirql Account Has Been Suspended',
        'Account Suspension Notice',
        `Your account has been suspended for the following reason: <strong>${banUserDto.reason}</strong>`,
      );
    }

    await this.auditService.createLog({
      actor: requestingUser,
      action: AuditAction.USER_ACCOUNT_BANNED,
      targetId: bannedUser._id,
      targetType: 'User',
      reason: banUserDto.reason,
    });

    return bannedUser;
  }

  async unbanUser(
    idToUnban: string,
    requestingUser: UserDocument,
  ): Promise<UserDocument> {
    const userToUnban = await this.findById(idToUnban);
    if (!userToUnban) {
      throw new NotFoundException(`User with ID "${idToUnban}" not found.`);
    }

    userToUnban.accountStatus = 'active';
    userToUnban.banReason = undefined;
    const unbannedUser = await userToUnban.save();

    if (unbannedUser.email) {
      await this.emailService.sendAccountStatusEmail(
        unbannedUser.email,
        'Your Cirql Account Has Been Reinstated',
        'Account Reinstated',
        'Your account suspension has been lifted. You can now log in and access all features.',
      );
    }

    await this.auditService.createLog({
      actor: requestingUser,
      action: AuditAction.USER_ACCOUNT_UNBANNED,
      targetId: unbannedUser._id,
      targetType: 'User',
    });

    return unbannedUser;
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }
  async findOneByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }
  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    if (
      updateUserDto.email &&
      updateUserDto.email.toLowerCase() !== user.email
    ) {
      const existing = await this.findOneByEmail(updateUserDto.email);
      if (existing && existing.id !== user.id) {
        throw new ConflictException(
          'Email is already in use by another account.',
        );
      }
    }
    Object.assign(user, updateUserDto);
    return user.save();
  }

  async remove(
    id: string,
    requestingUser: UserDocument,
  ): Promise<UserDocument> {
    const userToDelete = await this.userModel.findById(id).exec();
    if (!userToDelete) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    if (userToDelete.id === requestingUser.id) {
      throw new ForbiddenException(
        'You cannot delete your own account via this endpoint.',
      );
    }
    if (userToDelete.roles.includes(Role.Owner)) {
      throw new ForbiddenException('The Owner account cannot be deleted.');
    }
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    if (!deletedUser) {
      throw new NotFoundException(
        `User with ID "${id}" not found for deletion.`,
      );
    }
    await this.auditService.createLog({
      actor: requestingUser,
      action: AuditAction.USER_ACCOUNT_DELETED,
      targetId: deletedUser._id,
      targetType: 'User',
      details: {
        before: { email: deletedUser.email, roles: deletedUser.roles },
      },
    });
    return deletedUser;
  }
}
