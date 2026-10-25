import {
  recordSignupTerms,
  recordSignupPrivacy,
} from './signup-policy.service.js';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import { UserStatus } from '../../types/auth.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { AccountInactiveError } from '../../errors/AuthErrors.js';
import {
  isPasswordSessionAllowed,
  PASSWORD_SESSION_NOT_ALLOWED_CODE,
} from '../../common/auth/password-session.policy.js';
import {
  normalizeLoginEmail,
  isLoginEmailShapeValid,
  checkPasswordPolicy,
  PASSWORD_POLICY_MESSAGES,
  maskLoginEmail,
} from '@o4o/auth-utils';
import {
  normalizePhoneDigits,
  isPhoneShapeValid,
} from '../../common/auth/phone-shape.js';
import { ADMIN_SURFACE_KEY } from '../../utils/session-origin.js';
import {
  SERVICE_NOT_MEMBER_CODE,
  defaultSemiFranchiseAccessResolver,
  evaluateServiceLoginAccess,
  serviceNotMemberMessage,
  type SemiFranchiseAccessResolver,
} from '../../common/auth/service-login-eligibility.policy.js';
import {
  generateTokensWithContext,
  injectRolesIntoPublicData,
  freshenUserContext,
  type UserContext,
} from './auth-context.helper.js';
import { passwordCredentialService } from './password-credential.service.js';
import logger from '../../utils/logger.js';
import { EmailAuthRecovery } from './email-auth.recovery.js';
import { EmailAuthTokenService } from './email-auth-token.service.js';
import {
  EmailAuthError,
  EmailAuthRequestMeta,
  EmailSignupInput,
  EmailLoginInput,
  EmailAuthSession,
  VERIFICATION_TOKEN_TTL_MS,
  resolveMailLinkOrigin,
  Queryable,
  MailSender,
  PasswordStore,
  PasswordSessionIssuer,
  EmailAuthServiceDeps,
  uniqueViolation,
} from './email-auth.shared.js';

export type { EmailAuthErrorCode } from './email-auth.shared.js';
export { EmailAuthError } from './email-auth.shared.js';
export type { EmailAuthRequestMeta } from './email-auth.shared.js';
export type { EmailSignupInput } from './email-auth.shared.js';
export type { EmailLoginInput } from './email-auth.shared.js';
export type { EmailAuthSession } from './email-auth.shared.js';
export { GENERIC_MAIL_NOTICE } from './email-auth.shared.js';
export { FIND_ID_GENERIC_NOTICE } from './email-auth.shared.js';
export { VERIFICATION_TOKEN_TTL_MS } from './email-auth.shared.js';
export { RESET_TOKEN_TTL_MS } from './email-auth.shared.js';
export { hashToken } from './email-auth.shared.js';
export { resolveMailLinkOrigin } from './email-auth.shared.js';
export type { MailSender } from './email-auth.shared.js';
export type { PasswordStore } from './email-auth.shared.js';
export type { PasswordSessionIssuer } from './email-auth.shared.js';
export type { EmailAuthServiceDeps } from './email-auth.shared.js';

export class EmailAuthService {
  private readonly tokens: EmailAuthTokenService;
  private readonly _dataSource?: EmailAuthServiceDeps['dataSource'];

  private readonly passwords: PasswordStore;

  private readonly _mailer?: MailSender;

  private readonly issueSession: PasswordSessionIssuer;

  private readonly readContext: (userId: string) => Promise<UserContext>;

  private readonly now: () => Date;

  private readonly revokeAllSessions: (
    userId: string,
    manager?: EntityManager,
  ) => Promise<void>;

  private readonly readRoles: (userId: string) => Promise<string[]>;

  private readonly resolveSemiFranchiseAccess: SemiFranchiseAccessResolver;

  constructor(deps: EmailAuthServiceDeps = {}) {
    this._dataSource = deps.dataSource;
    this.passwords = deps.passwords ?? passwordCredentialService;
    this._mailer = deps.mailer;
    this.readContext = deps.readContext ?? freshenUserContext;
    this.issueSession =
      deps.issueSession ??
      ((user, sessionServiceKey, context) =>
        generateTokensWithContext(
          user,
          'neture.co.kr',
          sessionServiceKey,
          'password',
          context,
        ));
    this.now = deps.now ?? (() => new Date());
    this.tokens = new EmailAuthTokenService(() => this.dataSource, this.now);
    this.resolveSemiFranchiseAccess =
      deps.resolveSemiFranchiseAccess ?? defaultSemiFranchiseAccessResolver;
    this.revokeAllSessions =
      deps.revokeAllSessions ??
      (async (userId, manager) => {
        const { authenticationService } = await import(
          '../authentication.service.js'
        );
        await authenticationService.revokeAllSessions(userId, manager);
      });
    this.readRoles =
      deps.readRoles ??
      (async (userId) => {
        const { roleAssignmentService } = await import(
          '../../modules/auth/services/role-assignment.service.js'
        );
        return roleAssignmentService.getRoleNames(userId);
      });
  }

