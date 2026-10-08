/**
 * @core O4O_PLATFORM_CORE — Auth
 * EmailAuthService — 이메일·비밀번호 가입 · 확인 · 로그인 · 재설정 · 아이디 찾기
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 (사용자 승인 2026-09-29) — 사용자 명시 WO 로 Core 예외 승인
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 불변식
 *
 *   ① 계정 식별자는 `users.id` 하나다. 이메일은 **로그인 아이디**이고, Google 경로와 같은 계정을
 *      공유하지 않는다 — 같은 이메일로 이미 계정이 있으면 가입을 거절하고 **자동 병합하지 않는다.**
 *      (Google sub → users.id 경로는 이 파일을 거치지 않는다. G2 guard 의 대상도 아니다.)
 *   ② 가입은 users 1행 + user_password_credentials 1행만 만든다.
 *      role_assignments · service_memberships · organization_members 를 **만들지 않는다.**
 *      서비스 가입은 기존 `POST /auth/services/:serviceKey/join` 이 담당한다.
 *   ③ 관리자(`platform:*`)와 관리자 화면(origin=admin)은 비밀번호 세션을 받지 않는다(Google 전용).
 *      판정은 `password-session.policy` 한 곳이다.
 *   ④ 평문 비밀번호 · 평문 토큰 · 메일 링크 URL 을 **로그 · DB · 응답에 남기지 않는다.**
 *      토큰은 SHA-256 해시만 저장한다. 링크의 평문 토큰은 메일 본문에만 존재한다.
 *      링크는 토큰을 query 가 아닌 **fragment(`#token=`)** 에 싣는다 — fragment 는 HTTP 요청에 실리지 않아
 *      웹 서버 · Cloud Run 요청 로그에 남지 않는다. 화면이 fragment 에서 읽어 JSON body 로 보낸다.
 *   ⑤ 확인 메일이 가는 곳만 확인된 주소다. 로그인은 `users.isEmailVerified=true` 일 때만 발급한다.
 *   ⑥ 비밀번호 재설정은 `revokeAllSessions` 을 호출해 전역 폐기(`refreshTokenFamily=null`)를 한다.
 */
import crypto from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import { UserStatus } from '../../types/auth.js';
import type { AuthTokens } from '../../types/auth.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { AccountInactiveError } from '../../errors/AuthErrors.js';
import {
  isPasswordSessionAllowed,
  hasPlatformRole,
  PASSWORD_SESSION_NOT_ALLOWED_CODE,
  PASSWORD_SESSION_NOT_ALLOWED_MESSAGE,
} from '../../common/auth/password-session.policy.js';
import {
  normalizeLoginEmail,
  isLoginEmailShapeValid,
  checkPasswordPolicy,
  PASSWORD_POLICY_MESSAGES,
  maskLoginEmail,
} from '@o4o/auth-utils';
import { normalizePhoneDigits, isPhoneShapeValid } from '../../common/auth/phone-shape.js';
import { ADMIN_SURFACE_KEY } from '../../utils/session-origin.js';
import {
  SERVICE_NOT_MEMBER_CODE,
  SERVICE_NOT_MEMBER_MESSAGE,
  defaultSemiFranchiseAccessResolver,
  evaluateServiceLoginAccess,
  serviceNotMemberMessage,
  type SemiFranchiseAccessResolver,
} from '../../common/auth/service-login-eligibility.policy.js';
import type { SemiFranchiseAccessDetails } from '../../modules/neture-pharmacy/services/semi-franchise-service-access.js';
import { getServiceOrigin } from '../../config/service-catalog.js';
import { generateTokensWithContext, injectRolesIntoPublicData } from './auth-context.helper.js';
import { passwordCredentialService } from './password-credential.service.js';
// Demo 보호 — 판정 정본은 demo_accounts.user_id 하나다(이메일 문자열 비교 금지).
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from './demo-account.service.js';
import * as tokenUtils from '../../utils/token.utils.js';
import logger from '../../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// 오류
// ─────────────────────────────────────────────────────────────────────────────

