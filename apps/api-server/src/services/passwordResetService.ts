import crypto from 'crypto';
import { hashPassword } from '../utils/auth.utils.js';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { PasswordResetToken } from '../entities/PasswordResetToken.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { ServiceCredential } from '../modules/auth/entities/ServiceCredential.js';
import { emailService } from './email.service.js';
import { UserStatus } from '../types/auth.js';
import { getServiceName, getServiceOrigin } from '../config/service-catalog.js';

export class PasswordResetService {
  private static readonly RESET_TOKEN_EXPIRY_HOURS = 1;
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

  /**
   * Request password reset
   *
   * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1:
   * serviceKey 제공 시:
   *   1. 해당 서비스 membership 존재 여부 검증
   *   2. 토큰에 serviceKey 저장
   *   3. 이메일에 서비스명 표시
   * 미제공 시: 기존 전역 방식 fallback (호환 유지)
   */
  static async requestPasswordReset(email: string, serviceKey?: string, serviceUrl?: string): Promise<boolean> {
    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(PasswordResetToken);

    // Find user by email
    const user = await userRepo.findOne({ where: { email } });

    // Always return true to prevent email enumeration
    if (!user) {
      return true;
    }

    // WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1: serviceKey 제공 시 membership 검증
    if (serviceKey) {
      const membershipRows = await AppDataSource.query(
        `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
        [user.id, serviceKey]
      );
      // membership 없으면 이메일 열거 방지 목적으로 true 반환 (에러 노출 금지)
      if (membershipRows.length === 0) {
        return true;
      }
    }

    // Invalidate any existing tokens for this user (+serviceKey 범위로 무효화)
    if (serviceKey) {
      await tokenRepo.update(
        { userId: user.id, usedAt: null, serviceKey },
        { usedAt: new Date() }
      );
      // serviceKey 없는 기존 전역 토큰도 함께 무효화
      await AppDataSource.query(
        `UPDATE "password_reset_tokens" SET "usedAt" = NOW()
         WHERE "userId" = $1 AND "usedAt" IS NULL AND service_key IS NULL`,
        [user.id]
      );
    } else {
      await tokenRepo.update(
        { userId: user.id, usedAt: null },
        { usedAt: new Date() }
      );
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create reset token (serviceKey 포함)
    const resetToken = tokenRepo.create({
      token: hashedToken,
      userId: user.id,
      email: user.email,
      user,
      serviceKey: serviceKey ?? null,
      expiresAt: new Date(Date.now() + this.RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    });

    await tokenRepo.save(resetToken);

    // Send email with service name
    // WO-O4O-PASSWORD-RESET-EMAIL-LINK-PRODUCTION-URL-FIX-V1: reset URL 결정 우선순위
    //   1. 클라이언트가 명시적으로 보낸 serviceUrl (controller 에서 ALLOWED_ORIGINS 화이트리스트 검증 완료)
    //   2. serviceKey 가 있으면 service-catalog 의 production origin (`https://{domain}`)
    //   3. 둘 다 없으면 mail-core 의 라이브러리 기본값 (legacy 전역 reset)
    // 운영에서 클라이언트가 serviceUrl 을 누락해도 serviceKey 만 있으면 항상 production URL 로 발송된다.
    const effectiveServiceUrl =
      serviceUrl ?? (serviceKey ? getServiceOrigin(serviceKey) : undefined);
    const serviceName = serviceKey ? getServiceName(serviceKey) : undefined;
    await emailService.sendPasswordResetEmail(email, token, effectiveServiceUrl, serviceName);

    return true;
  }

  /**
   * Reset password with token
   *
   * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1:
   * serviceKey 제공 시 토큰의 serviceKey와 일치하는지 검증한다.
   * 불일치 시 토큰 유효성 오류로 처리 (다른 서비스 토큰 재사용 방지).
   */
  static async resetPassword(token: string, newPassword: string, serviceKey?: string): Promise<boolean> {
    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(PasswordResetToken);

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const resetToken = await tokenRepo.findOne({
      where: {
        token: hashedToken,
        usedAt: null
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

    // WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1: serviceKey 일치 검증
    // 토큰에 serviceKey가 있고 요청 serviceKey와 불일치 시 거부
    if (resetToken.serviceKey && serviceKey && resetToken.serviceKey !== serviceKey) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-RESET-V1: write 대상 분기
    //   token.serviceKey 존재 → service_credentials (V2 path, L2 Credential)
    //   미존재               → users.password (V1 fallback)
    // 두 경로 모두 user 의 lockout 상태 (loginAttempts/lockedUntil) 는 user-global 이므로 함께 reset.
    // V2 path 에서는 users.password 를 건드리지 않는다 (legacy fallback 보존).
    if (resetToken.serviceKey) {
      const credRepo = AppDataSource.getRepository(ServiceCredential);
      await credRepo.upsert(
        {
          userId: resetToken.userId,
          serviceKey: resetToken.serviceKey,
          passwordHash: hashedPassword,
        },
        ['userId', 'serviceKey'],
      );
      resetToken.user.loginAttempts = 0;
      resetToken.user.lockedUntil = null;
      await userRepo.save(resetToken.user);
    } else {
      resetToken.user.password = hashedPassword;
      resetToken.user.loginAttempts = 0;
      resetToken.user.lockedUntil = null;
      await userRepo.save(resetToken.user);
    }

    // Mark token as used
    resetToken.usedAt = new Date();
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
      .orWhere('usedAt IS NOT NULL')
      .execute();

    // Delete expired email verification tokens
    await emailTokenRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .orWhere('usedAt IS NOT NULL')
      .execute();
  }
}