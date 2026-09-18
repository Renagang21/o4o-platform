/**
 * WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1 (WO-2B) §5-C
 *
 * GoogleIdentityService 검증 규칙을 실제 Google 네트워크 없이 고정한다.
 *  - 검증기(IdTokenVerifier) 를 주입해 서명/issuer/만료/audience 거절을 재현한다.
 *  - Identity Key 는 `sub` 뿐이며, email 은 있어도 없어도 lookup 에 쓰이지 않는다.
 *  - audience allowlist 는 서버 config 에서만 오고, 비어 있으면 fail-closed.
 */

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { getRepository: jest.fn(() => { throw new Error('DB must not be touched in this test'); }) },
}));

import {
  GoogleIdentityService,
  GoogleIdTokenError,
  type IdTokenVerifier,
  type VerifiedIdTokenPayload,
} from '../google-identity.service.js';
import { loadGoogleIdentityConfig, parseAllowedClientIds } from '../../../config/google-identity.config.js';

const ALLOWED_WEB = 'web-client-id.apps.googleusercontent.com';
const ALLOWED_ANDROID = 'android-client-id.apps.googleusercontent.com';
const FUTURE = Math.floor(Date.now() / 1000) + 3600;

const config = () => loadGoogleIdentityConfig({ GOOGLE_ALLOWED_CLIENT_IDS: `${ALLOWED_WEB}, ${ALLOWED_ANDROID}` });

/** 주입 검증기 — 서명은 통과했다고 가정하고 payload 만 돌려주거나, 라이브러리처럼 throw 한다. */
const verifierReturning = (payload: VerifiedIdTokenPayload | undefined): IdTokenVerifier & { calls: any[] } => {
  const calls: any[] = [];
  return {
    calls,
    verifyIdToken: jest.fn(async (opts: any) => {
      calls.push(opts);
      return { getPayload: () => payload };
    }),
  };
};
const verifierThrowing = (message: string): IdTokenVerifier => ({
  verifyIdToken: jest.fn(async () => { throw new Error(message); }),
});

const basePayload = (over: Partial<VerifiedIdTokenPayload> = {}): VerifiedIdTokenPayload => ({
  iss: 'https://accounts.google.com',
  sub: '1234567890',
  aud: ALLOWED_WEB,
  exp: FUTURE,
  ...over,
});

const expectReject = async (p: Promise<unknown>, reason: string) => {
  await expect(p).rejects.toBeInstanceOf(GoogleIdTokenError);
  await expect(p).rejects.toMatchObject({ code: 'GOOGLE_ID_TOKEN_INVALID', reason });
};