export type EmailAuthErrorCode =
  | 'CONSENT_REQUIRED'
  | 'INVALID_EMAIL'
  | 'INVALID_NAME'
  | 'INVALID_PHONE'
  | 'PASSWORD_POLICY_VIOLATION'
  | 'EMAIL_IN_USE'
  | 'EMAIL_PENDING_VERIFICATION'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_OR_EXPIRED_TOKEN'
  | 'CURRENT_PASSWORD_REQUIRED'
  | 'CURRENT_PASSWORD_MISMATCH'
  | typeof DEMO_ACCOUNT_FORBIDDEN_CODE
  | typeof PASSWORD_SESSION_NOT_ALLOWED_CODE
  | typeof SERVICE_NOT_MEMBER_CODE;

const STATUS: Record<EmailAuthErrorCode, number> = {
  CONSENT_REQUIRED: 400,
  INVALID_EMAIL: 400,
  INVALID_NAME: 400,
  INVALID_PHONE: 400,
  PASSWORD_POLICY_VIOLATION: 400,
  EMAIL_IN_USE: 409,
  EMAIL_PENDING_VERIFICATION: 409,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  INVALID_OR_EXPIRED_TOKEN: 400,
  CURRENT_PASSWORD_REQUIRED: 400,
  CURRENT_PASSWORD_MISMATCH: 400,
  DEMO_ACCOUNT_FORBIDDEN: 403,
  PASSWORD_SESSION_NOT_ALLOWED: 403,
  SERVICE_NOT_MEMBER: 403,
};

const MESSAGE: Record<EmailAuthErrorCode, string> = {
  CONSENT_REQUIRED: '이용약관과 개인정보 처리방침에 동의해야 합니다.',
  INVALID_EMAIL: '올바른 이메일 주소를 입력해 주세요.',
  INVALID_NAME: '이름을 입력해 주세요.',
  INVALID_PHONE: '휴대전화 번호를 확인해 주세요. (예: 01012345678)',
  PASSWORD_POLICY_VIOLATION: '비밀번호 규칙을 확인해 주세요.',
  EMAIL_IN_USE:
    '이미 가입된 이메일입니다. 처음 가입한 방법(Google 또는 이메일)으로 로그인해 주세요. 기존 계정과 자동으로 합쳐지지 않습니다.',
  EMAIL_PENDING_VERIFICATION:
    '이 이메일로 가입 신청이 이미 있습니다. 받은 편지함의 확인 메일을 열거나, 확인 메일을 다시 받아 주세요. 비밀번호가 기억나지 않으면 비밀번호 찾기를 이용해 주세요.',
  INVALID_CREDENTIALS:
    '이메일 또는 비밀번호가 올바르지 않습니다. Google 로 가입했다면 Google 로그인을 이용해 주세요.',
  EMAIL_NOT_VERIFIED: '이메일 확인이 아직 끝나지 않았습니다. 받은 편지함의 확인 메일을 열어 주세요.',
  INVALID_OR_EXPIRED_TOKEN: '링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.',
  CURRENT_PASSWORD_REQUIRED: '현재 비밀번호를 입력해 주세요.',
  CURRENT_PASSWORD_MISMATCH: '현재 비밀번호가 올바르지 않습니다.',
  DEMO_ACCOUNT_FORBIDDEN: DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
  PASSWORD_SESSION_NOT_ALLOWED: PASSWORD_SESSION_NOT_ALLOWED_MESSAGE,
  SERVICE_NOT_MEMBER: SERVICE_NOT_MEMBER_MESSAGE,
};

