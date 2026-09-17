/**
 * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1
 * WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1
 *
 * `logout-all` 이 실제로 모든 기기의 refresh token 을 무효화하는지,
 * 그리고 refresh 회전이 family 를 **승계**하는지 고정한다.
 *
 * ── 계약 ───────────────────────────────────────────────────────────────────
 *   login            → 새 family
 *   handoff A → B    → B 가 같은 family 승계
 *   refresh (A 또는 B) → 토큰 회전, family 불변, users.refreshTokenFamily 불변
 *   다른 family 토큰   → TOKEN_FAMILY_MISMATCH + family null
 *   family null 이후   → TOKEN_FAMILY_REVOKED
 *   logout / logout-all → family null
 *
 * ── 이 테스트가 증명하는 것 ────────────────────────────────────────────────
 *   - 정상 세션은 refresh 로 재발급되고 **family 는 유지**된다
 *     (회귀 지점: 회전마다 새 family 를 단일 슬롯에 덮어써 handoff 로 family 를 공유한
 *      다른 origin 의 refresh token 을 stale 로 만들었다 — IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1)
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

  it('B · 정상 세션은 refresh 로 재발급되고 family 는 유지된다 (DB 저장 없음)', async () => {
    const before = user.refreshTokenFamily;
    const save = (service as any)._userRepo.save as jest.Mock;

    const tokens = await service.refreshTokens(user.__loginRefreshToken);

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokenUtils.getTokenFamily(tokens.refreshToken)).toBe(before);
    expect(user.refreshTokenFamily).toBe(before);
    expect(save).not.toHaveBeenCalled();
  });

  it('C · handoff 로 family 를 공유하는 두 origin 이 교대로 refresh 해도 모두 200', async () => {
    const family = user.refreshTokenFamily;
    let source = user.__loginRefreshToken as string;
    let target = makeRefreshTokenForCurrentFamily();

    const r1 = await service.refreshTokens(source);
    source = r1.refreshToken;
    expect(tokenUtils.getTokenFamily(source)).toBe(family);

    const r2 = await service.refreshTokens(target);
    target = r2.refreshToken;
    expect(tokenUtils.getTokenFamily(target)).toBe(family);

    const r3 = await service.refreshTokens(source);
    expect(tokenUtils.getTokenFamily(r3.refreshToken)).toBe(family);
    expect(user.refreshTokenFamily).toBe(family);
  });

  it('A · 신규 로그인은 여전히 새 family 를 만든다', () => {
    const first = tokenUtils.generateTokens(user, [], 'neture.co.kr');
    const second = tokenUtils.generateTokens(user, [], 'neture.co.kr');
    expect(tokenUtils.getTokenFamily(first.refreshToken)).not.toBe(
      tokenUtils.getTokenFamily(second.refreshToken)
    );
  });

  it('E · family null 이후에는 승계된 family 토큰도 TOKEN_FAMILY_REVOKED', async () => {
    const rotated = await service.refreshTokens(user.__loginRefreshToken);
    user.refreshTokenFamily = null;

    await expect(service.refreshTokens(rotated.refreshToken)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
  });

  it('F · logout-all 이후에는 기존 refresh token 으로 재발급할 수 없다', async () => {
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

  it('D · family 가 어긋난 토큰은 도난으로 판정하고 전체 세션을 폐기한다', async () => {
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
