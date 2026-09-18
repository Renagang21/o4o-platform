/**
 * GoogleIdentityService — Google ID token 검증 + `sub` → linked_accounts 해석 골격
 * (WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1 · WO-2B 2-4)
 *
 * 책임(이번 WO):
 *   1. `verifyGoogleIdToken(idToken)` — 서명 · issuer · 만료 · audience(서버 allowlist) 검증 후
 *      Identity Key = Google `sub` 를 돌려준다.
 *   2. `findGoogleIdentityBySub(sub)` — `linked_accounts` 를 `(provider='google', providerId=sub)` 로만 조회.
 *
 * 하지 않는 것:
 *   - endpoint(`/auth/google/*`) · 세션 발급 · users 생성 · linked_accounts insert (WO-2C 이후)
 *   - **email 로 users / linked_accounts 를 조회하는 일** — payload 에 email 이 있어도 lookup 키로 쓰지 않는다.
 *   - `users.provider/provider_id` 참조 — Google Identity 정본은 linked_accounts 뿐이다 (V3 §3).
 *   - 클라이언트가 보낸 audience 신뢰 — allowlist 는 서버 config 에서만 온다.
 *
 * 검증기는 `IdTokenVerifier` 로 주입 가능하다(기본 = google-auth-library OAuth2Client). 단위 테스트는
 * 실제 Google 네트워크 없이 검증 규칙을 고정한다.
 */

import { OAuth2Client } from 'google-auth-library';
import type { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import {
  GOOGLE_ID_TOKEN_ISSUERS,
  googleIdentityConfig,
  type GoogleIdentityConfig,
} from '../../config/google-identity.config.js';
import logger from '../../utils/logger.js';

/** 검증기 추상화 — google-auth-library `OAuth2Client.verifyIdToken` 의 최소 표면. */
export interface IdTokenVerifier {
  verifyIdToken(options: { idToken: string; audience: string | string[] }): Promise<{
    getPayload(): VerifiedIdTokenPayload | undefined;
  }>;
}

/** google-auth-library `TokenPayload` 중 이 서비스가 읽는 필드만. */
export interface VerifiedIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat?: number;
  email?: string;
  email_verified?: boolean;
}

export type GoogleIdTokenRejectReason =
  | 'ALLOWLIST_EMPTY'
  | 'TOKEN_EMPTY'
  | 'SIGNATURE_INVALID'
  | 'TOKEN_EXPIRED'
  | 'ISSUER_MISMATCH'
  | 'AUDIENCE_NOT_ALLOWED'
  | 'SUB_MISSING';

export class GoogleIdTokenError extends Error {
  readonly code = 'GOOGLE_ID_TOKEN_INVALID';
  constructor(readonly reason: GoogleIdTokenRejectReason, message?: string) {
    super(message || `Google ID token rejected: ${reason}`);
    this.name = 'GoogleIdTokenError';
  }
}

/** 검증 결과 — Identity Key 는 `sub` 뿐이다. email 은 표시·감사용 스냅샷이며 lookup 에 쓰지 않는다. */
export interface VerifiedGoogleIdentity {
  sub: string;
  audience: string;
  issuer: string;
  expiresAt: Date;
  /** payload 에 있으면 그대로 전달만 한다(저장·조회 키 아님). */
  email?: string;
  emailVerified?: boolean;
}

export interface GoogleIdentityServiceDeps {
  verifier?: IdTokenVerifier;
  config?: GoogleIdentityConfig;
  linkedAccountRepository?: Pick<Repository<LinkedAccount>, 'findOne'>;
}

const ISSUERS: ReadonlySet<string> = new Set(GOOGLE_ID_TOKEN_ISSUERS);

/** google-auth-library 오류 메시지를 거절 사유로 분류한다(라이브러리가 throw 하는 문자열 기준). */
function classifyVerifierError(error: unknown): GoogleIdTokenRejectReason {
  const message = error instanceof Error ? error.message : String(error);
  if (/used too late|expired/i.test(message)) return 'TOKEN_EXPIRED';
  if (/issuer/i.test(message)) return 'ISSUER_MISMATCH';
  if (/audience/i.test(message)) return 'AUDIENCE_NOT_ALLOWED';
  return 'SIGNATURE_INVALID';
}