export class EmailAuthError extends Error {
  readonly statusCode: number;
  constructor(
    readonly code: EmailAuthErrorCode,
    message?: string,
    readonly details?: Record<string, unknown>,
    /** SERVICE_NOT_MEMBER 의 세미프랜차이즈 자격 상태 — 응답 최상위 `serviceAccess` (WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1) */
    readonly serviceAccess?: SemiFranchiseAccessDetails,
  ) {
    super(message || MESSAGE[code]);
    this.name = 'EmailAuthError';
    this.statusCode = STATUS[code];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 입력 · 결과
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailAuthRequestMeta {
  ipAddress: string;
  userAgent: string;
  /** origin 파생 세션 귀속 키 (`resolveSessionServiceKey`). 본문 값이 아니다. */
  sessionServiceKey?: string | null;
  /**
   * origin 파생 로그인 자격 게이트 서비스 (`resolveLoginMembershipGateKey`). 없으면 판정하지 않는다.
   * WO-O4O-SERVICE-NOT-MEMBER-AUTH-CONTRACT-RESTORATION-V1 — 로그인에만 쓴다(가입 · 기타 흐름은 무시).
   */
  loginMembershipGateKey?: string | null;
}

export interface EmailSignupInput extends EmailAuthRequestMeta {
  email: string;
  password: string;
  name: string;
  phone: string;
  consents: { terms: boolean; privacy: boolean; marketing?: boolean };
}

export interface EmailLoginInput extends EmailAuthRequestMeta {
  email: string;
  password: string;
}

export interface EmailAuthSession {
  user: Record<string, unknown>;
  tokens: AuthTokens;
  isNewUser: false;
}

/** 이메일 존재 여부를 드러내지 않는 공통 응답 문구 */
export const GENERIC_MAIL_NOTICE =
  '입력한 주소로 가입된 계정이 있으면 메일을 보냈습니다. 몇 분 안에 오지 않으면 스팸함을 확인해 주세요.';
export const FIND_ID_GENERIC_NOTICE =
  '입력한 정보와 일치하는 계정을 하나로 특정할 수 없습니다. 가입한 이름과 휴대전화 번호를 다시 확인하거나, Google 로 가입했다면 Google 로그인을 이용해 주세요.';

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 (1회용 · 해시만 저장)
// ─────────────────────────────────────────────────────────────────────────────

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

type TokenKind = 'verification' | 'reset';

/** 테이블 이름은 고정 목록에서만 나온다 — 입력값을 SQL 식별자로 쓰지 않는다. */
const TOKEN_TABLE: Record<TokenKind, 'email_verification_tokens' | 'password_reset_tokens'> = {
  verification: 'email_verification_tokens',
  reset: 'password_reset_tokens',
};

export function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain, 'utf8').digest('hex');
}

function newPlainToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** 이 서비스가 확인·재설정 화면을 가진 서비스 — 메일 링크의 origin 후보 */
const SERVICES_WITH_EMAIL_AUTH_PAGES: ReadonlySet<string> = new Set(['neture']);
const FALLBACK_LINK_SERVICE = 'neture';

export function resolveMailLinkOrigin(sessionServiceKey: string | null | undefined): string {
  const key =
    sessionServiceKey && SERVICES_WITH_EMAIL_AUTH_PAGES.has(sessionServiceKey)
      ? sessionServiceKey
      : FALLBACK_LINK_SERVICE;
  return getServiceOrigin(key) ?? 'https://neture.co.kr';
}

// ─────────────────────────────────────────────────────────────────────────────
// 의존성 (테스트에서 주입)
// ─────────────────────────────────────────────────────────────────────────────

type Queryable = Pick<EntityManager, 'query'>;

export interface MailSender {
  sendEmail(options: {
    to: string;
    subject: string;
    template?: string;
    data?: any;
    html?: string;
  }): Promise<{ success: boolean; error?: string }>;
}

export type PasswordStore = Pick<typeof passwordCredentialService, 'hasPassword' | 'setPassword' | 'verifyPassword'>;

export type PasswordSessionIssuer = (
  user: User,
  sessionServiceKey: string | null,
) => Promise<{ tokens: AuthTokens; roles: string[]; memberships: { serviceKey: string; status: string; role?: string }[] }>;

export interface EmailAuthServiceDeps {
  dataSource?: Pick<DataSource, 'getRepository' | 'transaction' | 'query'>;
  passwords?: PasswordStore;
  mailer?: MailSender;
  issueSession?: PasswordSessionIssuer;
  /** 보안 이벤트에 대한 전역 세션 폐기. 기본값은 `authenticationService.revokeAllSessions`. */
  revokeAllSessions?: (userId: string) => Promise<void>;
  /** 역할 이름 조회. 기본값은 `roleAssignmentService.getRoleNames`. */
  readRoles?: (userId: string) => Promise<string[]>;
  now?: () => Date;
  /** 세미프랜차이즈 이용 자격 조회. 기본값은 `defaultSemiFranchiseAccessResolver`. */
  resolveSemiFranchiseAccess?: SemiFranchiseAccessResolver;
}

function uniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; driverError?: { code?: string } };
  return (e?.code ?? e?.driverError?.code) === '23505';
}

// ─────────────────────────────────────────────────────────────────────────────

export class EmailAuthService {
  private readonly _dataSource?: EmailAuthServiceDeps['dataSource'];
  private readonly passwords: PasswordStore;
  private readonly _mailer?: MailSender;
  private readonly issueSession: PasswordSessionIssuer;
  private readonly now: () => Date;
  private readonly revokeAllSessions: (userId: string) => Promise<void>;
  private readonly readRoles: (userId: string) => Promise<string[]>;
  private readonly resolveSemiFranchiseAccess: SemiFranchiseAccessResolver;

  constructor(deps: EmailAuthServiceDeps = {}) {
    this._dataSource = deps.dataSource;
    this.passwords = deps.passwords ?? passwordCredentialService;
    this._mailer = deps.mailer;
    this.issueSession =
      deps.issueSession ??
      ((user, sessionServiceKey) => generateTokensWithContext(user, 'neture.co.kr', sessionServiceKey, 'password'));
    this.now = deps.now ?? (() => new Date());
    this.resolveSemiFranchiseAccess = deps.resolveSemiFranchiseAccess ?? defaultSemiFranchiseAccessResolver;
    this.revokeAllSessions =
      deps.revokeAllSessions ??
      (async (userId) => {
        const { authenticationService } = await import('../authentication.service.js');
        await authenticationService.revokeAllSessions(userId);
      });
    this.readRoles =
      deps.readRoles ??
      (async (userId) => {
        const { roleAssignmentService } = await import('../../modules/auth/services/role-assignment.service.js');
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
  private async findUserByLoginEmail(email: string, manager?: Queryable): Promise<User | null> {
    const rows: Array<{ id: string }> = await (manager ?? this.dataSource).query(
      `SELECT id FROM users WHERE lower(email) = $1 ORDER BY "createdAt" ASC LIMIT 2`,
      [email],
    );
    if (rows.length === 0) return null;
    if (rows.length > 1) {
      // 대소문자만 다른 주소가 이미 둘 — 어느 쪽인지 고를 근거가 없으므로 비밀번호 경로에서는 쓰지 않는다.
      logger.warn('[EmailAuth] ambiguous login email (case-variant duplicates)');
      return null;
    }
    return this.dataSource.getRepository(User).findOne({ where: { id: rows[0].id } });
  }

  // ── 가입 ────────────────────────────────────────────────────────────────

  /**
   * POST /auth/email/signup — 계정 생성 + 확인 메일. **세션을 발급하지 않는다**(확인 전 로그인 불가).
   * @returns 확인 메일을 보낸 주소(가린 형태)
   */
  async signup(input: EmailSignupInput): Promise<{ maskedEmail: string; mailSent: boolean }> {
    if (!input.consents?.terms || !input.consents?.privacy) throw new EmailAuthError('CONSENT_REQUIRED');

    const email = normalizeLoginEmail(input.email);
    if (!isLoginEmailShapeValid(email)) throw new EmailAuthError('INVALID_EMAIL');

    const name = (input.name ?? '').trim();
    if (name.length === 0 || name.length > 50) throw new EmailAuthError('INVALID_NAME');

    if (!isPhoneShapeValid(input.phone)) throw new EmailAuthError('INVALID_PHONE');
    const phone = normalizePhoneDigits(input.phone);

    const violations = checkPasswordPolicy(input.password);
    if (violations.length > 0) {
      throw new EmailAuthError('PASSWORD_POLICY_VIOLATION', violations.map((v) => PASSWORD_POLICY_MESSAGES[v]).join(' '), {
        violations,
      });
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
      return created;
    });

    const mailSent = await this.sendVerificationMail(user, input.sessionServiceKey ?? null);
    this.logActivity(user.id, input, true, 'email_signup').catch(() => {});
    return { maskedEmail: maskLoginEmail(email), mailSent };
  }

  /** 가입 거절 사유 — 기존 계정을 **덮어쓰지 않는다.** */
  private async findExistingForSignup(email: string, manager: Queryable): Promise<EmailAuthError | null> {
    const rows: Array<{ id: string; isEmailVerified: boolean }> = await manager.query(
      `SELECT id, "isEmailVerified" FROM users WHERE lower(email) = $1 LIMIT 2`,
      [email],
    );
    if (rows.length === 0) return null;
    if (rows.length === 1 && rows[0].isEmailVerified === false && (await this.passwords.hasPassword(rows[0].id, manager))) {
      return new EmailAuthError('EMAIL_PENDING_VERIFICATION');
    }
    return new EmailAuthError('EMAIL_IN_USE');
  }

  // ── 이메일 확인 ─────────────────────────────────────────────────────────

  /** POST /auth/email/resend — 존재 여부를 드러내지 않는다. */
  async resendVerification(rawEmail: string, meta: EmailAuthRequestMeta): Promise<void> {
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
    const row = await this.consumeToken('verification', plainToken);
    if (!row) throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');

    const user = await this.dataSource.getRepository(User).findOne({ where: { id: row.user_id } });
    // 토큰 발급 뒤 주소가 바뀌었으면 옛 주소의 확인은 현재 주소를 확인하지 않는다.
    if (!user || normalizeLoginEmail(user.email) !== normalizeLoginEmail(row.email)) {
      throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');
    }
    if (!user.isEmailVerified) {
      await this.dataSource.getRepository(User).update({ id: user.id }, { isEmailVerified: true });
    }
    return { maskedEmail: maskLoginEmail(user.email) };
  }

  private async sendVerificationMail(user: User, sessionServiceKey: string | null): Promise<boolean> {
    const plain = await this.issueToken('verification', user.id, VERIFICATION_TOKEN_TTL_MS, normalizeLoginEmail(user.email));
    const verifyUrl = `${resolveMailLinkOrigin(sessionServiceKey)}/verify-email#token=${encodeURIComponent(plain)}`;
    try {
      const mailer = await this.mailer();
      const result = await mailer.sendEmail({
        to: user.email,
        subject: '[O4O] 이메일 주소를 확인해 주세요',
        template: 'email-verification',
        data: { verifyUrl, year: String(this.now().getFullYear()) },
      });
      if (!result.success) logger.warn('[EmailAuth] verification mail not sent', { error: result.error });
      return result.success;
    } catch (error) {
      logger.warn('[EmailAuth] verification mail failed', { error: (error as Error).message });
      return false;
    }
  }

  // ── 로그인 ──────────────────────────────────────────────────────────────

  /** POST /auth/email/login */
  async login(input: EmailLoginInput): Promise<EmailAuthSession> {
    // 관리자 화면은 자격 확인 전에 닫는다 — 관리자 화면에서 비밀번호 대입 시도 자체를 받지 않는다.
    if (input.sessionServiceKey === ADMIN_SURFACE_KEY) throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);

    const email = normalizeLoginEmail(input.email);
    const user = isLoginEmailShapeValid(email) ? await this.findUserByLoginEmail(email) : null;

    // 계정 없음 · 수단 없음 · 비밀번호 틀림을 **같은 응답**으로 돌려준다(가입 여부 비노출).
    const ok = await this.passwords.verifyPassword(user?.id ?? null, input.password ?? '');
    if (!user || !ok) {
      if (user) this.logActivity(user.id, input, false, 'invalid_credentials').catch(() => {});
      throw new EmailAuthError('INVALID_CREDENTIALS');
    }

    if (resolveAccountAccess(user.status) === 'blocked') {
      this.logActivity(user.id, input, false, 'account_inactive').catch(() => {});
      throw new AccountInactiveError(user.status);
    }
    if (!user.isEmailVerified) {
      throw new EmailAuthError('EMAIL_NOT_VERIFIED', undefined, { canResend: true });
    }

    const { tokens, roles, memberships } = await this.issueSession(user, input.sessionServiceKey ?? null);
    if (!isPasswordSessionAllowed(input.sessionServiceKey ?? null, roles)) {
      // 발급한 토큰은 쿠키·응답에 싣지 않고 버린다(DB 쓰기 전이므로 family 도 남지 않는다).
      this.logActivity(user.id, input, false, 'password_session_not_allowed').catch(() => {});
      throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);
    }
    // 인증은 성공했다 — 이제 서비스 이용 자격만 본다(INVALID_CREDENTIALS 와 다른 응답).
    //   발급한 토큰은 위와 같이 버린다(DB 쓰기 전).
    //   WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 세미프랜차이즈 자격 서비스는 Neture 기본 ∧ 세미프랜차이즈 active 도 통과.
    const access = await evaluateServiceLoginAccess(
      this.resolveSemiFranchiseAccess, user.id, input.loginMembershipGateKey, roles, memberships,
    );
    if (!access.allowed) {
      this.logActivity(user.id, input, false, 'service_not_member').catch(() => {});
      throw new EmailAuthError(
        SERVICE_NOT_MEMBER_CODE, serviceNotMemberMessage(access.serviceAccess), undefined, access.serviceAccess,
      );
    }

    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    await this.dataSource.getRepository(User).update(
      { id: user.id },
      { lastLoginAt: this.now(), ...(tokenFamily && { refreshTokenFamily: tokenFamily }) },
    );
    this.logActivity(user.id, input, true).catch(() => {});

    const publicData = user.toPublicData() as Record<string, unknown>;
    injectRolesIntoPublicData(publicData, roles, memberships);
    return { user: publicData, tokens, isNewUser: false };
  }

