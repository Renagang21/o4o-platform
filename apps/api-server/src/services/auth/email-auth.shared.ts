import { type SignupTermsReference } from './signup-policy.service.js';
import crypto from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { User } from '../../entities/User.js';
import type { AuthTokens } from '../../types/auth.js';
import {
  PASSWORD_SESSION_NOT_ALLOWED_CODE,
  PASSWORD_SESSION_NOT_ALLOWED_MESSAGE,
} from '../../common/auth/password-session.policy.js';
import {
  SERVICE_NOT_MEMBER_CODE,
  SERVICE_NOT_MEMBER_MESSAGE,
  type SemiFranchiseAccessResolver,
} from '../../common/auth/service-login-eligibility.policy.js';
import type { SemiFranchiseAccessDetails } from '../../modules/neture-pharmacy/services/semi-franchise-service-access.js';
import { getServiceOrigin } from '../../config/service-catalog.js';
import { type UserContext } from './auth-context.helper.js';
import { passwordCredentialService } from './password-credential.service.js';
import {
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from './demo-account.service.js';

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

export const STATUS: Record<EmailAuthErrorCode, number> = {
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

export const MESSAGE: Record<EmailAuthErrorCode, string> = {
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
  EMAIL_NOT_VERIFIED:
    '이메일 확인이 아직 끝나지 않았습니다. 받은 편지함의 확인 메일을 열어 주세요.',
  INVALID_OR_EXPIRED_TOKEN:
    '링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.',
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
  policyServiceKey?: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  consents: {
    terms: boolean;
    privacy: boolean;
    marketing?: boolean;
    termsPolicy?: SignupTermsReference;
    privacyPolicy?: SignupTermsReference;
  };
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

export const GENERIC_MAIL_NOTICE =
  '입력한 주소로 가입된 계정이 있으면 메일을 보냈습니다. 몇 분 안에 오지 않으면 스팸함을 확인해 주세요.';

export const FIND_ID_GENERIC_NOTICE =
  '입력한 정보와 일치하는 계정을 하나로 특정할 수 없습니다. 가입한 이름과 휴대전화 번호를 다시 확인하거나, Google 로 가입했다면 Google 로그인을 이용해 주세요.';

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export type TokenKind = 'verification' | 'reset';

export const TOKEN_TABLE: Record<
  TokenKind,
  'email_verification_tokens' | 'password_reset_tokens'
> = {
  verification: 'email_verification_tokens',
  reset: 'password_reset_tokens',
};

export function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain, 'utf8').digest('hex');
}

export function newPlainToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export const SERVICES_WITH_EMAIL_AUTH_PAGES: ReadonlySet<string> = new Set([
  'neture',
]);

export const FALLBACK_LINK_SERVICE = 'neture';

export function resolveMailLinkOrigin(
  sessionServiceKey: string | null | undefined,
): string {
  const key =
    sessionServiceKey && SERVICES_WITH_EMAIL_AUTH_PAGES.has(sessionServiceKey)
      ? sessionServiceKey
      : FALLBACK_LINK_SERVICE;
  return getServiceOrigin(key) ?? 'https://neture.co.kr';
}

export type Queryable = Pick<EntityManager, 'query'>;

export interface MailSender {
  sendEmail(options: {
    to: string;
    subject: string;
    template?: string;
    data?: any;
    html?: string;
  }): Promise<{ success: boolean; error?: string }>;
}

export type PasswordStore = Pick<
  typeof passwordCredentialService,
  'hasPassword' | 'setPassword' | 'verifyPassword'
>;

export type PasswordSessionIssuer = (
  user: User,
  sessionServiceKey: string | null,
  context?: UserContext,
) => Promise<{
  tokens: AuthTokens;
  roles: string[];
  memberships: { serviceKey: string; status: string; role?: string }[];
}>;

export interface EmailAuthServiceDeps {
  dataSource?: Pick<DataSource, 'getRepository' | 'transaction' | 'query'>;
  passwords?: PasswordStore;
  mailer?: MailSender;
  issueSession?: PasswordSessionIssuer;
  readContext?: (userId: string) => Promise<UserContext>;
  /** 보안 이벤트에 대한 전역 세션 폐기. 기본값은 `authenticationService.revokeAllSessions`. */
  revokeAllSessions?: (
    userId: string,
    manager?: EntityManager,
  ) => Promise<void>;
  /** 역할 이름 조회. 기본값은 `roleAssignmentService.getRoleNames`. */
  readRoles?: (userId: string) => Promise<string[]>;
  now?: () => Date;
  /** 세미프랜차이즈 이용 자격 조회. 기본값은 `defaultSemiFranchiseAccessResolver`. */
  resolveSemiFranchiseAccess?: SemiFranchiseAccessResolver;
}

export function uniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; driverError?: { code?: string } };
  return (e?.code ?? e?.driverError?.code) === '23505';
}

export function renderResetMailHtml(resetUrl: string, year: number): string {
  const safe = resetUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
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