export class GoogleIdentityService {
  private readonly config: GoogleIdentityConfig;
  private _verifier?: IdTokenVerifier;
  private _linkedAccountRepo?: Pick<Repository<LinkedAccount>, 'findOne'>;

  constructor(deps: GoogleIdentityServiceDeps = {}) {
    this.config = deps.config ?? googleIdentityConfig;
    this._verifier = deps.verifier;
    this._linkedAccountRepo = deps.linkedAccountRepository;
  }

  private get verifier(): IdTokenVerifier {
    if (!this._verifier) {
      // audience 는 호출마다 verifyIdToken 옵션으로 넘긴다 — 생성자 clientId 에 의존하지 않는다.
      this._verifier = new OAuth2Client();
    }
    return this._verifier;
  }

  private get linkedAccountRepository(): Pick<Repository<LinkedAccount>, 'findOne'> {
    if (!this._linkedAccountRepo) {
      this._linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    }
    return this._linkedAccountRepo;
  }

  /**
   * Google ID token 검증.
   *
   * 규칙: 서명(Google 공개키) · issuer(accounts.google.com) · 만료(exp) 는 라이브러리가 검증하고,
   * audience 는 **서버 allowlist(`GOOGLE_ALLOWED_CLIENT_IDS`)** 로만 대조한다. allowlist 가 비어 있으면
   * 어떤 토큰도 통과하지 못한다(fail-closed). 통과 시 Identity Key = `sub`.
   */
  async verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    const allowedAudiences = this.config.allowedClientIds;
    if (allowedAudiences.length === 0) {
      throw new GoogleIdTokenError('ALLOWLIST_EMPTY', 'GOOGLE_ALLOWED_CLIENT_IDS is not configured');
    }
    if (!idToken || typeof idToken !== 'string') {
      throw new GoogleIdTokenError('TOKEN_EMPTY');
    }

    let payload: VerifiedIdTokenPayload | undefined;
    try {
      const ticket = await this.verifier.verifyIdToken({ idToken, audience: allowedAudiences });
      payload = ticket.getPayload();
    } catch (error) {
      const reason = classifyVerifierError(error);
      logger.warn('[GoogleIdentity] ID token rejected by verifier', { reason });
      throw new GoogleIdTokenError(reason);
    }

    if (!payload) {
      throw new GoogleIdTokenError('SIGNATURE_INVALID', 'verifier returned no payload');
    }
    // 라이브러리 검증과 별개로 서버 규칙을 한 번 더 고정한다(주입 검증기가 느슨해도 통과 불가).
    if (!ISSUERS.has(payload.iss)) {
      throw new GoogleIdTokenError('ISSUER_MISMATCH');
    }
    if (!allowedAudiences.includes(payload.aud)) {
      throw new GoogleIdTokenError('AUDIENCE_NOT_ALLOWED');
    }
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
      throw new GoogleIdTokenError('TOKEN_EXPIRED');
    }
    if (!payload.sub) {
      throw new GoogleIdTokenError('SUB_MISSING');
    }

    return {
      sub: payload.sub,
      audience: payload.aud,
      issuer: payload.iss,
      expiresAt: new Date(payload.exp * 1000),
      ...(payload.email !== undefined && { email: payload.email }),
      ...(payload.email_verified !== undefined && { emailVerified: payload.email_verified }),
    };
  }

  /**
   * Google `sub` → linked_accounts row. `(provider='google', providerId=sub)` 만 조회한다.
   * miss = null. email fallback · users.provider/provider_id fallback 은 없다.
   */
  async findGoogleIdentityBySub(sub: string): Promise<LinkedAccount | null> {
    if (!sub) return null;
    return this.linkedAccountRepository.findOne({
      where: { provider: 'google', providerId: sub },
    });
  }
}

export const googleIdentityService = new GoogleIdentityService();