  // ── 비밀번호 재설정 ─────────────────────────────────────────────────────

  /** POST /auth/password/forgot — 존재 여부를 드러내지 않는다. */
  async requestPasswordReset(rawEmail: string, meta: EmailAuthRequestMeta): Promise<void> {
    const email = normalizeLoginEmail(rawEmail);
    if (!isLoginEmailShapeValid(email)) return;
    const user = await this.findUserByLoginEmail(email);
    if (!user || resolveAccountAccess(user.status) === 'blocked') return;
    // Demo 계정: 비밀번호가 고정이고 메일을 받지 않는다 — 토큰·메일을 만들지 않는다.
    //   응답은 기존 일반 안내 그대로다(여기서 다른 문구를 내면 Demo 여부가 드러난다).
    if (await demoAccountService.isDemoAccount(user.id, this.dataSource)) return;
    // 관리자는 비밀번호 수단을 쓰지 않는다 — 재설정으로 새 수단을 만들게 하지 않는다.
    if (hasPlatformRole(await this.readRoles(user.id))) return;
    // 2026-10-01 정책 변경 (PR #257 Codex 재리뷰 P1): forgot/reset 은 **이미 비밀번호 수단이 있는 계정의 복구**에만 쓴다.
    //   비밀번호가 없는 계정(Google 전용 등)은 주소가 확인돼 있어도 메일 · 토큰을 만들지 않는다 —
    //   메일함 접근만으로 새 로그인 수단을 만들 수 없다. 첫 비밀번호 추가는 로그인 상태의 `POST /auth/password` 뿐.
    //   (종전 S1-CLOSURE 는 "확인된 주소면 재설정으로 첫 수단 추가 허용"이었다 — 이 줄로 대체.)
    //   다른 조용한 return 과 같은 결과 — 발송 여부로 계정 존재를 추론할 수 없다.
    if (!(await this.passwords.hasPassword(user.id))) return;

    const plain = await this.issueToken('reset', user.id, RESET_TOKEN_TTL_MS);
    const resetUrl = `${resolveMailLinkOrigin(meta.sessionServiceKey ?? null)}/reset-password#token=${encodeURIComponent(plain)}`;
    try {
      const mailer = await this.mailer();
      const result = await mailer.sendEmail({
        to: user.email,
        subject: '[O4O] 비밀번호 재설정 안내',
        html: renderResetMailHtml(resetUrl, this.now().getFullYear()),
      });
      if (!result.success) logger.warn('[EmailAuth] reset mail not sent', { error: result.error });
    } catch (error) {
      logger.warn('[EmailAuth] reset mail failed', { error: (error as Error).message });
    }
  }

