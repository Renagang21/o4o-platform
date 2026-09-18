/**
 * @core O4O_PLATFORM_CORE — Auth
 * GoogleAuthService — Google-only Signup/Login (WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 · WO-2D)
 *
 * 흐름: Google ID token → `googleIdentityService.verifyGoogleIdToken`(단일 검증 경로)
 *       → Google `sub` → linked_accounts(provider='google', providerId=sub) → users.id → canonical 세션.
 *
 * 불변식:
 *   - Identity Key 는 Google `sub`(외부) 와 `users.id`(내부) 뿐이다. email 은 lookup 키가 아니다.
 *   - **email 로 users / linked_accounts 를 조회하지 않는다** (자동 병합 금지 · AST guard G2).
 *     email UNIQUE 충돌은 사전 조회 없이 DB 23505 를 `EMAIL_IN_USE` 로 매핑한다.
 *   - Google 전용 JWT 없음 — `generateTokensWithContext` / `persistRefreshTokenFamily` 재사용, JWT sub = users.id.
 *   - signup 은 role_assignments · service_memberships · service_credentials 를 **만들지 않는다**.
 *   - linked_accounts 에 email/displayName/profileImage/providerData 스냅샷을 쓰지 않는다(picture 미저장).
 *   - users.name = NULL · users.password = NULL. email 은 `users.email NOT NULL UNIQUE` 가 남아 있어
 *     Google email claim 을 과도기 프로필 값으로만 저장한다. claim 이 없으면 placeholder 없이 실패.
 */

