import { BaseService } from '../../../common/base.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { LoginAttempt } from '../entities/LoginAttempt.js';
import logger from '../../../utils/logger.js';

/**
 * LoginSecurityService - Manages LoginAttempt entity and security features
 *
 * Extends BaseService to inherit standard CRUD operations.
 * Provides security features:
 * - Login attempt tracking
 * - Account lock detection
 * - Brute force prevention
 */
export class LoginSecurityService extends BaseService<LoginAttempt> {
  constructor() {
    super(AppDataSource.getRepository(LoginAttempt));
  }

  /**
   * Track a login attempt (successful or failed)
   * @param email - User email
   * @param successful - Whether login was successful
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param deviceId - Optional device identifier
   * @param failureReason - Reason for failure (if applicable)
   */
  async trackLoginAttempt(
    email: string,
    successful: boolean,
    ipAddress: string,
    userAgent?: string,
    deviceId?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      const attempt = this.repository.create({
        email,
        successful,
        ipAddress,
        userAgent,
        deviceId,
        failureReason,
      });

      await this.repository.save(attempt);
    } catch (error) {
      logger.error('Error tracking login attempt:', error);
    }
  }

  /**
   * Check if account should be locked due to failed login attempts
   * @param email - User email
   * @returns Lock status with duration and attempt count
   */
  async checkAccountLock(
    email: string
  ): Promise<{ locked: boolean; lockDuration?: number; attempts?: number }> {
    try {
      const attempts = await this.repository.find({
        where: { email },
        order: { attemptedAt: 'DESC' },
        take: 20,
      });

      const shouldLock = LoginAttempt.shouldLockAccount(attempts);

      if (shouldLock) {
        const failedAttempts = attempts.filter((a) => !a.successful).length;
        const lockDuration = LoginAttempt.getLockDuration(failedAttempts);

        return {
          locked: true,
          lockDuration,
          attempts: failedAttempts,
        };
      }

      return { locked: false };
    } catch (error) {
      logger.error('Error checking account lock:', error);
      return { locked: false };
    }
  }

  /**
   * Get recent login attempts for an email
   * @param email - User email
   * @param limit - Maximum number of attempts to retrieve
   * @returns Array of login attempts
   */
  async getRecentAttempts(
    email: string,
    limit: number = 20
  ): Promise<LoginAttempt[]> {
    try {
      return await this.repository.find({
        where: { email },
        order: { attemptedAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting recent attempts:', error);
      return [];
    }
  }

  /**
   * Get failed login attempts within a time window
   * @param email - User email
   * @param minutesAgo - Time window in minutes
   * @returns Number of failed attempts
   */
  async getFailedAttemptsCount(
    email: string,
    minutesAgo: number = 15
  ): Promise<number> {
    try {
      const since = new Date(Date.now() - minutesAgo * 60 * 1000);
      const attempts = await this.repository
        .createQueryBuilder('attempt')
        .where('attempt.email = :email', { email })
        .andWhere('attempt.successful = false')
        .andWhere('attempt.attemptedAt > :since', { since })
        .getCount();

      return attempts;
    } catch (error) {
      logger.error('Error counting failed attempts:', error);
      return 0;
    }
  }

  /**
   * Clean old login attempts (older than specified days)
   * @param daysOld - Age threshold in days
   * @returns Number of records deleted
   */
  async cleanOldAttempts(daysOld: number = 90): Promise<number> {
    try {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - daysOld);

      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('attemptedAt < :threshold', { threshold })
        .execute();

      return result.affected || 0;
    } catch (error) {
      logger.error('Error cleaning old attempts:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const loginSecurityService = new LoginSecurityService();
