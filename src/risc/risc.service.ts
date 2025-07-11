// src/risc/risc.service.ts

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

// --- FIX: Define a more specific type for the RISC token payload ---
interface RiscTokenPayload extends TokenPayload {
  events?: { [key: string]: object };
}

// Official RISC event type URIs
const SESSIONS_REVOKED_EVENT =
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';
const ACCOUNT_DISABLED_EVENT =
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled';
const ACCOUNT_PURGED_EVENT =
  'https://schemas.openid.net/secevent/risc/event-type/account-purged';

@Injectable()
export class RiscService {
  private readonly logger = new Logger(RiscService.name);
  private readonly oauth2Client: OAuth2Client;
  private readonly projectId: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.oauth2Client = new OAuth2Client();

    // --- FIX: Ensure projectId is not undefined ---
    const projectId = this.configService.get<string>('GOOGLE_PROJECT_ID');
    if (!projectId) {
      throw new InternalServerErrorException(
        'GOOGLE_PROJECT_ID is not defined in the environment.',
      );
    }
    this.projectId = projectId;
  }

  async processEvent(token: string): Promise<void> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Invalid or empty token received.');
    }

    let payload: RiscTokenPayload | undefined;
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: token,
        audience: this.projectId,
      });
      // --- FIX: Cast the payload to our more specific type ---
      payload = ticket.getPayload() as RiscTokenPayload;
    } catch (error) {
      // --- FIX: Check if error is an instance of Error ---
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown validation error';
      this.logger.error(`JWT validation failed: ${errorMessage}`);
      throw new BadRequestException('Token validation failed.');
    }

    // --- FIX: The payload is now correctly typed, so these checks pass ---
    if (!payload || !payload.events || !payload.sub) {
      throw new BadRequestException('Token payload is missing events or sub.');
    }

    const googleUserId = payload.sub;
    const eventTypes = Object.keys(payload.events);
    this.logger.log(
      `Processing events [${eventTypes.join(', ')}] for Google user ${googleUserId}`,
    );

    for (const eventType of eventTypes) {
      switch (eventType) {
        case SESSIONS_REVOKED_EVENT:
          await this.forceUserLogout(googleUserId);
          break;

        case ACCOUNT_DISABLED_EVENT:
        case ACCOUNT_PURGED_EVENT:
          await this.disableUserAccount(googleUserId, eventType);
          break;

        default:
          this.logger.warn(`Received unknown RISC event type: ${eventType}`);
      }
    }
  }

  private async forceUserLogout(googleId: string): Promise<void> {
    const user = await this.usersService.findOneByGoogleId(googleId);
    if (!user) {
      this.logger.warn(
        `Received sessions-revoked event for non-existent Google user: ${googleId}`,
      );
      return;
    }
    this.logger.log(`Forcing logout for user ${user.id} (${user.email})`);
    user.tokensValidFrom = new Date();
    await user.save();
  }

  private async disableUserAccount(
    googleId: string,
    eventType: string,
  ): Promise<void> {
    const user = await this.usersService.findOneByGoogleId(googleId);
    if (!user) {
      this.logger.warn(
        `Received ${eventType} event for non-existent Google user: ${googleId}`,
      );
      return;
    }
    const reason = `Account disabled due to Google security event: ${eventType
      .split('/')
      .pop()}.`;
    this.logger.log(
      `Disabling account for user ${user.id} (${user.email}). Reason: ${reason}`,
    );
    user.accountStatus = 'banned';
    user.banReason = reason;
    user.tokensValidFrom = new Date();
    await user.save();
  }
}
