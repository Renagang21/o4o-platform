/** Browser-local logout and account security generation. SQL persistence is tested separately. */
import { AuthTokenSessionService } from '../auth-token-session.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { freshenUserContext } from '../auth-context.helper.js';

jest.mock('../auth-context.helper.js', () => ({
  freshenUserContext: jest.fn(async () => ({ roles: [], memberships: [] })),
}));

describe('browser logout / account security generation', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let user: any;
  let service: AuthTokenSessionService;
  let revoked: Set<string>;
  let query: jest.Mock;
  const issue = (serviceKey = 'neture') => tokenUtils.generateTokens(user, [], 'neture.co.kr', [], user.refreshTokenFamily, serviceKey, 0, 'google');
  const end = (tokens: { accessToken: string }) => {
    const claims = tokenUtils.verifyAccessToken(tokens.accessToken)!;
    return service.logout(USER_ID, claims.serviceKey!, claims.sessionId!);
  };
  beforeAll(() => { process.env.JWT_SECRET ||= "test-browser-session-secret"; process.env.JWT_REFRESH_SECRET ||= "test-browser-refresh-secret"; });
  beforeEach(() => {
    user = { id: USER_ID, email: 'fixture@example.test', isActive: true, status: 'active', refreshTokenFamily: 'initial-family' };
    revoked = new Set();
    query = jest.fn(async (sql: string, params: string[]) => {
      if (sql.startsWith('INSERT INTO browser_session_revocations')) { revoked.add(params.slice(0, 3).join(':')); return []; }
      if (sql.startsWith('UPDATE users SET')) { user.refreshTokenFamily = params[1]; return [[], 1]; }
      if (sql.includes('NOT EXISTS')) return user.refreshTokenFamily === params[3] && !revoked.has(params.slice(0, 3).join(':')) ? [{ '?column?': 1 }] : [];
      throw new Error('Unexpected session SQL');
    });
    service = new AuthTokenSessionService();
    (service as any)._userRepo = { findOne: jest.fn(async () => ({ ...user })), manager: { query } };
    user.__loginRefreshToken = issue().refreshToken;
    jest.mocked(freshenUserContext).mockResolvedValue({ roles: [], memberships: [] });
  });

  it('refresh preserves browser ID, family and service', async () => {
    const first = issue();
    const next = await service.refreshTokens(first.refreshToken);
    const a = tokenUtils.verifyRefreshToken(first.refreshToken)!;
    const b = tokenUtils.verifyRefreshToken(next.refreshToken)!;
    expect([b.sessionId, b.tokenFamily, b.serviceKey]).toEqual([a.sessionId, a.tokenFamily, 'neture']);
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  });
  it('logout denies old access binding and refresh, preserves second browser and other origin', async () => {
    const browserA = issue(); const browserB = issue(); const otherOrigin = issue('supplier');
    await end(browserA);
    await expect(service.refreshTokens(browserA.refreshToken)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
    await expect(service.refreshTokens(browserB.refreshToken)).resolves.toBeDefined();
    await expect(service.refreshTokens(otherOrigin.refreshToken)).resolves.toBeDefined();
    expect(user.refreshTokenFamily).toBe('initial-family');
  });
  it('all rotated tokens of the same browser are denied after logout', async () => {
    const before = issue(); const rotated = await service.refreshTokens(before.refreshToken);
    await end(before);
    for (const tokens of [before, rotated]) await expect(service.refreshTokens(tokens.refreshToken)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
  });
  it('immediate re-login creates another browser identity and cannot revive the old token', async () => {
    const before = issue(); await end(before); const after = issue();
    expect(tokenUtils.verifyRefreshToken(after.refreshToken)!.sessionId).not.toBe(tokenUtils.verifyRefreshToken(before.refreshToken)!.sessionId);
    await expect(service.refreshTokens(after.refreshToken)).resolves.toBeDefined();
    await expect(service.refreshTokens(before.refreshToken)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
  });
  it('security revocation denies every origin/device and allows a fresh login', async () => {
    const old = [issue(), issue(), issue('supplier')];
    await service.revokeAllSessions(USER_ID);
    expect(user.refreshTokenFamily).not.toBe('initial-family');
    for (const tokens of old) await expect(service.refreshTokens(tokens.refreshToken)).rejects.toMatchObject({ code: 'TOKEN_FAMILY_MISMATCH' });
    await expect(service.refreshTokens(issue().refreshToken)).resolves.toBeDefined();
  });
  it('stale family cannot revoke the newer valid login', async () => {
    const old = issue(); await service.revokeAllSessions(USER_ID);
    const family = user.refreshTokenFamily; const newer = issue();
    await expect(service.refreshTokens(old.refreshToken)).rejects.toMatchObject({ code: 'TOKEN_FAMILY_MISMATCH' });
    expect(user.refreshTokenFamily).toBe(family);
    await expect(service.refreshTokens(newer.refreshToken)).resolves.toBeDefined();
  });
  it('cleared legacy global family remains fail-closed', async () => {
    const old = issue(); user.refreshTokenFamily = null;
    await expect(service.refreshTokens(old.refreshToken)).rejects.toMatchObject({ code: 'TOKEN_FAMILY_REVOKED' });
  });
  it('legacy tokens without browser identity cannot refresh', async () => {
    const legacy = tokenUtils.generateRefreshToken(user, user.refreshTokenFamily, 'neture', 0);
    await expect(service.refreshTokens(legacy)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
  });
  it('account change between initial user lookup and database session check is denied', async () => {
    const old = issue();
    (service as any)._userRepo.findOne.mockImplementationOnce(async () => {
      const snapshot = { ...user }; user.refreshTokenFamily = 'changed-after-read'; return snapshot;
    });
    await expect(service.refreshTokens(old.refreshToken)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
  });
  describe('P · 비밀번호 세션의 refresh — 표식 승계 · 관리자 경계', () => {
    const makePasswordToken = (serviceKey: string): string =>
      tokenUtils.generateTokens(user, [], 'neture.co.kr', undefined, user.refreshTokenFamily, serviceKey, 0, 'password')
        .refreshToken;

    it('P1 회전 후에도 authMethod=password 가 access · refresh 양쪽에 남는다', async () => {
      const rotated = await service.refreshTokens(makePasswordToken('neture'));
      expect((tokenUtils.verifyAccessToken(rotated.accessToken) as any)?.authMethod).toBe('password');
      expect((tokenUtils.verifyRefreshToken(rotated.refreshToken) as any)?.authMethod).toBe('password');
    });

    it('P2 발급 뒤 platform 역할이 붙으면 회전 거절 — PASSWORD_SESSION_NOT_ALLOWED', async () => {
      jest.mocked(freshenUserContext).mockResolvedValueOnce({ roles: ['platform:super_admin'], memberships: [] } as any);
      await expect(service.refreshTokens(makePasswordToken('neture'))).rejects.toMatchObject({
        code: 'PASSWORD_SESSION_NOT_ALLOWED',
      });
    });

    it('P3 서비스 :admin 역할(supplier:admin 등)은 거절 대상이 아니다', async () => {
      jest.mocked(freshenUserContext).mockResolvedValueOnce({ roles: ['supplier:admin', 'neture:admin'], memberships: [] } as any);
      const rotated = await service.refreshTokens(makePasswordToken('neture'));
      expect((tokenUtils.verifyAccessToken(rotated.accessToken) as any)?.authMethod).toBe('password');
    });

    it('P4 명시적 Google 세션은 platform 역할이 있어도 수단을 승계한다', async () => {
      jest.mocked(freshenUserContext).mockResolvedValueOnce({ roles: ['platform:super_admin'], memberships: [] } as any);
      const rotated = await service.refreshTokens(user.__loginRefreshToken);
      expect((tokenUtils.verifyAccessToken(rotated.accessToken) as any)?.authMethod).toBe('google');
    });
  });

  describe('explicit authentication method survives refresh without promotion', () => {
    const refreshFor = (method: any, serviceKey = 'neture') => tokenUtils.generateTokens(
      user, [], 'neture.co.kr', [], user.refreshTokenFamily, serviceKey, 0, method,
    ).refreshToken;
    it.each(['google', 'password', 'kakao'] as const)('preserves %s on both tokens and browser/family/scope', async (method) => {
      const original = refreshFor(method); const before = tokenUtils.verifyRefreshToken(original)!;
      const rotated = await service.refreshTokens(original);
      const access = tokenUtils.verifyAccessToken(rotated.accessToken)!;
      const refresh = tokenUtils.verifyRefreshToken(rotated.refreshToken)!;
      for (const claims of [access, refresh]) {
        expect(claims.authMethod).toBe(method);
        expect([claims.sessionId, claims.tokenFamily, claims.serviceKey]).toEqual([before.sessionId, before.tokenFamily, before.serviceKey]);
      }
    });
    it.each(['kakao', undefined, 'GOOGLE', 'unknown'])('does not upgrade %s after Google is linked/platform role is assigned', async (method) => {
      jest.mocked(freshenUserContext).mockResolvedValueOnce({ roles: ['platform:super_admin'], memberships: [] } as any);
      await expect(service.refreshTokens(refreshFor(method))).rejects.toMatchObject({ code: 'GOOGLE_SESSION_REQUIRED' });
    });
    it.each(['kakao', undefined])('requires explicit Google for admin-scoped %s session with no role', async (method) => {
      await expect(service.refreshTokens(refreshFor(method, 'admin'))).rejects.toMatchObject({ code: 'GOOGLE_SESSION_REQUIRED' });
    });
    it('keeps a legacy normal-service session unmarked instead of upgrading it to Google', async () => {
      const rotated = await service.refreshTokens(refreshFor(undefined));
      expect(tokenUtils.verifyAccessToken(rotated.accessToken)!.authMethod).toBeUndefined();
      expect(tokenUtils.verifyRefreshToken(rotated.refreshToken)!.authMethod).toBeUndefined();
    });
  });
});
