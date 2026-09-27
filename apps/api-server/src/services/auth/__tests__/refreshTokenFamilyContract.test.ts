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
 *   logout (서비스 하나) → family **유지** + service_session_revocations 행 기록
 *                          (그 서비스 토큰만 무효 · 다른 서비스 세션은 살아 있다)
 *   logout-all           → family null (전역)
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
  let revocations: Array<{ userId: string; serviceKey: string; revokedAt: Date }> = [];

  /** 같은 family 안에서 특정 서비스 귀속으로 refresh token 을 만든다. */
  const makeServiceToken = (serviceKey: string | null): string =>
    tokenUtils.generateTokens(user, [], 'neture.co.kr', undefined, user.refreshTokenFamily, serviceKey)
      .refreshToken;

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
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8:
    //   서비스 단위 폐기는 `service_session_revocations` 를 raw SQL 로 읽고 쓴다.
    //   저장소 jest 설정이 connection 을 전역 mock 하므로 그 표를 in-memory 로 흉내낸다.
    revocations = [];
    (service as any)._userRepo = {
      findOne: jest.fn(async () => user),
      save: jest.fn(async (u: any) => u),
      manager: {
        query: async (sql: string, params: any[] = []) => {
          const q = sql.replace(/\s+/g, ' ');
          if (/^INSERT INTO service_session_revocations/i.test(q)) {
            const [userId, serviceKey] = params;
            const found = revocations.find((r) => r.userId === userId && r.serviceKey === serviceKey);
            if (found) found.revokedAt = new Date();
            else revocations.push({ userId, serviceKey, revokedAt: new Date() });
            return [];
          }
          if (/FROM service_session_revocations/i.test(q)) {
            // serviceKey 지정 질의(파라미터 3개)와 legacy 전체 질의(2개)를 구분한다.
            const perService = params.length === 3;
            const [userId] = params;
            const serviceKey = perService ? params[1] : undefined;
            const issuedAt: Date = perService ? params[2] : params[1];
            return revocations
              .filter((r) => r.userId === userId)
              .filter((r) => (perService ? r.serviceKey === serviceKey : true))
              .filter((r) => r.revokedAt > issuedAt)
              .slice(0, 1)
              .map((r) => ({ revoked_at: r.revokedAt }));
          }
          return [];
        },
      },
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

  // ── WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (S7) ────────────────
  //
  // 종전에는 `logout` 이 `logoutAll` 에 위임해서 family 를 비웠다. family 는 **사용자 전체**
  // 범위이므로, 한 서비스에서 로그아웃하면 9개 주소의 refresh 가 모두 거부됐다.
  // 프런트는 두 경로를 이미 구분해 불렀으므로(useServiceAuth) 차이는 서버 하나에 있었다.
  describe('S7 · 서비스 단위 로그아웃 — 서버에서 실제로 무효화된다', () => {
    /**
     * 이 블록이 막는 것 두 가지.
     *
     *   ① `logout` 을 다시 전역 폐기로 되돌리는 것 (`users.refreshTokenFamily = null`).
     *      그러면 한 서비스 로그아웃이 모든 주소를 끊는다.
     *   ② `logout` 을 **기록만** 하게 두는 것.
     *      그러면 이미 발급된 refresh token 이 서버에서 계속 유효해 "세션 종료" 가 아니다.
     *      두 실패 모드가 서로 반대 방향이라 한쪽만 고정하면 다른 쪽으로 넘어간다.
     */
    it('logout 은 그 서비스 토큰을 **서버에서** 거절하게 만든다', async () => {
      const token = makeServiceToken('neture');
      await service.logout(USER_ID, 'neture');

      await expect(service.refreshTokens(token)).rejects.toMatchObject({
        code: 'SERVICE_SESSION_REVOKED',
      });
    });

    it('**다른 서비스** 토큰은 계속 동작한다 (같은 family 를 공유해도)', async () => {
      const family = user.refreshTokenFamily;
      const kpaToken = makeServiceToken('kpa-society');

      await service.logout(USER_ID, 'neture');

      const rotated = await service.refreshTokens(kpaToken);
      expect(tokenUtils.getTokenFamily(rotated.refreshToken)).toBe(family);
    });

    it('회전된 토큰도 서비스 귀속을 **승계**한다 (회전으로 무효화를 피할 수 없다)', async () => {
      const rotated = await service.refreshTokens(makeServiceToken('neture'));
      expect(tokenUtils.getRefreshTokenServiceKey(rotated.refreshToken)).toBe('neture');

      await service.logout(USER_ID, 'neture');
      await expect(service.refreshTokens(rotated.refreshToken)).rejects.toMatchObject({
        code: 'SERVICE_SESSION_REVOKED',
      });
    });

    it('로그아웃 **뒤에 새로 로그인**하면 통과한다 (영구 차단이 아니다)', async () => {
      await service.logout(USER_ID, 'neture');
      // 새 로그인 = 더 늦은 iat. 1초 뒤로 발급해 초 단위 iat 가 확실히 커지게 한다.
      const later = Math.floor(Date.now() / 1000) + 2;
      jest.spyOn(Date, 'now').mockReturnValue(later * 1000);
      try {
        const fresh = makeServiceToken('neture');
        await expect(service.refreshTokens(fresh)).resolves.toMatchObject({
          refreshToken: expect.any(String),
        });
      } finally {
        (Date.now as jest.Mock).mockRestore();
      }
    });

    it('logout 은 전역 축(users.refreshTokenFamily)을 건드리지 않는다', async () => {
      const before = user.refreshTokenFamily;
      const save = (service as any)._userRepo.save as jest.Mock;
      save.mockClear();

      await service.logout(USER_ID, 'neture');

      expect(user.refreshTokenFamily).toBe(before);
      expect(save).not.toHaveBeenCalled();
    });

    it('서비스를 판정하지 못하면 **전역으로 넓히지 않는다** (폐기 0건)', async () => {
      await service.logout(USER_ID, null);
      expect(revocations).toEqual([]);
      // 기존 토큰은 그대로 살아 있다 — 범위를 모르는 채 끊지 않는다.
      await expect(service.refreshTokens(user.__loginRefreshToken)).resolves.toBeTruthy();
    });

    it('serviceKey claim 이 없는 **배포 전 토큰**은 어느 서비스 로그아웃에도 거절된다 (보안 후퇴 금지)', async () => {
      // 이 변경 배포 전 발급분 = claim 없음. 통과시키면 7일간 로그아웃이 무력해진다.
      const legacyToken = makeServiceToken(null);
      expect(tokenUtils.getRefreshTokenServiceKey(legacyToken)).toBeNull();

      await service.logout(USER_ID, 'kpa-society');
      await expect(service.refreshTokens(legacyToken)).rejects.toMatchObject({
        code: 'SERVICE_SESSION_REVOKED',
      });
    });

    it('logout-all 은 여전히 전역 폐기다 — 위임이 아니라 자기 구현으로', async () => {
      const token = user.__loginRefreshToken;
      await service.logoutAll(USER_ID);
      expect(user.refreshTokenFamily).toBeNull();
      await expect(service.refreshTokens(token)).rejects.toMatchObject({
        code: 'TOKEN_FAMILY_REVOKED',
      });
    });

    it('두 경로는 서로 다른 동작이다 (같은 함수로 되돌아가면 실패한다)', async () => {
      const before = user.refreshTokenFamily;
      await service.logout(USER_ID, 'neture');
      const afterLogout = user.refreshTokenFamily;
      await service.logoutAll(USER_ID);
      const afterLogoutAll = user.refreshTokenFamily;

      expect({ afterLogout, afterLogoutAll }).toEqual({ afterLogout: before, afterLogoutAll: null });
    });
  });
});
