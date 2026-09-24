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
 *   - users.name = NULL. (password 컬럼은 Phase B-1 에서 선언째 사라졌다 — 쓰지 않는다.)
 *     email 은 `users.email NOT NULL UNIQUE` 가 남아 있어
 *     Google email claim 을 과도기 프로필 값으로만 저장한다. claim 이 없으면 placeholder 없이 실패.
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   - 명시 연결(`link()` · `getLinkStatus()`)은 은퇴했다. 그 경로는 "password 로 로그인한 계정에
 *     Google 을 붙이는" 전환기 도구였고, password 가 사라진 뒤에는 도달 불가다
 *     (세션 자체가 이미 Google 연결에서만 나온다).
 *   - sub 는 1 user 에만 붙는다: 다른 user 의 sub → GOOGLE_IDENTITY_IN_USE(이동·merge 0),
 *     같은 user 에 다른 sub → GOOGLE_ACCOUNT_ALREADY_LINKED(교체 기능 없음), 같은 sub → 멱등.
 *
 * Admin Bootstrap(§9, 전환기 1회용):
 *   - `bootstrapAdminLink()` 는 세션 없이 호출되는 유일한 연결 경로다. 연결 전에는 그 계정으로
 *     로그인할 수단이 없기 때문이며, 그래서 env 플래그 + 일회용 코드로만 열린다
 *     (`google-admin-bootstrap.config.ts`). 플래그/코드가 없으면 `GOOGLE_ADMIN_BOOTSTRAP_DISABLED`(404).
 *   - 대상 users.id 는 **서버가** `platform:super_admin` 보유자로 결정한다(정확히 1명 · 아니면 409).
 *     클라이언트는 대상을 지정할 수 없고, email 은 어디에도 쓰이지 않는다(자동 병합 0).
 *   - 대상에 이미 Google 연결이 있으면 거절하므로 성공 후 재사용이 구조적으로 불가능하다(1회성).
 *   - 세션을 발급하지 않는다 — 연결 후 사용자가 Google 로 정상 로그인한다.
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
  loadGoogleAdminBootstrapConfig,
  GOOGLE_ADMIN_BOOTSTRAP_TARGET_ROLE,
  type GoogleAdminBootstrapConfig,
} from '../../config/google-admin-bootstrap.config.js';
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
  | 'INVALID_USER'
  | 'GOOGLE_ACCOUNT_ALREADY_LINKED'
  | 'GOOGLE_IDENTITY_IN_USE'
  | 'GOOGLE_ADMIN_BOOTSTRAP_DISABLED'
  | 'GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID'
  | 'ADMIN_TARGET_AMBIGUOUS';

const GOOGLE_AUTH_ERROR_STATUS: Record<GoogleAuthErrorCode, number> = {
  GOOGLE_SIGNUP_REQUIRED: 404,
  GOOGLE_ALREADY_REGISTERED: 409,
  GOOGLE_EMAIL_MISSING: 400,
  EMAIL_IN_USE: 409,
  CONSENT_REQUIRED: 400,
  INVALID_USER: 401,
  GOOGLE_ACCOUNT_ALREADY_LINKED: 409,
  GOOGLE_IDENTITY_IN_USE: 409,
  GOOGLE_ADMIN_BOOTSTRAP_DISABLED: 404,
  GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID: 401,
  ADMIN_TARGET_AMBIGUOUS: 409,
};

