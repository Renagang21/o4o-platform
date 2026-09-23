/**
 * EmailVerificationService
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   구 `passwordResetService.ts` 에서 **email 인증 축만** 분리해 온 파일이다.
 *   password reset 축(`requestPasswordReset` · `resetPassword`)은 은퇴했고,
 *   소비처 0 이던 `cleanupExpiredTokens` 도 함께 제거했다.
 *
 *   email 인증은 password 와 독립이다 — email 은 인증 키가 아니라 연락처 값이고,
 *   이 경로는 그 값의 소유 확인만 한다. 인증 정본은 Google sub → users.id 다.
 */
import crypto from 'crypto';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { emailService } from './email.service.js';
import { UserStatus } from '../types/auth.js';
import { getServiceName, getServiceOrigin } from '../config/service-catalog.js';

export class EmailVerificationService {
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

  /**
   * Request email verification
   *
   * WO-O4O-EMAIL-VERIFICATION-LINK-PRODUCTION-URL-FIX-V1:
   *   serviceKey 가 제공되면 이메일 링크의 base URL 을 해당 서비스의 production origin 으로 결정한다.
   *   *   미제공 시 mail-core 라이브러리의 fallback 으로 위임.
   */
  static async requestEmailVerification(userId: string, serviceKey?: string): Promise<boolean> {
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
      { userId: user.id, usedAt: null },
      { usedAt: new Date() }
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create verification token
    const verificationToken = tokenRepo.create({
      token: hashedToken,
      userId: user.id,
      email: user.email,
      user,
      expiresAt: new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    });

    await tokenRepo.save(verificationToken);

    // Send email — serviceKey 기반 origin / serviceName 주입 (PASSWORD_RESET 과 동일 패턴)
    const verifyServiceUrl = serviceKey ? getServiceOrigin(serviceKey) : undefined;
    const verifyServiceName = serviceKey ? getServiceName(serviceKey) : undefined;
    await emailService.sendEmailVerification(user.email, token, verifyServiceUrl, verifyServiceName);

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
        usedAt: null
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
    verificationToken.usedAt = new Date();
    await tokenRepo.save(verificationToken);

    // Send welcome email
    await emailService.sendWelcomeEmail(
      verificationToken.user.email,
      verificationToken.user.name || verificationToken.user.email
    );

    return true;
  }
}