  /**
   * POST /auth/password/reset — 토큰 소비 → (기존 수단 확인) → 전역 세션 폐기 → 새 해시.
   * 메일 링크를 열었다는 것은 주소 소유 확인이므로 `isEmailVerified=true` 도 함께 세운다.
   */
  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    const violations = checkPasswordPolicy(newPassword);
    if (violations.length > 0) {
      throw new EmailAuthError('PASSWORD_POLICY_VIOLATION', violations.map((v) => PASSWORD_POLICY_MESSAGES[v]).join(' '), {
        violations,
      });
    }
    const row = await this.consumeToken('reset', plainToken);
    if (!row) throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');
    // forgot 이 Demo 토큰을 만들지 않지만, 과거에 발급된 토큰이 남아 있을 수 있다 — 여기서도 막는다.
    if (await demoAccountService.isDemoAccount(row.user_id, this.dataSource)) throw new EmailAuthError(DEMO_ACCOUNT_FORBIDDEN_CODE);
    if (hasPlatformRole(await this.readRoles(row.user_id))) throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);
    // 재설정은 기존 수단의 교체만 한다 — 수단이 없는 계정에 첫 비밀번호를 만들지 않는다(forgot 의 발급 조건과 같은 축의
    //   2차 방어. 정책 변경 전에 발급된 토큰 · 다른 경로로 생긴 토큰도 막는다). 세션 폐기보다 먼저 거절한다.
    if (!(await this.passwords.hasPassword(row.user_id))) throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');

    // 전역 폐기는 `revokeAllSessions` 한 경로만 한다(auth-token-session.service). 폐기를 **먼저** 한다 —
    // 뒤의 저장이 실패해도 "비밀번호는 그대로인데 세션만 끊긴" 안전한 쪽으로 남는다.
    await this.revokeAllSessions(row.user_id);
    await this.dataSource.transaction(async (manager) => {
      await this.passwords.setPassword(row.user_id, newPassword, manager);
      await manager.getRepository(User).update({ id: row.user_id }, { isEmailVerified: true });
    });
  }

  /**
   * POST /auth/password — 로그인한 사용자의 비밀번호 설정·변경.
   * Google 로만 가입한 사용자도 비밀번호 수단을 **추가**할 수 있다(같은 users.id — 병합이 아니다).
   * 첫 비밀번호 추가는 **이 경로(로그인 상태)뿐**이다 — forgot/reset 은 기존 수단의 복구 전용(2026-10-01 정책 변경).
   * 현재 변경 경로는 전역 폐기를 하지 않는다. WO-O4O-AUTH-REFACTOR-V1 단계 2에서
   * 변경·재설정 모두 기존 access/refresh/handoff 세션을 폐기하도록 교체한다.
   */
  async setPasswordForUser(userId: string, input: { currentPassword?: string; newPassword: string }): Promise<void> {
    // Demo 계정의 비밀번호는 공개 credential 이고 고정이다 — 로그인했더라도 바꿀 수 없다.
    //   막지 않으면 공개 비밀번호를 아는 사람이 체험 계정을 사유화할 수 있다.
    if (await demoAccountService.isDemoAccount(userId, this.dataSource)) throw new EmailAuthError(DEMO_ACCOUNT_FORBIDDEN_CODE);
    if (hasPlatformRole(await this.readRoles(userId))) throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);

    const violations = checkPasswordPolicy(input.newPassword);
    if (violations.length > 0) {
      throw new EmailAuthError('PASSWORD_POLICY_VIOLATION', violations.map((v) => PASSWORD_POLICY_MESSAGES[v]).join(' '), {
        violations,
      });
    }
    if (await this.passwords.hasPassword(userId)) {
      if (!input.currentPassword) throw new EmailAuthError('CURRENT_PASSWORD_REQUIRED');
      if (!(await this.passwords.verifyPassword(userId, input.currentPassword))) {
        throw new EmailAuthError('CURRENT_PASSWORD_MISMATCH');
      }
    }
    await this.passwords.setPassword(userId, input.newPassword);
  }

  // ── 아이디 찾기 ─────────────────────────────────────────────────────────

  /**
   * POST /auth/account/find-id — 이름 + 휴대전화 → 가린 이메일 힌트.
   * 정확히 한 계정일 때만 힌트를 준다. 그 밖(0 · 다수 · 형태 오류)은 같은 일반 안내다.
   * ⚠️ 휴대전화는 본인 인증이 아니다 — 힌트가 나온다는 사실이 가입 단서가 되는 한계는 WO §2-3.
   */
  async findLoginId(input: { name: string; phone: string }): Promise<{ found: boolean; maskedEmail: string | null }> {
    const name = (input.name ?? '').trim();
    const phone = normalizePhoneDigits(input.phone);
    if (name.length === 0 || !isPhoneShapeValid(phone)) return { found: false, maskedEmail: null };

    const rows: Array<{ email: string }> = await this.dataSource.query(
      `SELECT u.email
         FROM users u
         JOIN user_password_credentials c ON c.user_id = u.id
        WHERE regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') = $1
          AND u.name = $2
        LIMIT 2`,
      [phone, name],
    );
    if (rows.length !== 1) return { found: false, maskedEmail: null };
    const masked = maskLoginEmail(rows[0].email);
    return masked ? { found: true, maskedEmail: masked } : { found: false, maskedEmail: null };
  }

  // ── 내부 ────────────────────────────────────────────────────────────────

  /**
   * 새 1회용 토큰을 만들고 **평문을 반환**한다(메일 링크에만 쓴다). DB 에는 해시만 들어간다.
   * 같은 사용자의 미사용 토큰은 소비 처리해 가장 최근 링크 하나만 살아 있게 한다.
   */
  private async issueToken(kind: TokenKind, userId: string, ttlMs: number, email?: string): Promise<string> {
    const table = TOKEN_TABLE[kind];
    const plain = newPlainToken();
    const expiresAt = new Date(this.now().getTime() + ttlMs);
    await this.dataSource.query(
      `DELETE FROM ${table} WHERE user_id = $1 AND (consumed_at IS NOT NULL OR expires_at < now())`,
      [userId],
    );
    await this.dataSource.query(`UPDATE ${table} SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL`, [
      userId,
    ]);
    if (kind === 'verification') {
      await this.dataSource.query(
        `INSERT INTO email_verification_tokens (user_id, email, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        [userId, email ?? '', hashToken(plain), expiresAt],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, hashToken(plain), expiresAt],
      );
    }
    return plain;
  }

  /** 원자적 소비 — 동시 두 요청 중 하나만 행을 돌려받는다. */
  private async consumeToken(
    kind: TokenKind,
    plainToken: string,
  ): Promise<{ user_id: string; email: string } | null> {
    if (typeof plainToken !== 'string' || plainToken.length < 20 || plainToken.length > 200) return null;
    const table = TOKEN_TABLE[kind];
    const returning = kind === 'verification' ? 'user_id, email' : `user_id, '' AS email`;
    const result: unknown = await this.dataSource.query(
      `UPDATE ${table} SET consumed_at = now()
        WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
        RETURNING ${returning}`,
      [hashToken(plainToken)],
    );
    // TypeORM(pg) 는 UPDATE … RETURNING 을 [rows, affected] 로 돌려준다.
    const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Array<{
      user_id: string;
      email: string;
    }>;
    return rows?.[0] ?? null;
  }

  private async logActivity(userId: string, meta: EmailAuthRequestMeta, success: boolean, reason?: string): Promise<void> {
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
      logger.warn('[EmailAuth] failed to log activity', { error: (error as Error).message });
    }
  }
}

function renderResetMailHtml(resetUrl: string, year: number): string {
  const safe = resetUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>비밀번호 재설정</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<h1 style="font-size:22px;">비밀번호 재설정</h1>
<p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.</p>
<p>이 링크는 <strong>30분</strong> 동안 한 번만 쓸 수 있습니다.</p>
<p style="text-align:center;"><a href="${safe}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">새 비밀번호 설정</a></p>
<p style="color:#666;font-size:14px;">버튼이 동작하지 않으면 아래 주소를 브라우저에 붙여 넣으세요.</p>
<p style="word-break:break-all;color:#666;font-size:13px;">${safe}</p>
<p style="color:#666;font-size:13px;">요청하지 않았다면 이 메일을 무시하셔도 됩니다. 비밀번호는 바뀌지 않습니다.</p>
<p style="color:#999;font-size:12px;">© ${year} O4O Platform</p>
</body></html>`;
}

export const emailAuthService = new EmailAuthService();
