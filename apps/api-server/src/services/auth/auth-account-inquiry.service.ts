import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { UserRole, UserStatus } from '../../types/auth.js';
import type { AuthProvider } from '../../types/account-linking.js';
import { hashPassword, comparePassword } from '../../utils/auth.utils.js';
import { emailService } from '../email.service.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';

/**
 * AuthAccountInquiryService
 *
 * Account existence checks, provider queries, test accounts,
 * and find-id email.
 *
 * Extracted from AuthenticationService (WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1).
 */
export class AuthAccountInquiryService {
  // Lazy repositories
  private _userRepo?: Repository<User>;
  private _linkedAccountRepo?: Repository<LinkedAccount>;

  private get userRepository(): Repository<User> {
    if (!this._userRepo) {
      this._userRepo = AppDataSource.getRepository(User);
    }
    return this._userRepo;
  }

  private get linkedAccountRepository(): Repository<LinkedAccount> {
    if (!this._linkedAccountRepo) {
      this._linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    }
    return this._linkedAccountRepo;
  }

  /**
   * Check if user can login with specific provider
   */
  async canLogin(email: string, provider: AuthProvider): Promise<boolean> {
    const account = await this.linkedAccountRepository.findOne({
      where: { email, provider },
    });

    return !!account;
  }

  /**
   * Get available login providers for email
   */
  async getAvailableProviders(email: string): Promise<AuthProvider[]> {
    // Check linked accounts
    const linkedAccounts = await this.linkedAccountRepository.find({
      where: { email },
    });

    const providers = linkedAccounts.map((acc) => acc.provider);

    // Check if user has password (can use email login)
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (user && user.password) {
      if (!providers.includes('email')) {
        providers.push('email');
      }
    }

    return providers;
  }

  /**
   * Get test accounts for development/staging
   * Returns one user per role: admin, seller, supplier, partner, customer
   * Auto-creates test accounts if they don't exist
   */
  async getTestAccounts(): Promise<Array<{ role: string; email: string; password: string }>> {
    // Define roles we want to show in test panel
    const targetRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.SELLER,
      UserRole.SUPPLIER,
      UserRole.PARTNER,
      UserRole.USER,
    ];
    const testAccounts: Array<{ role: string; email: string; password: string }> = [];

    // All test accounts use the same password for convenience
    const testPassword = 'test123!@#';

    // Find or create one user for each role
    for (const role of targetRoles) {
      // role column removed - find test user by email pattern only
      let user = await this.userRepository
        .createQueryBuilder('user')
        .andWhere('(user.email LIKE :pattern1 OR user.email LIKE :pattern2)', {
          pattern1: '%@test.com',
          pattern2: '%test%',
        })
        .andWhere('user.email LIKE :rolePattern', { rolePattern: `%${role}%` })
        .select(['user.id', 'user.email', 'user.password', 'user.status', 'user.isEmailVerified'])
        .limit(1)
        .getOne();

      // If user doesn't exist, create one
      if (!user) {
        const testEmail = `${role}@test.com`;
        user = this.userRepository.create({
          email: testEmail,
          name: `Test ${this.getRoleLabel(role)}`,
          password: await hashPassword(testPassword),
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          permissions: [],
        });
        await this.userRepository.save(user);
        await roleAssignmentService.assignRole({ userId: user.id, role });
        logger.info(`Created test account: ${testEmail} (${role})`);
      } else {
        // Update password and status if needed
        let needsUpdate = false;
        const isCorrectPassword = await comparePassword(testPassword, user.password || '');
        if (!isCorrectPassword) {
          user.password = await hashPassword(testPassword);
          needsUpdate = true;
        }
        if (user.status !== UserStatus.ACTIVE) {
          user.status = UserStatus.ACTIVE;
          needsUpdate = true;
        }
        if (!user.isEmailVerified) {
          user.isEmailVerified = true;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.userRepository.save(user);
          logger.info(`Updated test account: ${user.email} (status: ACTIVE, verified: true)`);
        }
      }

      // WO-O4O-USER-ROLES-RUNTIME-FIELD-CLEANUP-V1: user.roles is runtime-only (not from DB), use loop role directly
      testAccounts.push({
        role: this.getRoleLabel(role),
        email: user.email,
        password: testPassword,
      });
    }

    return testAccounts;
  }

  /**
   * Send find ID email
   */
  async sendFindIdEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Mask email/username for security
    const maskedEmail = this.maskEmail(user.email);

    await emailService.sendEmail({
      to: email,
      subject: '아이디 찾기 결과',
      html: `
        <h2>아이디 찾기</h2>
        <p>입력하신 이메일로 등록된 계정 정보입니다:</p>
        <p><strong>이메일:</strong> ${maskedEmail}</p>
        <p>로그인 페이지: <a href="${process.env.FRONTEND_URL}/login">로그인하기</a></p>
        <p>비밀번호를 잊으셨다면 <a href="${process.env.FRONTEND_URL}/find-password">비밀번호 찾기</a>를 이용해주세요.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
      `,
    });
  }

  /**
   * Helper: Mask email for privacy
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 3) {
      return `${local[0]}***@${domain}`;
    }
    const masked = local.substring(0, 3) + '***';
    return `${masked}@${domain}`;
  }

  /**
   * Helper: Get role label in Korean
   */
  private getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      user: '사용자',
      member: '멤버',
      contributor: '기여자',
      seller: '판매자',
      vendor: '벤더',
      partner: '파트너',
      operator: '운영자',
      admin: '관리자',
      customer: '고객',
      supplier: '공급자',
    };
    return labels[role] || role;
  }
}
