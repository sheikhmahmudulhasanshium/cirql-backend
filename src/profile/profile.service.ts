import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
import { UserDocument } from '../users/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { ProfileResponseDto } from './dto/profile.response.dto';
// FIX: Import the SettingDocument type to be used in explicit typing.
import { SettingDocument } from '../settings/schemas/setting.schema';
import { UpdateProfileDto } from './dto/update-profile';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
  ) {}

  async findByUserId(
    targetUserId: string,
    requestingUser?: UserDocument,
  ): Promise<ProfileResponseDto> {
    const targetUser = (await this.usersService.findById(
      targetUserId,
    )) as UserDocument;
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    // FIX: Explicitly type the destructured array elements. This removes all
    // ambiguity for the linter and compiler, ensuring `profile` is known to be
    // a `ProfileDocument` and `settings` is a `SettingDocument`.
    const [profile, settings]: [ProfileDocument, SettingDocument] =
      await Promise.all([
        this.findOrCreate(targetUser._id),
        this.settingsService.findOrCreateByUserId(targetUserId),
      ]);

    const isOwner =
      requestingUser && requestingUser._id.toString() === targetUserId;
    const isAdmin =
      requestingUser &&
      requestingUser.roles.some((role) =>
        [Role.Admin, Role.Owner].includes(role),
      );
    const isPrivate = settings.accountSettingsPreferences.isPrivate;

    if (isPrivate && !isOwner && !isAdmin) {
      throw new ForbiddenException('This profile is private.');
    }

    // NOTE: The final "unsafe assignment" error is now resolved because the explicit
    // typing above guarantees that `profile.headline` is a `string`.
    return {
      id: targetUser._id.toString(),
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      picture: targetUser.picture,
      accountStatus: targetUser.accountStatus,
      roles: targetUser.roles,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      isPrivate: isPrivate,
      createdAt: targetUser.createdAt!,
    };
  }

  async findOrCreate(userId: Types.ObjectId): Promise<ProfileDocument> {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (profile) {
      return profile;
    }
    return this.profileModel.create({ userId });
  }

  async update(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found to update profile.');
    }
    const profile = await this.findOrCreate(user._id);
    Object.assign(profile, dto);
    await profile.save();
    return this.findByUserId(userId, user);
  }
}