  private get dataSource(): NonNullable<EmailAuthServiceDeps['dataSource']> {
    return this._dataSource ?? AppDataSource;
  }

  /** 메일 모듈은 SMTP 초기화를 동반하므로 실제 사용 시점에만 불러온다(테스트 격리). */
  private async mailer(): Promise<MailSender> {
    if (this._mailer) return this._mailer;
    const mod = await import('../email.service.js');
    return mod.emailService as unknown as MailSender;
  }

  // ── 조회 ────────────────────────────────────────────────────────────────

  /**
   * 로그인 아이디(정규화 이메일)로 계정을 찾는다. 대소문자만 다른 기존 주소도 같은 아이디로 본다 —
   * `IDX_users_email` 은 대소문자를 구분하므로 DB 제약만으로는 `A@x.com` 과 `a@x.com` 이 둘 다 들어간다.
   */
  private async findUserByLoginEmail(
    email: string,
    manager?: Queryable,
  ): Promise<User | null> {
    const rows: Array<{ id: string }> = await (
      manager ?? this.dataSource
    ).query(
      `SELECT id FROM users WHERE lower(email) = $1 ORDER BY "createdAt" ASC LIMIT 2`,
      [email],
    );
    if (rows.length === 0) return null;
    if (rows.length > 1) {
      // 대소문자만 다른 주소가 이미 둘 — 어느 쪽인지 고를 근거가 없으므로 비밀번호 경로에서는 쓰지 않는다.
      logger.warn(
        '[EmailAuth] ambiguous login email (case-variant duplicates)',
      );
      return null;
    }
    return this.dataSource
      .getRepository(User)
      .findOne({ where: { id: rows[0].id } });
  }

  // ── 가입 ────────────────────────────────────────────────────────────────

  /**
   * POST /auth/email/signup — 계정 생성 + 확인 메일. **세션을 발급하지 않는다**(확인 전 로그인 불가).
   * @returns 확인 메일을 보낸 주소(가린 형태)
   */
  async signup(
    input: EmailSignupInput,
  ): Promise<{ maskedEmail: string; mailSent: boolean }> {
    if (!input.consents?.terms || !input.consents?.privacy)
      throw new EmailAuthError('CONSENT_REQUIRED');

    const email = normalizeLoginEmail(input.email);
    if (!isLoginEmailShapeValid(email))
      throw new EmailAuthError('INVALID_EMAIL');

    const name = (input.name ?? '').trim();
    if (name.length === 0 || name.length > 50)
      throw new EmailAuthError('INVALID_NAME');

    if (!isPhoneShapeValid(input.phone))
      throw new EmailAuthError('INVALID_PHONE');
    const phone = normalizePhoneDigits(input.phone);

    const violations = checkPasswordPolicy(input.password);
    if (violations.length > 0) {
      throw new EmailAuthError(
        'PASSWORD_POLICY_VIOLATION',
        violations.map((v) => PASSWORD_POLICY_MESSAGES[v]).join(' '),
        {
          violations,
        },
      );
    }

    const user = await this.dataSource.transaction(async (manager) => {
      const existing = await this.findExistingForSignup(email, manager);
      if (existing) throw existing;

      const now = this.now();
      const repo = manager.getRepository(User);
      const created = repo.create({
        email,
        name,
        phone,
        status: UserStatus.ACTIVE,
        isActive: true,
        isEmailVerified: false,
        tosAcceptedAt: now,
        privacyAcceptedAt: now,
        marketingAccepted: input.consents.marketing === true,
      });
      try {
        await repo.save(created);
      } catch (error) {
        // 동시 가입 race — 트랜잭션 롤백으로 credential 도 남지 않는다.
        if (uniqueViolation(error)) throw new EmailAuthError('EMAIL_IN_USE');
        throw error;
      }
      await this.passwords.setPassword(created.id, input.password, manager);
      await recordSignupTerms(
        created.id,
        input.policyServiceKey ?? '',
        input.consents.termsPolicy,
        manager,
      );
      await recordSignupPrivacy(
        created.id,
        input.consents.privacyPolicy,
        manager,
        input.policyServiceKey ?? '',
      );
      return created;
    });

    const mailSent = await this.sendVerificationMail(
      user,
      input.sessionServiceKey ?? null,
    );
    this.logActivity(user.id, input, true, 'email_signup').catch(() => {});
    return { maskedEmail: maskLoginEmail(email), mailSent };
  }

