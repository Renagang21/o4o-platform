import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import {
  GuestTokenIssueRequest,
  GuestTokenIssueResponse,
  GuestUserData,
} from '../../types/account-linking.js';
import * as tokenUtils from '../../utils/token.utils.js';
import logger from '../../utils/logger.js';

/**
 * AuthGuestService
 *
 * Guest token issuance (QR/device/signage).
 *
 * WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1: guest → service upgrade RETIRED
 * (service login 경로 은퇴와 함께 제거. legitimate caller 0).
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
}