describe('GoogleIdentityService.verifyGoogleIdToken — 검증 규칙', () => {
  it('1) 정상 경로 — 서명·issuer·만료·allowlist 통과 시 sub 를 Identity Key 로 반환', async () => {
    const verifier = verifierReturning(basePayload({ email: 'someone@example.test', email_verified: true }));
    const svc = new GoogleIdentityService({ verifier, config: config() });
    const identity = await svc.verifyGoogleIdToken('signed.token');
    expect(identity.sub).toBe('1234567890');
    expect(identity.audience).toBe(ALLOWED_WEB);
    expect(identity.issuer).toBe('https://accounts.google.com');
    expect(identity.expiresAt.getTime()).toBe(FUTURE * 1000);
  });

  it('2) 서명 불량 — 검증기가 throw 하면 SIGNATURE_INVALID', async () => {
    const svc = new GoogleIdentityService({ verifier: verifierThrowing('Invalid token signature: abc'), config: config() });
    await expectReject(svc.verifyGoogleIdToken('tampered.token'), 'SIGNATURE_INVALID');
  });

  it('3) 만료 — 검증기 "Token used too late" → TOKEN_EXPIRED · 검증기가 통과시켜도 exp 과거면 TOKEN_EXPIRED', async () => {
    const svc1 = new GoogleIdentityService({ verifier: verifierThrowing('Token used too late, 1 > 0'), config: config() });
    await expectReject(svc1.verifyGoogleIdToken('old.token'), 'TOKEN_EXPIRED');

    const svc2 = new GoogleIdentityService({
      verifier: verifierReturning(basePayload({ exp: Math.floor(Date.now() / 1000) - 10 })),
      config: config(),
    });
    await expectReject(svc2.verifyGoogleIdToken('old.token'), 'TOKEN_EXPIRED');
  });

  it('4) issuer 불일치 — 검증기 throw 와 payload.iss 서버 재검증 모두 ISSUER_MISMATCH', async () => {
    const svc1 = new GoogleIdentityService({ verifier: verifierThrowing('Invalid issuer, expected one of [accounts.google.com]'), config: config() });
    await expectReject(svc1.verifyGoogleIdToken('t'), 'ISSUER_MISMATCH');

    const svc2 = new GoogleIdentityService({ verifier: verifierReturning(basePayload({ iss: 'https://evil.example' })), config: config() });
    await expectReject(svc2.verifyGoogleIdToken('t'), 'ISSUER_MISMATCH');
  });

  it('5) audience allowlist 불일치 — 클라이언트가 자기 aud 를 주장해도 서버 allowlist 에 없으면 AUDIENCE_NOT_ALLOWED', async () => {
    const svc1 = new GoogleIdentityService({ verifier: verifierThrowing('Wrong recipient, payload audience != requiredAudience'), config: config() });
    await expectReject(svc1.verifyGoogleIdToken('t'), 'AUDIENCE_NOT_ALLOWED');

    const svc2 = new GoogleIdentityService({ verifier: verifierReturning(basePayload({ aud: 'attacker-client-id' })), config: config() });
    await expectReject(svc2.verifyGoogleIdToken('t'), 'AUDIENCE_NOT_ALLOWED');
  });

  it('6) allowlist 일치 성공 — 여러 Client ID 중 두 번째(android) 도 통과하고, 검증기에는 서버 allowlist 전체가 전달된다', async () => {
    const verifier = verifierReturning(basePayload({ aud: ALLOWED_ANDROID }));
    const svc = new GoogleIdentityService({ verifier, config: config() });
    const identity = await svc.verifyGoogleIdToken('t');
    expect(identity.audience).toBe(ALLOWED_ANDROID);
    expect(verifier.calls[0].audience).toEqual([ALLOWED_WEB, ALLOWED_ANDROID]);
  });

  it('7) Identity key = sub — sub 가 비면 SUB_MISSING (email 이 있어도 대체하지 않는다)', async () => {
    const svc = new GoogleIdentityService({
      verifier: verifierReturning(basePayload({ sub: '', email: 'someone@example.test' })),
      config: config(),
    });
    await expectReject(svc.verifyGoogleIdToken('t'), 'SUB_MISSING');
  });

  it('8) email 없어도 resolve — payload 에 email 이 없어도 sub 로 정상 반환', async () => {
    const svc = new GoogleIdentityService({ verifier: verifierReturning(basePayload()), config: config() });
    const identity = await svc.verifyGoogleIdToken('t');
    expect(identity.sub).toBe('1234567890');
    expect(identity.email).toBeUndefined();
  });

  it('9) email 있어도 user lookup 미사용 — verify 는 어떤 repository 도 호출하지 않고, findBySub 는 email 을 조건에 넣지 않는다', async () => {
    const findOne = jest.fn(async () => null);
    const svc = new GoogleIdentityService({
      verifier: verifierReturning(basePayload({ email: 'existing-user@example.test', email_verified: true })),
      config: config(),
      linkedAccountRepository: { findOne },
    });
    const identity = await svc.verifyGoogleIdToken('t');
    expect(identity.email).toBe('existing-user@example.test');
    expect(findOne).not.toHaveBeenCalled();

    await svc.findGoogleIdentityBySub(identity.sub);
    expect(findOne).toHaveBeenCalledTimes(1);
    const where = (findOne.mock.calls[0] as any)[0].where;
    expect(where).toEqual({ provider: 'google', providerId: '1234567890' });
    expect(Object.keys(where)).not.toContain('email');
  });

  it('10) allowlist 비어 있음 — fail-closed: 검증기를 호출조차 하지 않고 ALLOWLIST_EMPTY', async () => {
    const verifier = verifierReturning(basePayload());
    const svc = new GoogleIdentityService({ verifier, config: loadGoogleIdentityConfig({}) });
    await expectReject(svc.verifyGoogleIdToken('t'), 'ALLOWLIST_EMPTY');
    expect(verifier.verifyIdToken).not.toHaveBeenCalled();
  });

  it('11) 빈 토큰 — TOKEN_EMPTY', async () => {
    const svc = new GoogleIdentityService({ verifier: verifierReturning(basePayload()), config: config() });
    await expectReject(svc.verifyGoogleIdToken(''), 'TOKEN_EMPTY');
  });
});

describe('google-identity.config — GOOGLE_ALLOWED_CLIENT_IDS 파싱', () => {
  it('쉼표 구분 · 공백 trim · 중복 제거 · 빈 값 무시', () => {
    expect(parseAllowedClientIds(` a.apps , b.apps,, a.apps `)).toEqual(['a.apps', 'b.apps']);
    expect(parseAllowedClientIds(undefined)).toEqual([]);
    expect(loadGoogleIdentityConfig({}).isConfigured()).toBe(false);
    expect(loadGoogleIdentityConfig({ GOOGLE_ALLOWED_CLIENT_IDS: 'x' }).isConfigured()).toBe(true);
  });
});

describe('GoogleIdentityService.findGoogleIdentityBySub', () => {
  it('miss = null · 빈 sub 는 조회 없이 null', async () => {
    const findOne = jest.fn(async () => null);
    const svc = new GoogleIdentityService({ config: config(), linkedAccountRepository: { findOne } });
    expect(await svc.findGoogleIdentityBySub('')).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
    expect(await svc.findGoogleIdentityBySub('999')).toBeNull();
    expect(findOne).toHaveBeenCalledWith({ where: { provider: 'google', providerId: '999' } });
  });
});
