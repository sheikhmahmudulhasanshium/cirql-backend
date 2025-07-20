// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  InternalServerErrorException,
  Logger,
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
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

export interface UserAnalyticsData {
  totalUsers: number;
  statusCounts: {
    active: number;
    banned: number;
  };
  weeklyGrowth: {
    newUsersThisWeek: number;
    newUsersLastWeek: number;
    percentage: number;
  };
  engagement: {
    recent: number;
    active: number;
    inactive: number;
  };
}

export type AdminUserListView = {
  _id: Types.ObjectId;
  email: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  accountStatus: string;
  roles: Role[];
  is2FAEnabled: boolean;
  picture?: string;
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

interface PublicProfileAggregateResult {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  picture?: string;
}
interface TotalCountAggregateResult {
  total: number;
}
interface StatusCountAggregateResult {
  _id: string;
  count: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdForAuth(
    id: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select(
        '+password +twoFactorAuthenticationCode +twoFactorAuthenticationCodeExpires +twoFactorAttempts +twoFactorLockoutUntil +loginHistory',
      )
      .exec();
  }

  async findOneByEmailForAuth(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select(
        '+password +twoFactorAuthenticationCode +twoFactorAuthenticationCodeExpires +twoFactorAttempts +twoFactorLockoutUntil +loginHistory',
      )
      .exec();
  }

  async findOneByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    try {
      const newUser = await this.userModel.create(userData);
      await this.runPostCreationTasks(newUser);
      return newUser;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('E11000')) {
        throw new ConflictException(
          'A user with this email or Google ID already exists.',
        );
      }
      this.logger.error('Error creating new user:', err);
      throw new InternalServerErrorException('Could not create user.');
    }
  }

  private async runPostCreationTasks(newUser: UserDocument): Promise<void> {
    this.logger.log(`Performing post-creation actions for ${newUser.id}`);
    const welcomeName = newUser.firstName || 'there';

    await this.notificationsService.createNotification({
      userId: newUser._id,
      title: 'Welcome to CiRQL! 🎉',
      message:
        'We are thrilled to have you on board. Explore your profile and settings to get started.',
      type: NotificationType.WELCOME,
      linkUrl: '/profile/me',
    });

    const userSettings = await this.settingsService.findOrCreateByUserId(
      newUser._id.toString(),
    );
    if (
      newUser.email &&
      userSettings.notificationPreferences.emailNotifications
    ) {
      await this.emailService.sendWelcomeEmail(newUser.email, welcomeName);
    }
  }

  async updateLastLogin(user: UserDocument): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lastLogin =
      user.loginHistory.length > 0
        ? user.loginHistory[user.loginHistory.length - 1]
        : null;

    if (lastLogin && lastLogin < thirtyDaysAgo) {
      this.logger.log(`Sending 'Welcome Back' notification to ${user.id}`);
      const welcomeName = user.firstName || 'there';
      await this.notificationsService.createNotification({
        userId: user._id,
        title: 'Welcome Back! 👋',
        message:
          "It's great to see you again! Check out what's new on the platform.",
        type: NotificationType.WELCOME_BACK,
        linkUrl: '/home',
      });
      if (user.email) {
        await this.emailService.sendWelcomeBackEmail(user.email, welcomeName);
      }
    }

    // --- START OF FIX: Add .exec() to the query ---
    await this.userModel
      .updateOne(
        { _id: user._id },
        { $push: { loginHistory: { $each: [new Date()], $slice: -10 } } },
      )
      .exec();
    // --- END OF FIX ---
  }

  async set2FA(
    userId: string,
    isEnabled: boolean,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { is2FAEnabled: isEnabled },
      { new: true },
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
      throw new ForbiddenException('Access denied.');
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -loginHistory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const sanitizedData: AdminUserListView[] = users.map((user) => ({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus,
      roles: user.roles,
      is2FAEnabled: user.is2FAEnabled,
      picture: user.picture,
    }));

    return { data: sanitizedData, total, page, limit };
  }

  async findPublicProfiles(
    page: number,
    limit: number,
  ): Promise<FindPublicProfilesResponse> {
    const skip = (page - 1) * limit;

    const aggregationPipeline: any[] = [
      { $match: { accountStatus: 'active' } },
      {
        $lookup: {
          from: 'settings',
          localField: '_id',
          foreignField: 'userId',
          as: 'settingsInfo',
        },
      },
      { $unwind: { path: '$settingsInfo', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'settingsInfo.accountSettingsPreferences.isPrivate': { $ne: true },
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          picture: 1,
          _id: 1,
        },
      },
    ];

    const findPipeline: any[] = aggregationPipeline.concat([
      { $skip: skip },
      { $limit: limit },
    ]);
    const countPipeline: any[] = aggregationPipeline.concat([
      { $count: 'total' },
    ]);

    const [users, totalResult] = await Promise.all([
      this.userModel
        .aggregate<PublicProfileAggregateResult>(findPipeline)
        .exec(),
      this.userModel.aggregate<TotalCountAggregateResult>(countPipeline).exec(),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    const sanitizedData: PublicProfileDto[] = users.map((user) => ({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
    }));
    return { data: sanitizedData, total, page, limit };
  }

  async getUserAnalytics(): Promise<UserAnalyticsData> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const lastWeekEndDate = new Date();
    lastWeekEndDate.setDate(lastWeekEndDate.getDate() - 7);
    const twoWeeksAgoDate = new Date();
    twoWeeksAgoDate.setDate(twoWeeksAgoDate.getDate() - 14);

    const [allUsers, statusCounts, newThisWeek, newLastWeek] =
      await Promise.all([
        this.userModel
          .find({}, 'loginHistory createdAt')
          .select('+loginHistory')
          .lean()
          .exec(),
        this.userModel
          .aggregate<StatusCountAggregateResult>([
            { $group: { _id: '$accountStatus', count: { $sum: 1 } } },
          ])
          .exec(),
        this.userModel
          .countDocuments({ createdAt: { $gte: lastWeekEndDate } })
          .exec(),
        this.userModel
          .countDocuments({
            createdAt: { $gte: twoWeeksAgoDate, $lt: lastWeekEndDate },
          })
          .exec(),
      ]);

    const engagement = { recent: 0, active: 0, inactive: 0 };
    for (const user of allUsers) {
      if (!user.loginHistory || user.loginHistory.length === 0) {
        engagement.inactive++;
        continue;
      }
      const lastLogin = user.loginHistory[user.loginHistory.length - 1];
      if (lastLogin >= threeDaysAgo) engagement.recent++;
      if (lastLogin < thirtyDaysAgo) engagement.inactive++;
      if (
        user.loginHistory.filter((date) => date >= thirtyDaysAgo).length >= 2
      ) {
        engagement.active++;
      }
    }

    const growthPercentage =
      newLastWeek > 0
        ? ((newThisWeek - newLastWeek) / newLastWeek) * 100
        : newThisWeek > 0
          ? 100
          : 0;

    const activeCount =
      statusCounts.find((s) => s._id === 'active')?.count || 0;
    const bannedCount =
      statusCounts.find((s) => s._id === 'banned')?.count || 0;

    return {
      totalUsers: allUsers.length,
      statusCounts: { active: activeCount, banned: bannedCount },
      weeklyGrowth: {
        newUsersThisWeek: newThisWeek,
        newUsersLastWeek: newLastWeek,
        percentage: parseFloat(growthPercentage.toFixed(2)),
      },
      engagement,
    };
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
    if (!userToBan)
      throw new NotFoundException(`User with ID "${idToBan}" not found.`);
    if (userToBan.id === requestingUser.id)
      throw new ForbiddenException('You cannot ban your own account.');
    if (userToBan.roles.includes(Role.Owner))
      throw new ForbiddenException('The Owner account cannot be banned.');

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
    if (!userToUnban)
      throw new NotFoundException(`User with ID "${idToUnban}" not found.`);

    userToUnban.accountStatus = 'active';
    userToUnban.banReason = undefined;
    const unbannedUser = await userToUnban.save();

    await this.notificationsService.createNotification({
      userId: unbannedUser._id,
      title: 'Your Account Has Been Reinstated',
      message:
        'Your account suspension has been lifted. Welcome back to Cirql!',
      type: NotificationType.ACCOUNT_STATUS_UPDATE,
      linkUrl: '/home',
    });

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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    if (
      updateUserDto.email &&
      updateUserDto.email.toLowerCase() !== user.email
    ) {
      const existing = await this.findOneByEmailForAuth(updateUserDto.email);
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
    if (!userToDelete)
      throw new NotFoundException(`User with ID "${id}" not found`);
    if (userToDelete.id === requestingUser.id)
      throw new ForbiddenException(
        'You cannot delete your own account via this endpoint.',
      );
    if (userToDelete.roles.includes(Role.Owner))
      throw new ForbiddenException('The Owner account cannot be deleted.');

    // --- START OF FIX: Add .exec() to the query ---
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    // --- END OF FIX ---

    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" could not be deleted.`);
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