  /** 가입 거절 사유 — 기존 계정을 **덮어쓰지 않는다.** */
  private async findExistingForSignup(
    email: string,
    manager: Queryable,
  ): Promise<EmailAuthError | null> {
    const rows: Array<{ id: string; isEmailVerified: boolean }> =
      await manager.query(
        `SELECT id, "isEmailVerified" FROM users WHERE lower(email) = $1 LIMIT 2`,
        [email],
      );
    if (rows.length === 0) return null;
    if (
      rows.length === 1 &&
      rows[0].isEmailVerified === false &&
      (await this.passwords.hasPassword(rows[0].id, manager))
    ) {
      return new EmailAuthError('EMAIL_PENDING_VERIFICATION');
    }
    return new EmailAuthError('EMAIL_IN_USE');
  }

  // ── 이메일 확인 ─────────────────────────────────────────────────────────

  /** POST /auth/email/resend — 존재 여부를 드러내지 않는다. */
  async resendVerification(
    rawEmail: string,
    meta: EmailAuthRequestMeta,
  ): Promise<void> {
    const email = normalizeLoginEmail(rawEmail);
    if (!isLoginEmailShapeValid(email)) return;
    const user = await this.findUserByLoginEmail(email);
    if (!user || user.isEmailVerified) return;
    if (!(await this.passwords.hasPassword(user.id))) return;
    if (resolveAccountAccess(user.status) === 'blocked') return;
    await this.sendVerificationMail(user, meta.sessionServiceKey ?? null);
  }

  /** POST /auth/email/verify — 토큰 소비 → `isEmailVerified=true`. 자동 로그인하지 않는다. */
  async verifyEmail(plainToken: string): Promise<{ maskedEmail: string }> {
    return this.dataSource.transaction(async manager => {
      const row = await this.tokens.consume('verification', plainToken, manager);
      if (!row) throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');
      const repo = manager.getRepository(User);
      const user = await repo.findOne({ where: { id: row.user_id } });
      // Address validation, account update and final consumption roll back together.
      if (!user || normalizeLoginEmail(user.email) !== normalizeLoginEmail(row.email)) {
        throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');
      }
      if (!user.isEmailVerified) await repo.update({ id: user.id }, { isEmailVerified: true });
      await manager.query(
        `UPDATE email_verification_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL`, [user.id],
      );
      return { maskedEmail: maskLoginEmail(user.email) };
    });
  }

  /** Social callers must first prove the linked provider identity; this does not open an HTTP route. */
  async sendVerificationMail(
    user: User,
    sessionServiceKey: string | null,
  ): Promise<boolean> {
    return this.tokens.send('verification', user, VERIFICATION_TOKEN_TTL_MS, async plain => {
      const verifyUrl = `${resolveMailLinkOrigin(sessionServiceKey)}/verify-email#token=${encodeURIComponent(plain)}`;
      const mailer = await this.mailer();
      return mailer.sendEmail({
        to: user.email,
        subject: '[O4O] 이메일 주소를 확인해 주세요',
        template: 'email-verification',
        data: { verifyUrl, year: String(this.now().getFullYear()) },
      });
    });
  }

  // ── 로그인 ──────────────────────────────────────────────────────────────

  /** POST /auth/email/login */
  async login(input: EmailLoginInput): Promise<EmailAuthSession> {
    // 관리자 화면은 자격 확인 전에 닫는다 — 관리자 화면에서 비밀번호 대입 시도 자체를 받지 않는다.
    if (input.sessionServiceKey === ADMIN_SURFACE_KEY)
      throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);

    const email = normalizeLoginEmail(input.email);
    const user = isLoginEmailShapeValid(email)
      ? await this.findUserByLoginEmail(email)
      : null;

    // 계정 없음 · 수단 없음 · 비밀번호 틀림을 **같은 응답**으로 돌려준다(가입 여부 비노출).
    const ok = await this.passwords.verifyPassword(
      user?.id ?? null,
      input.password ?? '',
    );
    if (!user || !ok) {
      if (user)
        this.logActivity(user.id, input, false, 'invalid_credentials').catch(
          () => {},
        );
      throw new EmailAuthError('INVALID_CREDENTIALS');
    }

