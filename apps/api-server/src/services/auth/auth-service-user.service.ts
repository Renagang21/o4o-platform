import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import {
  OAuthProfile,
  ServiceUserLoginRequest,
  ServiceUserLoginResponse,
  ServiceUserData,
} from '../../types/account-linking.js';
import * as tokenUtils from '../../utils/token.utils.js';
import { InvalidCredentialsError } from '../../errors/AuthErrors.js';
import logger from '../../utils/logger.js';

/**
 * AuthServiceUserService
 *
 * Service User (Phase 1) authentication — OAuth-based login
 * that does NOT create platform user records.
 *
 * Extracted from AuthenticationService (WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1).
 */
export class AuthServiceUserService {
  // Lazy repository
  private _activityRepo?: Repository<AccountActivity>;

  private get activityRepository(): Repository<AccountActivity> {
    if (!this._activityRepo) {
      this._activityRepo = AppDataSource.getRepository(AccountActivity);
    }
    return this._activityRepo;
  }

  /**
   * Handle Service User login
   *
   * Service Users are authenticated via OAuth but:
   * - Do NOT create Platform User records
   * - Receive Service JWT (tokenType: 'service')
   * - Cannot access Admin/Operator APIs
   */
  async handleServiceUserLogin(
    request: ServiceUserLoginRequest,
  ): Promise<ServiceUserLoginResponse> {
    const { credentials, ipAddress, userAgent } = request;
    const { provider, oauthToken, serviceId, storeId } = credentials;

    try {
      // Phase 1: OAuth token validation
      const oauthProfile = await this.validateServiceOAuthToken(provider, oauthToken);

      if (!oauthProfile) {
        throw new InvalidCredentialsError();
      }

      // Create service user data (NOT stored in database)
      const serviceUser: ServiceUserData = {
        providerUserId: oauthProfile.id,
        provider: provider,
        email: oauthProfile.email,
        displayName: oauthProfile.displayName,
        profileImage: oauthProfile.avatar,
        serviceId: serviceId,
        storeId: storeId,
      };

      // Generate Service tokens (tokenType: 'service')
      const tokens = tokenUtils.generateServiceTokens(serviceUser, 'neture.co.kr');

      // Log service user login (non-critical)
      this.logServiceUserLogin(serviceUser, ipAddress, userAgent).catch((err) =>
        logger.warn('Failed to log service user login (non-critical):', err),
      );

      logger.info('Service user login successful', {
        provider,
        serviceId,
        storeId,
        email: serviceUser.email,
      });

      return {
        success: true,
        user: serviceUser,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900,
        },
        tokenType: 'service',
      };
    } catch (error) {
      logger.error('Service user login error:', error);
      throw error;
    }
  }

  /**
   * Validate OAuth token with provider
   *
   * Phase 1: Basic validation structure
   * Phase 2: Full provider-specific validation
   */
  private async validateServiceOAuthToken(
    provider: 'google' | 'kakao' | 'naver',
    oauthToken: string,
  ): Promise<OAuthProfile | null> {
    try {
      // Phase 1: Accept JSON-encoded profile data for testing
      try {
        const profile = JSON.parse(oauthToken) as OAuthProfile;
        if (profile.id && profile.email) {
          return profile;
        }
      } catch {
        // Not JSON, continue to provider validation
      }

      // Phase 2 TODO: Implement provider-specific token validation
      logger.warn(`Service OAuth validation not fully implemented for provider: ${provider}`);

      return null;
    } catch (error) {
      logger.error('Service OAuth validation error:', error);
      return null;
    }
  }

  /**
   * Log service user login attempt
   */
  private async logServiceUserLogin(
    serviceUser: ServiceUserData,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: undefined, // Service users don't have platform user IDs
          type: `service_login_${serviceUser.provider}`,
          ipAddress,
          userAgent,
          details: {
            provider: serviceUser.provider,
            email: serviceUser.email,
            serviceId: serviceUser.serviceId,
            storeId: serviceUser.storeId,
            success: true,
          },
        }),
      );
    } catch (error) {
      logger.warn('Failed to log service user login:', error);
    }
  }
}
