/**
 * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1
 *
 * `logout-all` 이 실제로 모든 기기의 refresh token 을 무효화하는지 고정한다.
 *
 * ── 이 테스트가 증명하는 것 ────────────────────────────────────────────────
 *   - 정상 세션은 refresh 로 재발급되고 family 가 회전한다 (기존 계약 유지)
 *   - `logoutAll()` 이후 기존 refresh token 은 절대 재발급되지 않는다
 *     (회귀 지점: `users.refreshTokenFamily = null` 이 family 검사 전체를 우회시켰다)
 *   - 다른 기기에서 발급된 family 는 mismatch 로 거부되고 전체 세션이 폐기된다
 *
 * ── 이 테스트가 증명하지 않는 것 ──────────────────────────────────────────
 *   실제 DB 왕복. 저장소 jest 설정이 `database/connection` 을 전역 mock 하므로
 *   User repository 는 in-memory fake 로 대체한다.
 */

import { AuthTokenSessionService } from '../auth-token-session.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';

jest.mock('../auth-context.helper.js', () => ({
  freshenUserContext: jest.fn(async () => ({ roles: [], memberships: [] })),
  persistRefreshTokenFamily: jest.fn(async () => undefined),
}));

describe('refresh token family 계약 — logout-all 무효화', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';

  let service: AuthTokenSessionService;
  let user: any;

  const makeRefreshTokenForCurrentFamily = (): string => {
    const tokens = tokenUtils.generateTokens(user, [], 'neture.co.kr', undefined, user.refreshTokenFamily);
    return tokens.refreshToken;
  };

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-family-contract';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-for-family-contract';
  });

  beforeEach(() => {
    user = {
      id: USER_ID,
      email: 'family-contract@example.com',
      isActive: true,
      status: 'active',
      refreshTokenFamily: null as string | null,
    };

    service = new AuthTokenSessionService();
    (service as any)._userRepo = {
      findOne: jest.fn(async () => user),
      save: jest.fn(async (u: any) => u),
    };

    // 로그인 상태 재현: 발급한 family 가 users 에 기록돼 있다.
    const issued = tokenUtils.generateTokens(user, [], 'neture.co.kr');
    user.refreshTokenFamily = tokenUtils.getTokenFamily(issued.refreshToken);
    (user as any).__loginRefreshToken = issued.refreshToken;
  });

  it('정상 세션은 refresh 로 재발급되고 family 가 회전한다', async () => {
    const before = user.refreshTokenFamily;

    const tokens = await service.refreshTokens(user.__loginRefreshToken);

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(user.refreshTokenFamily).toBe(tokenUtils.getTokenFamily(tokens.refreshToken));
    expect(user.refreshTokenFamily).not.toBe(before);
  });

  it('logout-all 이후에는 기존 refresh token 으로 재발급할 수 없다', async () => {
    const stolenToken = user.__loginRefreshToken;

    await service.logoutAll(USER_ID);
    expect(user.refreshTokenFamily).toBeNull();

    await expect(service.refreshTokens(stolenToken)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
  });

  it('logout-all 은 다른 기기에서 발급된 토큰도 무효화한다', async () => {
    const deviceA = user.__loginRefreshToken;
    // 기기 B 로그인 — 같은 family 를 승계한 토큰(handoff) 과 새 family 토큰 모두 검사한다.
    const deviceB = makeRefreshTokenForCurrentFamily();

    await service.logoutAll(USER_ID);

    await expect(service.refreshTokens(deviceA)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
    await expect(service.refreshTokens(deviceB)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
  });

  it('logout-all 후 재로그인하면 새 refresh token 은 정상 동작한다', async () => {
    await service.logoutAll(USER_ID);

    const relogin = tokenUtils.generateTokens(user, [], 'neture.co.kr');
    user.refreshTokenFamily = tokenUtils.getTokenFamily(relogin.refreshToken);

    const tokens = await service.refreshTokens(relogin.refreshToken);
    expect(tokens.refreshToken).toBeTruthy();
  });

  it('family 가 어긋난 토큰은 도난으로 판정하고 전체 세션을 폐기한다', async () => {
    const staleToken = user.__loginRefreshToken;
    // 다른 곳에서 회전이 일어나 users 의 family 가 바뀐 상황
    const rotated = tokenUtils.generateTokens(user, [], 'neture.co.kr');
    user.refreshTokenFamily = tokenUtils.getTokenFamily(rotated.refreshToken);

    await expect(service.refreshTokens(staleToken)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_MISMATCH',
    });
    expect(user.refreshTokenFamily).toBeNull();
  });

  it('handoff 는 기존 family 를 승계하므로 원 서비스 세션이 유지된다', async () => {
    const origin = user.__loginRefreshToken;
    const handoff = makeRefreshTokenForCurrentFamily();

    expect(tokenUtils.getTokenFamily(handoff)).toBe(tokenUtils.getTokenFamily(origin));

    const tokens = await service.refreshTokens(handoff);
    expect(tokens.refreshToken).toBeTruthy();
  });
});