    if (resolveAccountAccess(user.status) === 'blocked') {
      this.logActivity(user.id, input, false, 'account_inactive').catch(
        () => {},
      );
      throw new AccountInactiveError(user.status);
    }
    if (!user.isEmailVerified) {
      throw new EmailAuthError('EMAIL_NOT_VERIFIED', undefined, {
        canResend: true,
      });
    }

    const { roles, memberships } = await this.readContext(user.id);
    if (!isPasswordSessionAllowed(input.sessionServiceKey ?? null, roles)) {
      // 세션을 발급하기 전에 자격을 판정한다.
      this.logActivity(
        user.id,
        input,
        false,
        'password_session_not_allowed',
      ).catch(() => {});
      throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);
    }
    // 인증은 성공했다 — 이제 서비스 이용 자격만 본다(INVALID_CREDENTIALS 와 다른 응답).
    //   자격이 거절되면 family를 기록하지 않는다.
    //   WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 세미프랜차이즈 자격 서비스는 Neture 기본 ∧ 세미프랜차이즈 active 도 통과.
    const access = await evaluateServiceLoginAccess(
      this.resolveSemiFranchiseAccess,
      user.id,
      input.loginMembershipGateKey,
      roles,
      memberships,
    );
    if (!access.allowed) {
      this.logActivity(user.id, input, false, 'service_not_member').catch(
        () => {},
      );
      throw new EmailAuthError(
        SERVICE_NOT_MEMBER_CODE,
        serviceNotMemberMessage(access.serviceAccess),
        undefined,
        access.serviceAccess,
      );
    }

    const { tokens } = await this.issueSession(
      user,
      input.sessionServiceKey ?? null,
      { roles, memberships },
    );
    await this.dataSource
      .getRepository(User)
      .update({ id: user.id }, { lastLoginAt: this.now() });
    this.logActivity(user.id, input, true).catch(() => {});

    const publicData = user.toPublicData() as Record<string, unknown>;
    injectRolesIntoPublicData(publicData, roles, memberships);
    return { user: publicData, tokens, isNewUser: false };
  }
  async requestPasswordReset(
    rawEmail: string,
    meta: EmailAuthRequestMeta,
  ): Promise<void> {
    return this.recovery.requestPasswordReset(rawEmail, meta);
  }
  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    return this.recovery.resetPassword(plainToken, newPassword);
  }
  async setPasswordForUser(
    userId: string,
    input: { currentPassword?: string; newPassword: string },
  ): Promise<void> {
    return this.recovery.setPasswordForUser(userId, input);
  }
  async getPasswordStatus(
    userId: string,
  ): Promise<{ hasPassword: boolean; canManage: boolean }> {
    return this.recovery.getPasswordStatus(userId);
  }
  async findLoginId(input: {
    name: string;
    phone: string;
  }): Promise<{ found: boolean; maskedEmail: string | null }> {
    return this.recovery.findLoginId(input);
  }

  // ── 내부 ────────────────────────────────────────────────────────────────

  private async logActivity(
    userId: string,
    meta: EmailAuthRequestMeta,
    success: boolean,
    reason?: string,
  ): Promise<void> {
    try {
      const repo = this.dataSource.getRepository(AccountActivity);
      await repo.save(
        repo.create({
          userId,
          type: 'login_password',
          email: null,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          success,
          details: { provider: 'password', success, ...(reason && { reason }) },
        } as Partial<AccountActivity>),
      );
    } catch (error) {
      logger.warn('[EmailAuth] failed to log activity', {
        error: (error as Error).message,
      });
    }
  }
  private _recovery?: EmailAuthRecovery;
  private get recovery(): EmailAuthRecovery {
    return (this._recovery ??= new EmailAuthRecovery({
      dataSource: () => this.dataSource,
      passwords: this.passwords,
      now: this.now,
      readRoles: this.readRoles,
      revokeAllSessions: this.revokeAllSessions,
      findUserByLoginEmail: (email) => this.findUserByLoginEmail(email),
      sendTokenMail: (kind, user, ttl, deliver) => this.tokens.send(kind, user, ttl, deliver),
      consumeToken: (kind, token, manager) =>
        this.tokens.consume(kind, token, manager),
      mailer: () => this.mailer(),
    }));
  }
}

export const emailAuthService = new EmailAuthService();
