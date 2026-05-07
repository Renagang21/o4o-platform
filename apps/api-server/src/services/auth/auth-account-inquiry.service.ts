import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import type { AuthProvider } from '../../types/account-linking.js';
import { emailService } from '../email.service.js';

/**
 * AuthAccountInquiryService
 *
 * Account existence checks, provider queries, and find-id email.
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
}
