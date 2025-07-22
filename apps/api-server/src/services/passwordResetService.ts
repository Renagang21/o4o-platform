import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';
import { emailService } from './emailService';
import { UserStatus } from '../types/auth';

export class PasswordResetService {
  private static readonly RESET_TOKEN_EXPIRY_HOURS = 1;
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<boolean> {
    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(PasswordResetToken);

    // Find user by email
    const user = await userRepo.findOne({ where: { email } });
    
    // Always return true to prevent email enumeration
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return true;
    }

    // Invalidate any existing tokens
    await tokenRepo.update(
      { userId: user.id, isUsed: false },
      { isUsed: true }
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create reset token
    const resetToken = tokenRepo.create({
      token: hashedToken,
      userId: user.id,
      user,
      expiresAt: new Date(Date.now() + this.RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    });

    await tokenRepo.save(resetToken);

    // Send email
    await emailService.sendPasswordResetEmail(email, token);

    return true;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(PasswordResetToken);

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const resetToken = await tokenRepo.findOne({
      where: {
        token: hashedToken,
        isUsed: false
      },
      relations: ['user']
    });

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    resetToken.user.password = hashedPassword;
    resetToken.user.loginAttempts = 0; // Reset login attempts
    resetToken.user.lockedUntil = null; // Unlock account if locked
    await userRepo.save(resetToken.user);

    // Mark token as used
    resetToken.isUsed = true;
    await tokenRepo.save(resetToken);

    return true;
  }

  /**
   * Request email verification
   */
  static async requestEmailVerification(userId: string): Promise<boolean> {
    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(EmailVerificationToken);

    const user = await userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      throw new Error('Email already verified');
    }

    // Invalidate any existing tokens
    await tokenRepo.update(
      { userId: user.id, isUsed: false },
      { isUsed: true }
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create verification token
    const verificationToken = tokenRepo.create({
      token: hashedToken,
      userId: user.id,
      user,
      expiresAt: new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    });

    await tokenRepo.save(verificationToken);

    // Send email
    await emailService.sendEmailVerification(user.email, token);

    return true;
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<boolean> {
    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(EmailVerificationToken);

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const verificationToken = await tokenRepo.findOne({
      where: {
        token: hashedToken,
        isUsed: false
      },
      relations: ['user']
    });

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Update user
    verificationToken.user.isEmailVerified = true;
    
    // If user was pending, approve them
    if (verificationToken.user.status === UserStatus.PENDING) {
      verificationToken.user.status = UserStatus.ACTIVE;
      verificationToken.user.approvedAt = new Date();
    }
    
    await userRepo.save(verificationToken.user);

    // Mark token as used
    verificationToken.isUsed = true;
    await tokenRepo.save(verificationToken);

    // Send welcome email
    await emailService.sendWelcomeEmail(
      verificationToken.user.email,
      verificationToken.user.name || verificationToken.user.email
    );

    return true;
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    const passwordTokenRepo = AppDataSource.getRepository(PasswordResetToken);
    const emailTokenRepo = AppDataSource.getRepository(EmailVerificationToken);

    const now = new Date();

    // Delete expired password reset tokens
    await passwordTokenRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .orWhere('isUsed = true')
      .execute();

    // Delete expired email verification tokens
    await emailTokenRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .orWhere('isUsed = true')
      .execute();
  }
}