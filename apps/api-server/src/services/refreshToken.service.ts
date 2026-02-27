import { AppDataSource } from '../database/connection.js';
import { RefreshToken } from '../modules/auth/entities/RefreshToken.js';
import { LoginAttempt } from '../modules/auth/entities/LoginAttempt.js';
import { User } from '../modules/auth/entities/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export class RefreshTokenService {
  private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
  private loginAttemptRepository = AppDataSource.getRepository(LoginAttempt);
  private userRepository = AppDataSource.getRepository(User);

  // Generate new refresh token
  async generateRefreshToken(
    user: User,
    deviceId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    try {
      // Generate unique token
      const tokenValue = crypto.randomBytes(64).toString('hex');
      
      // Set expiration (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Revoke existing tokens for the same device
      if (deviceId) {
        await this.refreshTokenRepository.update(
          { 
            userId: user.id, 
            deviceId,
            revoked: false 
          },
          { 
            revoked: true,
            revokedAt: new Date(),
            revokedReason: 'New token issued'
          }
        );
      }

      // Create new refresh token
      const refreshToken = this.refreshTokenRepository.create({
        token: tokenValue,
        user,
        userId: user.id,
        expiresAt,
        deviceId,
        userAgent,
        ipAddress
      });

      await this.refreshTokenRepository.save(refreshToken);

      return tokenValue;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token: string): Promise<{ valid: boolean; user?: User; reason?: string }> {
    try {
      const refreshToken = await this.refreshTokenRepository.findOne({
        where: { token },
        relations: ['user']
      });

      if (!refreshToken) {
        return { valid: false, reason: 'Token not found' };
      }

      if (!refreshToken.isValid()) {
        return { 
          valid: false, 
          reason: refreshToken.revoked ? 'Token revoked' : 'Token expired' 
        };
      }

      return { valid: true, user: refreshToken.user };
    } catch (error) {
      logger.error('Error verifying refresh token:', error);
      return { valid: false, reason: 'Verification error' };
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken?: string; error?: string }> {
    try {
      const verification = await this.verifyRefreshToken(refreshToken);
      
      if (!verification.valid || !verification.user) {
        return { error: verification.reason || 'Invalid refresh token' };
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: verification.user.id,
          email: verification.user.email,
          roles: verification.user.roles
        },
        process.env.JWT_SECRET || 'default-jwt-secret',
        { expiresIn: '15m' }
      );

      // Update last used timestamp
      await this.refreshTokenRepository.update(
        { token: refreshToken },
        { updatedAt: new Date() }
      );

      return { accessToken };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      return { error: 'Failed to refresh token' };
    }
  }

  // Revoke refresh token
  async revokeToken(token: string, reason?: string): Promise<boolean> {
    try {
      const result = await this.refreshTokenRepository.update(
        { token },
        {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: reason || 'Manual revocation'
        }
      );

      return result.affected > 0;
    } catch (error) {
      logger.error('Error revoking token:', error);
      return false;
    }
  }

  // Revoke all user tokens
  async revokeAllUserTokens(userId: string, reason?: string): Promise<boolean> {
    try {
      const result = await this.refreshTokenRepository.update(
        { userId, revoked: false },
        {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: reason || 'All tokens revoked'
        }
      );

      return result.affected > 0;
    } catch (error) {
      logger.error('Error revoking user tokens:', error);
      return false;
    }
  }

  // Clean expired tokens
  async cleanExpiredTokens(): Promise<number> {
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: new Date()
      });

      return result.affected || 0;
    } catch (error) {
      logger.error('Error cleaning expired tokens:', error);
      return 0;
    }
  }

  // Track login attempt
  async trackLoginAttempt(
    email: string,
    successful: boolean,
    ipAddress: string,
    userAgent?: string,
    deviceId?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      const attempt = this.loginAttemptRepository.create({
        email,
        successful,
        ipAddress,
        userAgent,
        deviceId,
        failureReason
      });

      await this.loginAttemptRepository.save(attempt);
    } catch (error) {
      logger.error('Error tracking login attempt:', error);
    }
  }

  // Check if account should be locked
  async checkAccountLock(email: string): Promise<{ locked: boolean; lockDuration?: number; attempts?: number }> {
    try {
      const attempts = await this.loginAttemptRepository.find({
        where: { email },
        order: { attemptedAt: 'DESC' },
        take: 20
      });

      const shouldLock = LoginAttempt.shouldLockAccount(attempts);
      
      if (shouldLock) {
        const failedAttempts = attempts.filter(a => !a.successful).length;
        const lockDuration = LoginAttempt.getLockDuration(failedAttempts);
        
        return {
          locked: true,
          lockDuration,
          attempts: failedAttempts
        };
      }

      return { locked: false };
    } catch (error) {
      logger.error('Error checking account lock:', error);
      return { locked: false };
    }
  }

  // Get user's active tokens
  async getUserActiveTokens(userId: string): Promise<RefreshToken[]> {
    try {
      return await this.refreshTokenRepository.find({
        where: {
          userId,
          revoked: false
        },
        order: {
          createdAt: 'DESC'
        }
      });
    } catch (error) {
      logger.error('Error getting user tokens:', error);
      return [];
    }
  }
}

// Export singleton instance
export const refreshTokenService = new RefreshTokenService();