import type { DataSource, EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import { UserStatus } from '../../types/auth.js';
import type { AuthTokens } from '../../types/auth.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { AccountInactiveError } from '../../errors/AuthErrors.js';
import {
  googleIdentityService,
  type GoogleIdentityService,
  type VerifiedGoogleIdentity,
} from './google-identity.service.js';
import {
  generateTokensWithContext,
  injectRolesIntoPublicData,
} from './auth-context.helper.js';
import * as tokenUtils from '../../utils/token.utils.js';
import logger from '../../utils/logger.js';

export type GoogleAuthErrorCode =
  | 'GOOGLE_SIGNUP_REQUIRED'
  | 'GOOGLE_ALREADY_REGISTERED'
  | 'GOOGLE_EMAIL_MISSING'
  | 'EMAIL_IN_USE'
  | 'CONSENT_REQUIRED'
  | 'INVALID_USER';

const GOOGLE_AUTH_ERROR_STATUS: Record<GoogleAuthErrorCode, number> = {
  GOOGLE_SIGNUP_REQUIRED: 404,
  GOOGLE_ALREADY_REGISTERED: 409,
  GOOGLE_EMAIL_MISSING: 400,
  EMAIL_IN_USE: 409,
  CONSENT_REQUIRED: 400,
  INVALID_USER: 401,
};

const GOOGLE_AUTH_ERROR_MESSAGE: Record<GoogleAuthErrorCode, string> = {
  GOOGLE_SIGNUP_REQUIRED: '등록되지 않은 Google 계정입니다. 약관 동의 후 계정을 생성해 주세요.',
  GOOGLE_ALREADY_REGISTERED: '이미 등록된 Google 계정입니다. 로그인해 주세요.',
  GOOGLE_EMAIL_MISSING: 'Google 계정에서 이메일을 확인할 수 없어 계정을 생성할 수 없습니다.',
  EMAIL_IN_USE: '이미 사용 중인 이메일입니다. 기존 계정은 자동으로 연결되지 않습니다.',
  CONSENT_REQUIRED: '이용약관과 개인정보 처리방침에 동의해야 합니다.',
  INVALID_USER: '계정 정보를 확인할 수 없습니다.',
};

export class GoogleAuthError extends Error {
  readonly statusCode: number;
  constructor(readonly code: GoogleAuthErrorCode, message?: string) {
    super(message || GOOGLE_AUTH_ERROR_MESSAGE[code]);
    this.name = 'GoogleAuthError';
    this.statusCode = GOOGLE_AUTH_ERROR_STATUS[code];
  }
}

export interface GoogleSignupConsents {
  terms: boolean;
  privacy: boolean;
  marketing?: boolean;
}

export interface GoogleAuthRequestMeta {
  ipAddress: string;
  userAgent: string;
}

export interface GoogleLoginInput extends GoogleAuthRequestMeta {
  idToken: string;
  serviceKey?: string;
}

export interface GoogleSignupInput extends GoogleAuthRequestMeta {
  idToken: string;
  consents: GoogleSignupConsents;
}

export interface GoogleAuthSession {
  user: Record<string, unknown>;
  tokens: AuthTokens;
  /** 로그인 요청에 serviceKey 가 있을 때만 — 해당 서비스 membership 상태(없으면 null). 세션 발급 여부와 무관. */
  serviceMembership?: { serviceKey: string; status: string | null };
  isNewUser: boolean;
}

/** 세션 발급 결과 — 테스트에서 주입해 JWT/DB 를 우회한다. */
export type SessionIssuer = (user: User) => Promise<{
  tokens: AuthTokens;
  roles: string[];
  memberships: { serviceKey: string; status: string; role?: string }[];
}>;

export interface GoogleAuthServiceDeps {
  identity?: Pick<GoogleIdentityService, 'verifyGoogleIdToken' | 'findGoogleIdentityBySub'>;
  dataSource?: Pick<DataSource, 'getRepository' | 'transaction'>;
  issueSession?: SessionIssuer;
}

/** Postgres unique violation 판별 — TypeORM QueryFailedError 는 driverError 에 원본을 둔다. */
function uniqueViolationDetail(error: unknown): string | null {
  const e = error as { code?: string; detail?: string; constraint?: string; driverError?: { code?: string; detail?: string; constraint?: string } };
  const code = e?.code ?? e?.driverError?.code;
  if (code !== '23505') return null;
  return `${e?.constraint ?? e?.driverError?.constraint ?? ''} ${e?.detail ?? e?.driverError?.detail ?? ''}`;
}

export class GoogleAuthService {
  private readonly identity: Pick<GoogleIdentityService, 'verifyGoogleIdToken' | 'findGoogleIdentityBySub'>;
  private readonly _dataSource?: Pick<DataSource, 'getRepository' | 'transaction'>;
  private readonly issueSession: SessionIssuer;

  constructor(deps: GoogleAuthServiceDeps = {}) {
    this.identity = deps.identity ?? googleIdentityService;
    this._dataSource = deps.dataSource;
    this.issueSession = deps.issueSession ?? ((user) => generateTokensWithContext(user));
  }

  private get dataSource(): Pick<DataSource, 'getRepository' | 'transaction'> {
    return this._dataSource ?? AppDataSource;
  }

  private get userRepository(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  /**
   * POST /auth/google/login
   * 등록된 sub → 세션. 미등록 sub → GOOGLE_SIGNUP_REQUIRED (email 힌트 없음 — email 조회 자체가 없다).
   */
  async login(input: GoogleLoginInput): Promise<GoogleAuthSession> {
    const identity = await this.identity.verifyGoogleIdToken(input.idToken);

    const linked = await this.identity.findGoogleIdentityBySub(identity.sub);
    if (!linked) {
      throw new GoogleAuthError('GOOGLE_SIGNUP_REQUIRED');
    }

    const user = await this.userRepository.findOne({ where: { id: linked.userId } });
    if (!user) {
      // FK CASCADE 상 도달 불가. 도달하면 데이터 이상 — 가입 유도 대신 거절한다.
      logger.error('[GoogleAuth] linked_accounts row without users row', { linkedAccountId: linked.id });
      throw new GoogleAuthError('INVALID_USER');
    }

    if (resolveAccountAccess(user.status) === 'blocked') {
      await this.logActivity(user.id, input, false, 'account_inactive');
      throw new AccountInactiveError(user.status);
    }

    const session = await this.establishSession(user, input, false);

    // linked_accounts.lastUsedAt 만 갱신 — email/displayName/profileImage 스냅샷은 쓰지 않는다.
    await this.dataSource
      .getRepository(LinkedAccount)
      .update({ id: linked.id }, { lastUsedAt: new Date() })
      .catch((err: unknown) => logger.warn('[GoogleAuth] lastUsedAt update failed (non-critical)', { err }));

    if (input.serviceKey) {
      const membership = (session.user.memberships as { serviceKey: string; status: string }[] | undefined)
        ?.find((m) => m.serviceKey === input.serviceKey);
      session.serviceMembership = { serviceKey: input.serviceKey, status: membership?.status ?? null };
    }
    return session;
  }

  /**
   * POST /auth/google/signup
   * 단일 트랜잭션: sub 중복 확인 → users → linked_accounts → 동의 스냅샷 → commit → 세션.
   */
  async signup(input: GoogleSignupInput): Promise<GoogleAuthSession> {
    if (!input.consents?.terms || !input.consents?.privacy) {
      throw new GoogleAuthError('CONSENT_REQUIRED');
    }

    const identity = await this.identity.verifyGoogleIdToken(input.idToken);
    if (!identity.email) {
      throw new GoogleAuthError('GOOGLE_EMAIL_MISSING');
    }

    const user = await this.dataSource.transaction((manager) => this.createGoogleUser(manager, identity, input.consents));

    return this.establishSession(user, input, true);
  }

  private async createGoogleUser(
    manager: EntityManager,
    identity: VerifiedGoogleIdentity,
    consents: GoogleSignupConsents,
  ): Promise<User> {
    const linkedRepo = manager.getRepository(LinkedAccount);
    const userRepo = manager.getRepository(User);

    const duplicate = await linkedRepo.findOne({ where: { provider: 'google', providerId: identity.sub } });
    if (duplicate) {
      throw new GoogleAuthError('GOOGLE_ALREADY_REGISTERED');
    }

    const now = new Date();
    const user = userRepo.create({
      email: identity.email!,
      password: null,
      name: null,
      status: UserStatus.ACTIVE,
      isActive: true,
      isEmailVerified: identity.emailVerified === true,
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
      marketingAccepted: consents.marketing === true,
    });

    try {
      await userRepo.save(user);
    } catch (error) {
      const detail = uniqueViolationDetail(error);
      if (detail !== null && /email/i.test(detail)) {
        throw new GoogleAuthError('EMAIL_IN_USE');
      }
      throw error;
    }

    const linked = linkedRepo.create({
      userId: user.id,
      provider: 'google',
      providerId: identity.sub,
      isVerified: true,
      isPrimary: true,
      linkedAt: now,
      lastUsedAt: now,
    });
    try {
      await linkedRepo.save(linked);
    } catch (error) {
      const detail = uniqueViolationDetail(error);
      if (detail !== null && /provider/i.test(detail)) {
        // 동시 가입 race — 트랜잭션 롤백으로 방금 만든 users 행도 사라진다(orphan 0).
        throw new GoogleAuthError('GOOGLE_ALREADY_REGISTERED');
      }
      throw error;
    }

    return user;
  }

  /** canonical 세션: tokens + refresh family + lastLoginAt. 로그인/가입 공통. */
  private async establishSession(
    user: User,
    meta: GoogleAuthRequestMeta,
    isNewUser: boolean,
  ): Promise<GoogleAuthSession> {
    const { tokens, roles, memberships } = await this.issueSession(user);

    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    await this.userRepository.update(
      { id: user.id },
      {
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
        ...(tokenFamily && { refreshTokenFamily: tokenFamily }),
      },
    );

    this.logActivity(user.id, meta, true, isNewUser ? 'google_signup' : undefined).catch((err) =>
      logger.warn('[GoogleAuth] activity log failed (non-critical)', { err }),
    );

    const publicData = user.toPublicData() as Record<string, unknown>;
    injectRolesIntoPublicData(publicData, roles, memberships);

    return { user: publicData, tokens, isNewUser };
  }

  /** account_activities 기록 — email 컬럼은 비운다(Google claim 을 감사 로그에 복제하지 않는다). */
  private async logActivity(
    userId: string,
    meta: GoogleAuthRequestMeta,
    success: boolean,
    reason?: string,
  ): Promise<void> {
    try {
      const repo = this.dataSource.getRepository(AccountActivity);
      await repo.save(
        repo.create({
          userId,
          type: 'login_google',
          email: null,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          success,
          details: { provider: 'google', success, ...(reason && { reason }) },
        } as Partial<AccountActivity>),
      );
    } catch (error) {
      logger.warn('[GoogleAuth] failed to log activity', { error });
    }
  }
}

export const googleAuthService = new GoogleAuthService();