const GOOGLE_AUTH_ERROR_MESSAGE: Record<GoogleAuthErrorCode, string> = {
  GOOGLE_SIGNUP_REQUIRED: '등록되지 않은 Google 계정입니다. 약관 동의 후 계정을 생성해 주세요.',
  GOOGLE_ALREADY_REGISTERED: '이미 등록된 Google 계정입니다. 로그인해 주세요.',
  GOOGLE_EMAIL_MISSING: 'Google 계정에서 이메일을 확인할 수 없어 계정을 생성할 수 없습니다.',
  EMAIL_IN_USE: '이미 사용 중인 이메일입니다. 기존 계정은 자동으로 연결되지 않습니다.',
  CONSENT_REQUIRED: '이용약관과 개인정보 처리방침에 동의해야 합니다.',
  INVALID_USER: '계정 정보를 확인할 수 없습니다.',
  GOOGLE_ACCOUNT_ALREADY_LINKED: '이 계정에는 이미 다른 Google 계정이 연결되어 있습니다.',
  GOOGLE_IDENTITY_IN_USE: '이 Google 계정은 이미 다른 사용자에게 연결되어 있습니다.',
  GOOGLE_ADMIN_BOOTSTRAP_DISABLED: '요청을 처리할 수 없습니다.',
  GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID: '연결 코드가 올바르지 않습니다.',
  ADMIN_TARGET_AMBIGUOUS: '연결 대상 관리자 계정을 특정할 수 없습니다.',
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

/** POST /auth/google/bootstrap-admin — 전환기 1회용. 대상 users.id 는 서버가 role 로 결정한다. */
export interface GoogleAdminBootstrapInput extends GoogleAuthRequestMeta {
  idToken: string;
  bootstrapCode: string;
}

export interface GoogleAdminBootstrapResult {
  linked: true;
  /** 연결된 관리자 users.id — 서버 판정 결과 확인용(호출부 로그/검증). PII 아님. */
  userId: string;
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
  /** Admin bootstrap 게이트 — 테스트에서 주입. 기본값은 요청마다 env 를 다시 읽는다. */
  adminBootstrap?: GoogleAdminBootstrapConfig;
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
  private readonly _adminBootstrap?: GoogleAdminBootstrapConfig;

  constructor(deps: GoogleAuthServiceDeps = {}) {
    this.identity = deps.identity ?? googleIdentityService;
    this._dataSource = deps.dataSource;
    this.issueSession = deps.issueSession ?? ((user) => generateTokensWithContext(user));
    this._adminBootstrap = deps.adminBootstrap;
  }

  /** env 는 요청 시점에 읽는다 — 플래그 제거(폐쇄)가 재배포 없이도 즉시 반영되도록. */
  private get adminBootstrap(): GoogleAdminBootstrapConfig {
    return this._adminBootstrap ?? loadGoogleAdminBootstrapConfig();
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

  /**
   * Google Identity 로 신규 users + linked_accounts 를 만든다 (password=null).
   *
   * WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §11:
   *   운영자 초대 수락도 **같은 생성 경로**를 써야 한다(별도 Google 가입 구현 금지).
   *   그래서 private 에서 공개로 바꾼다 — 동작·시그니처는 그대로다.
   *   호출자는 반드시 자신의 트랜잭션 `manager` 를 넘긴다.
   */
  async createGoogleUser(
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
      // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 Phase B-1: `password: null` write 제거 — 컬럼이 B-2 에서 사라진다.
      email: identity.email!,
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

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   link() 는 은퇴했다. users.password 재인증을 전제로 한 전환기 경로이며,
  //   password 가 사라진 뒤에는 성공할 수 없다.

  /**
   * POST /auth/google/bootstrap-admin (WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15)
   * 전환기 1회용: 세션·비밀번호 없이 기존 `platform:super_admin` users.id 에 검증된 Google sub 를 연결한다.
   * 순서: 플래그 → 일회용 코드 → ID token 검증 → (트랜잭션) 대상 판정 · 충돌 검사 · INSERT.
   * users 신설 0 · users.email/password/role/membership/service_credentials 변경 0 · 세션 발급 0.
   */
  async bootstrapAdminLink(input: GoogleAdminBootstrapInput): Promise<GoogleAdminBootstrapResult> {
    const gate = this.adminBootstrap;
    if (!gate.isEnabled()) {
      throw new GoogleAuthError('GOOGLE_ADMIN_BOOTSTRAP_DISABLED');
    }
    if (!gate.verifyCode(input.bootstrapCode)) {
      logger.warn('[GoogleAuth] admin bootstrap code rejected', { ipAddress: input.ipAddress });
      throw new GoogleAuthError('GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID');
    }

    const identity = await this.identity.verifyGoogleIdToken(input.idToken);

    const userId = await this.dataSource.transaction(async (manager) => {
      // 대상은 서버가 결정한다 — role 보유자가 정확히 1명일 때만 진행(parameter binding · Guard Rule 2).
      const holders: { user_id: string }[] = await manager.query(
        'SELECT DISTINCT user_id FROM role_assignments WHERE role = $1 AND is_active = true',
        [GOOGLE_ADMIN_BOOTSTRAP_TARGET_ROLE],
      );
      if (holders.length !== 1) {
        logger.error('[GoogleAuth] admin bootstrap target not unique', { holders: holders.length });
        throw new GoogleAuthError('ADMIN_TARGET_AMBIGUOUS');
      }
      const targetUserId = holders[0].user_id;

      const userRepo = manager.getRepository(User);
      const target = await userRepo.findOne({ where: { id: targetUserId } });
      if (!target) {
        throw new GoogleAuthError('INVALID_USER');
      }

      const linkedRepo = manager.getRepository(LinkedAccount);
      const mine = await linkedRepo.findOne({ where: { userId: targetUserId, provider: 'google' } });
      if (mine) {
        // 이미 연결됨 = bootstrap 종료 상태. 재사용·교체 없음(1회성).
        throw new GoogleAuthError('GOOGLE_ACCOUNT_ALREADY_LINKED');
      }
      const other = await linkedRepo.findOne({ where: { provider: 'google', providerId: identity.sub } });
      if (other) {
        throw new GoogleAuthError('GOOGLE_IDENTITY_IN_USE');
      }

      const now = new Date();
      const linked = linkedRepo.create({
        userId: targetUserId,
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
          throw new GoogleAuthError('GOOGLE_IDENTITY_IN_USE');
        }
        throw error;
      }
      return targetUserId;
    });

    logger.warn('[GoogleAuth] admin bootstrap link created', { userId, ipAddress: input.ipAddress });
    this.logActivity(userId, input, true, 'admin_bootstrap', 'link_google')
      .catch((err) => logger.warn('[GoogleAuth] activity log failed (non-critical)', { err }));

    return { linked: true, userId };
  }

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   getLinkStatus() 는 은퇴했다. `passwordSet` 축이 사라졌고, 로그인된 계정은 정의상 Google 연결을 갖는다.

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
        // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 Phase B-1: loginAttempts/lockedUntil 리셋 제거 —
        //   password 로그인이 없으므로 증가시키는 주체가 없고, 두 컬럼은 B-2 에서 DROP 된다.
        lastLoginAt: new Date(),
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
    type: 'login_google' | 'link_google' = 'login_google',
  ): Promise<void> {
    try {
      const repo = this.dataSource.getRepository(AccountActivity);
      await repo.save(
        repo.create({
          userId,
          type,
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
