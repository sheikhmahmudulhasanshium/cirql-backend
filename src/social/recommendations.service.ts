// src/social/recommendations.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from 'src/users/schemas/user.schema';
import { SocialService } from './social.service';
import { SettingsService } from 'src/settings/settings.service';
import {
  SocialProfile,
  SocialProfileDocument,
} from './schemas/social-profile.schema';
import { Setting, SettingDocument } from 'src/settings/schemas/setting.schema';

// Interface for a potential recommendation candidate during processing
interface RecommendationCandidate {
  userId: string;
  sharedInterestsCount: number;
  followersCount: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectModel(SocialProfile.name)
    private socialProfileModel: Model<SocialProfileDocument>,
    @InjectModel(Setting.name)
    private settingModel: Model<SettingDocument>,
    private readonly socialService: SocialService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Generates a list of user recommendations for the current user.
   * @param currentUser The authenticated user requesting recommendations.
   * @returns A sorted list of recommended user profiles.
   */
  async getUserRecommendations(
    currentUser: UserDocument,
  ): Promise<SocialProfileDocument[]> {
    const currentUserId = currentUser._id.toString();
    this.logger.log(
      `Starting recommendation process for user: ${currentUserId}`,
    );

    // --- Step 1: Foundational Filtering (Build Exclusion List) ---
    const currentUserSocialProfile =
      await this.socialService.findOrCreateProfile(currentUserId);
    const currentUserSettings =
      await this.settingsService.findOrCreateByUserId(currentUserId);

    // If the user has no interests, we cannot make recommendations.
    const currentUserInterests =
      currentUserSettings?.contentPreferences?.interests ?? [];
    if (currentUserInterests.length === 0) {
      this.logger.log(
        `User ${currentUserId} has no interests. No recommendations to generate.`,
      );
      return [];
    }

    const exclusionSet = new Set<string>();
    exclusionSet.add(currentUserId); // Exclude self

    // Exclude existing friends and followers/following
    currentUserSocialProfile?.friends.forEach((id) =>
      exclusionSet.add(id.toString()),
    );
    currentUserSocialProfile?.followers.forEach((id) =>
      exclusionSet.add(id.toString()),
    );
    currentUserSocialProfile?.following.forEach((id) =>
      exclusionSet.add(id.toString()),
    );
    currentUserSocialProfile?.blockedUsers.forEach((id) =>
      exclusionSet.add(id.toString()),
    );

    // --- Step 2: Primary Matching (Direct Interest Overlap) ---

    // Find all users who are not in the exclusion list
    const potentialCandidatesSettings = await this.settingModel
      .find({
        userId: {
          $nin: Array.from(exclusionSet).map((id) => new Types.ObjectId(id)),
        },
        'contentPreferences.interests': { $exists: true, $not: { $size: 0 } },
      })
      .select('userId contentPreferences.interests')
      .exec();

    const matchedCandidates: RecommendationCandidate[] = [];

    // Calculate shared interests
    for (const candidateSetting of potentialCandidatesSettings) {
      const candidateInterests = new Set(
        candidateSetting.contentPreferences.interests,
      );
      const sharedInterests = currentUserInterests.filter((interest) =>
        candidateInterests.has(interest),
      );

      if (sharedInterests.length > 0) {
        matchedCandidates.push({
          userId: candidateSetting.userId.toString(),
          sharedInterestsCount: sharedInterests.length,
          followersCount: 0, // Will be populated next
        });
      }
    }

    this.logger.log(
      `Found ${matchedCandidates.length} candidates with shared interests.`,
    );

    // NOTE: Semantic matching fallback would go here if `matchedCandidates` is empty.
    // For this implementation, we will stick to direct matches as per the minimal plan.

    if (matchedCandidates.length === 0) {
      this.logger.log(`No recommendations found for user ${currentUserId}.`);
      return [];
    }

    // --- Step 3: Prioritization (Fetch Follower Counts) ---

    const candidateUserIds = matchedCandidates.map((c) => c.userId);
    const candidateSocialProfiles = await this.socialProfileModel
      .find({
        owner: { $in: candidateUserIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('owner followers')
      .exec();

    // Create a map for quick lookup of follower counts
    const followerCountMap = new Map<string, number>();
    for (const profile of candidateSocialProfiles) {
      followerCountMap.set(profile.owner.toString(), profile.followers.length);
    }

    // Populate the followersCount in our candidates array
    matchedCandidates.forEach((candidate) => {
      candidate.followersCount = followerCountMap.get(candidate.userId) || 0;
    });

    // --- Step 4: Final Ranking & Sorting ---
    matchedCandidates.sort((a, b) => {
      // Primary sort: by number of shared interests (descending)
      if (b.sharedInterestsCount !== a.sharedInterestsCount) {
        return b.sharedInterestsCount - a.sharedInterestsCount;
      }
      // Secondary sort: by number of followers (descending)
      return b.followersCount - a.followersCount;
    });

    // We only need the sorted user IDs
    const sortedUserIds = matchedCandidates.map((c) => c.userId);

    // Fetch the full social profiles for the final, sorted list
    // This is not strictly necessary if you only need IDs, but returning the full profile can be useful.
    const finalRecommendations = await this.socialProfileModel
      .find({
        owner: { $in: sortedUserIds.map((id) => new Types.ObjectId(id)) },
      })
      .populate('owner', 'firstName lastName picture')
      .exec();

    // Re-sort the final populated list to match our sorted order
    const finalSortedRecommendations = finalRecommendations.sort(
      (a, b) =>
        sortedUserIds.indexOf(a.owner._id.toString()) -
        sortedUserIds.indexOf(b.owner._id.toString()),
    );

    this.logger.log(
      `Returning ${finalSortedRecommendations.length} sorted recommendations for user ${currentUserId}.`,
    );
    return finalSortedRecommendations;
  }
}
