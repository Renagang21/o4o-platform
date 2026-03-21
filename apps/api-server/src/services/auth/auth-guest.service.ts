import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import {
  GuestTokenIssueRequest,
  GuestTokenIssueResponse,
  GuestUpgradeRequest,
  GuestUpgradeResponse,
  GuestUserData,
  ServiceUserData,
} from '../../types/account-linking.js';
import * as tokenUtils from '../../utils/token.utils.js';
import { InvalidCredentialsError } from '../../errors/AuthErrors.js';
import logger from '../../utils/logger.js';
import type { AuthServiceUserService } from './auth-service-user.service.js';

/**
 * AuthGuestService
 *
 * Guest token issuance (QR/device/signage) and upgrade to Service User.
 *
 * Extracted from AuthenticationService (WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1).
 */
export class AuthGuestService {
  // Lazy repository
  private _activityRepo?: Repository<AccountActivity>;

  private get activityRepository(): Repository<AccountActivity> {
    if (!this._activityRepo) {
      this._activityRepo = AppDataSource.getRepository(AccountActivity);
    }
    return this._activityRepo;
  }

  constructor(private readonly serviceUserService: AuthServiceUserService) {}

  /**
   * Issue Guest Token
   *
   * Guest tokens are for anonymous/temporary users:
   * - QR code entry at stores/kiosks
   * - Signage device access
   * - Anonymous browsing with tracking
   *
   * Guest tokens are:
   * - Short-lived (2 hours, no refresh)
   * - No DB user record created
   * - Can be upgraded to Service User token
   */
  async issueGuestToken(
    request: GuestTokenIssueRequest,
  ): Promise<GuestTokenIssueResponse> {
    const { serviceId, storeId, deviceId, entryType, metadata } = request;

    try {
      // Generate unique guest session ID
      const guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      // Create guest user data (NOT stored in database)
      const guestData: GuestUserData = {
        guestSessionId,
        serviceId,
        storeId,
        deviceId,
        entryType,
        createdAt: now,
        expiresAt,
      };

      // Generate Guest token (tokenType: 'guest')
      const accessToken = tokenUtils.generateGuestAccessToken(guestData, 'neture.co.kr');
      const tokenConfig = tokenUtils.getGuestTokenConfig();

      // Log guest token issuance (non-critical)
      this.logGuestTokenIssue(guestData, metadata).catch((err) =>
        logger.warn('Failed to log guest token issue (non-critical):', err),
      );

      logger.info('Guest token issued', {
        guestSessionId,
        serviceId,
        storeId,
        entryType,
        deviceId,
      });

      return {
        success: true,
        guestSessionId,
        tokens: {
          accessToken,
          expiresIn: tokenConfig.guestTokenExpiresIn,
        },
        tokenType: 'guest',
        context: {
          serviceId,
          storeId,
          deviceId,
          entryType,
        },
      };
    } catch (error) {
      logger.error('Guest token issue error:', error);
      throw error;
    }
  }

  /**
   * Upgrade Guest to Service User
   *
   * When a guest user authenticates via OAuth, their session
   * is "upgraded" to a Service User session.
   *
   * This preserves:
   * - Guest activity tracking
   * - Cart/wishlist (if implemented)
   * - Entry context (store, device)
   */
  async upgradeGuestToServiceUser(
    request: GuestUpgradeRequest,
  ): Promise<GuestUpgradeResponse> {
    const { guestToken, credentials, ipAddress, userAgent } = request;

    try {
      // Verify guest token
      const guestPayload = tokenUtils.verifyAccessToken(guestToken);

      if (!guestPayload || guestPayload.tokenType !== 'guest') {
        throw new InvalidCredentialsError();
      }

      const guestSessionId = guestPayload.guestSessionId || guestPayload.userId || '';

      // Perform service user login
      const serviceLoginResult = await this.serviceUserService.handleServiceUserLogin({
        credentials,
        ipAddress,
        userAgent,
      });

      // Preserve guest context in service user session
      const activityPreserved = await this.transferGuestActivity(
        guestSessionId,
        serviceLoginResult.user.providerUserId,
      );

      // Log upgrade event
      this.logGuestUpgrade(guestSessionId, serviceLoginResult.user, ipAddress).catch((err) =>
        logger.warn('Failed to log guest upgrade (non-critical):', err),
      );

      logger.info('Guest upgraded to Service User', {
        guestSessionId,
        provider: serviceLoginResult.user.provider,
        serviceId: serviceLoginResult.user.serviceId,
        email: serviceLoginResult.user.email,
      });

      return {
        success: true,
        user: serviceLoginResult.user,
        tokens: serviceLoginResult.tokens,
        tokenType: 'service',
        previousGuestSessionId: guestSessionId,
        activityPreserved,
      };
    } catch (error) {
      logger.error('Guest upgrade error:', error);
      throw error;
    }
  }

  /**
   * Transfer guest activity to service user
   *
   * Phase 3: Stub implementation
   * Future: Transfer cart, wishlist, browsing history, etc.
   */
  private async transferGuestActivity(
    guestSessionId: string,
    serviceUserId: string,
  ): Promise<boolean> {
    try {
      // Phase 3: Log transfer intent (actual transfer TBD)
      logger.info('Guest activity transfer requested', {
        guestSessionId,
        serviceUserId,
      });

      // TODO: Implement actual activity transfer in future phases
      // - Cart items
      // - Wishlist items
      // - Browsing history
      // - Preferences

      return true;
    } catch (error) {
      logger.warn('Guest activity transfer failed:', error);
      return false;
    }
  }

  /**
   * Log guest token issuance
   */
  private async logGuestTokenIssue(
    guestData: GuestUserData,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: undefined, // Guest users don't have platform user IDs
          type: 'guest_token_issue',
          ipAddress: metadata?.ipAddress || 'unknown',
          userAgent: metadata?.userAgent || 'unknown',
          details: {
            guestSessionId: guestData.guestSessionId,
            serviceId: guestData.serviceId,
            storeId: guestData.storeId,
            deviceId: guestData.deviceId,
            entryType: guestData.entryType,
            ...metadata,
          },
        }),
      );
    } catch (error) {
      logger.warn('Failed to log guest token issue:', error);
    }
  }

  /**
   * Log guest upgrade event
   */
  private async logGuestUpgrade(
    guestSessionId: string,
    serviceUser: ServiceUserData,
    ipAddress: string,
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: undefined,
          type: 'guest_upgrade_to_service',
          ipAddress,
          userAgent: 'unknown',
          details: {
            guestSessionId,
            provider: serviceUser.provider,
            email: serviceUser.email,
            serviceId: serviceUser.serviceId,
            storeId: serviceUser.storeId,
          },
        }),
      );
    } catch (error) {
      logger.warn('Failed to log guest upgrade:', error);
    }
  }
}
