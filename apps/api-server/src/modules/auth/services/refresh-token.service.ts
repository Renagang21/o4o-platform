import { BaseService } from '../../../common/base.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { RefreshToken } from '../entities/RefreshToken.js';
import type { User } from '../entities/User.js';
import crypto from 'crypto';
import logger from '../../../utils/logger.js';
import { generateAccessToken } from '../../../utils/token.utils.js';
import { roleAssignmentService } from './role-assignment.service.js';

/**
 * RefreshTokenService - Manages RefreshToken entity
 *
 * Extends BaseService to inherit standard CRUD operations.
 * Provides JWT refresh token functionality:
 * - Token generation with crypto randomness
 * - Token verification and validation
 * - Access token refresh
 * - Token revocation (individual and bulk)
 * - Expired token cleanup
 */
export class RefreshTokenService extends BaseService<RefreshToken> {
  constructor() {
    super(AppDataSource.getRepository(RefreshToken));
  }

  /**
   * Generate new refresh token for user
   * @param user - User entity
   * @param deviceId - Optional device identifier
   * @param userAgent - Client user agent
   * @param ipAddress - Client IP address
   * @returns Generated token string
   */
  async generateRefreshToken(
    user: User,
    deviceId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    try {
      // Generate cryptographically secure random token
      const tokenValue = crypto.randomBytes(64).toString('hex');

      // Set expiration (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Revoke existing tokens for the same device to prevent token accumulation
      if (deviceId) {
        await this.repository.update(
          {
            userId: user.id,
            deviceId,
            revoked: false,
          },
          {
            revoked: true,
            revokedAt: new Date(),
            revokedReason: 'New token issued',
          }
        );
      }

      // Create new refresh token
      const refreshToken = this.repository.create({
        token: tokenValue,
        user,
        userId: user.id,
        expiresAt,
        deviceId,
        userAgent,
        ipAddress,
      });

      await this.repository.save(refreshToken);

      return tokenValue;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify refresh token validity
   * @param token - Token string to verify
   * @returns Verification result with user if valid
   */
  async verifyRefreshToken(
    token: string
  ): Promise<{ valid: boolean; user?: User; reason?: string }> {
    try {
      const refreshToken = await this.repository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!refreshToken) {
        return { valid: false, reason: 'Token not found' };
      }

      if (!refreshToken.isValid()) {
        return {
          valid: false,
          reason: refreshToken.revoked ? 'Token revoked' : 'Token expired',
        };
      }

      return { valid: true, user: refreshToken.user };
    } catch (error) {
      logger.error('Error verifying refresh token:', error);
      return { valid: false, reason: 'Verification error' };
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token string
   * @returns New access token or error
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken?: string; error?: string }> {
    try {
      const verification = await this.verifyRefreshToken(refreshToken);

      if (!verification.valid || !verification.user) {
        return { error: verification.reason || 'Invalid refresh token' };
      }

      // Phase3-E: Query RoleAssignment table for current roles
      const roles = await roleAssignmentService.getRoleNames(verification.user.id);

      // Generate new access token via standard token utils
      const accessToken = generateAccessToken(verification.user, roles);

      // Update last used timestamp
      await this.repository.update(
        { token: refreshToken },
        { updatedAt: new Date() }
      );

      return { accessToken };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      return { error: 'Failed to refresh token' };
    }
  }

  /**
   * Revoke a specific refresh token
   * @param token - Token string to revoke
   * @param reason - Optional revocation reason
   * @returns True if revoked successfully
   */
  async revokeToken(token: string, reason?: string): Promise<boolean> {
    try {
      const result = await this.repository.update(
        { token },
        {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: reason || 'Manual revocation',
        }
      );

      return (result.affected ?? 0) > 0;
    } catch (error) {
      logger.error('Error revoking token:', error);
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param userId - User ID
   * @param reason - Optional revocation reason
   * @returns True if tokens revoked
   */
  async revokeAllUserTokens(userId: string, reason?: string): Promise<boolean> {
    try {
      const result = await this.repository.update(
        { userId, revoked: false },
        {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: reason || 'All tokens revoked',
        }
      );

      return (result.affected ?? 0) > 0;
    } catch (error) {
      logger.error('Error revoking user tokens:', error);
      return false;
    }
  }

  /**
   * Clean expired tokens from database
   * @returns Number of tokens deleted
   */
  async cleanExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now })
        .execute();

      return result.affected || 0;
    } catch (error) {
      logger.error('Error cleaning expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get user's active (non-revoked, non-expired) tokens
   * @param userId - User ID
   * @returns Array of active refresh tokens
   */
  async getUserActiveTokens(userId: string): Promise<RefreshToken[]> {
    try {
      const now = new Date();
      return await this.repository.find({
        where: {
          userId,
          revoked: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      logger.error('Error getting user tokens:', error);
      return [];
    }
  }

  /**
   * Get total count of active tokens for user
   * @param userId - User ID
   * @returns Count of active tokens
   */
  async countUserActiveTokens(userId: string): Promise<number> {
    try {
      const now = new Date();
      return await this.repository.count({
        where: {
          userId,
          revoked: false,
        },
      });
    } catch (error) {
      logger.error('Error counting user tokens:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const refreshTokenService = new RefreshTokenService();
