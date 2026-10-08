/**
 * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1
 * WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1
 *
 * `보안 세션 폐기` 이 실제로 모든 기기의 refresh token 을 무효화하는지,
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
 *   보안 세션 폐기           → family null (전역)
 *
 * ── 이 테스트가 증명하는 것 ────────────────────────────────────────────────
 *   - 정상 세션은 refresh 로 재발급되고 **family 는 유지**된다
 *     (회귀 지점: 회전마다 새 family 를 단일 슬롯에 덮어써 handoff 로 family 를 공유한
 *      다른 origin 의 refresh token 을 stale 로 만들었다 — IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1)
 *   - `revokeAllSessions()` 이후 기존 refresh token 은 절대 재발급되지 않는다
 *     (회귀 지점: `users.refreshTokenFamily = null` 이 family 검사 전체를 우회시켰다)
 *   - 다른 기기에서 발급된 family 는 mismatch 로 거부되고 전체 세션이 폐기된다
 *
 * ── 이 테스트가 증명하지 않는 것 ──────────────────────────────────────────
 *   실제 DB 왕복. 저장소 jest 설정이 `database/connection` 을 전역 mock 하므로
 *   User repository 는 in-memory fake 로 대체한다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuthTokenSessionService } from '../auth-token-session.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { freshenUserContext } from '../auth-context.helper.js';

jest.mock('../auth-context.helper.js', () => ({
  freshenUserContext: jest.fn(async () => ({ roles: [], memberships: [] })),
  persistRefreshTokenFamily: jest.fn(async () => undefined),
}));

describe('refresh token family 계약 — 보안 세션 폐기 무효화', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';

  let service: AuthTokenSessionService;
  let user: any;
  /** `service_session_revocations` 의 in-memory 대역 — 판정 축은 세대다. */
  let revocations: Array<{ userId: string; serviceKey: string; epoch: number }> = [];

  const epochOf = (serviceKey: string): number =>
    revocations.find((r) => r.userId === USER_ID && r.serviceKey === serviceKey)?.epoch ?? 0;

  /**
   * 같은 family 안에서 특정 서비스 귀속으로 refresh token 을 만든다.
   *
   * 세대를 **지금 값으로** 새긴다 = 실제 발급 경로와 같다(로그인·handoff 가 발급 시점의
   * 세대를 읽어 새긴다). `epoch` 를 명시하면 배포 전 토큰(claim 없음)이나 임의 세대도 만든다.
   */
  const makeServiceToken = (serviceKey: string | null, epoch?: number | null): string =>
    tokenUtils.generateTokens(
      user,
      [],
      'neture.co.kr',
      undefined,
      user.refreshTokenFamily,
      serviceKey,
      epoch === undefined ? (serviceKey ? epochOf(serviceKey) : null) : epoch,
    ).refreshToken;

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
          // 로그아웃 = 세대 +1 (없으면 1). 시각은 감사용이라 판정에 쓰지 않는다.
          if (/^INSERT INTO service_session_revocations/i.test(q)) {
            const [userId, serviceKey] = params;
            const found = revocations.find((r) => r.userId === userId && r.serviceKey === serviceKey);
            if (found) found.epoch += 1;
            else revocations.push({ userId, serviceKey, epoch: 1 });
            const epoch = found ? found.epoch : 1;
            return [{ session_epoch: epoch }];
          }
          // serviceKey 를 모르는 토큰의 판정 — 그 사용자의 최대 세대.
          if (/max\(session_epoch\)/i.test(q)) {
            const [userId] = params;
            const rows = revocations.filter((r) => r.userId === userId);
            return [{ max_epoch: rows.length ? Math.max(...rows.map((r) => r.epoch)) : null }];
          }
          // 현재 세대 단건 조회.
          if (/SELECT session_epoch FROM service_session_revocations/i.test(q)) {
            const [userId, serviceKey] = params;
            const found = revocations.find((r) => r.userId === userId && r.serviceKey === serviceKey);
            return found ? [{ session_epoch: found.epoch }] : [];
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

  it('F · 보안 세션 폐기가후에는 기존 refresh token 으로 재발급할 수 없다', async () => {
    const stolenToken = user.__loginRefreshToken;

    await service.revokeAllSessions(USER_ID);
    expect(user.refreshTokenFamily).toBeNull();

    await expect(service.refreshTokens(stolenToken)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
  });

  it('보안 세션 폐기는 다른 기기에서 발급된 토큰도 무효화한다', async () => {
    const deviceA = user.__loginRefreshToken;
    // 기기 B 로그인 — 같은 family 를 승계한 토큰(handoff) 과 새 family 토큰 모두 검사한다.
    const deviceB = makeRefreshTokenForCurrentFamily();

    await service.revokeAllSessions(USER_ID);

    await expect(service.refreshTokens(deviceA)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
    await expect(service.refreshTokens(deviceB)).rejects.toMatchObject({
      code: 'TOKEN_FAMILY_REVOKED',
    });
  });

  it('보안 세션 폐기 후 재로그인하면 새 refresh token 은 정상 동작한다', async () => {
    await service.revokeAllSessions(USER_ID);

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
  // 종전에는 `logout` 이 `revokeAllSessions` 에 위임해서 family 를 비웠다. family 는 **사용자 전체**
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

    /**
     * ⚠ 처음에는 이 케이스를 **재로그인 시각을 2초 뒤로 옮겨** 통과시켰다. 그것은 검사가
     * 아니라 은폐였다 — 실제로는 `iat` 가 초 단위라서 **같은 초에 재로그인하면 거절**됐다.
     * 시간 여행 없이, 로그아웃과 재발급이 같은 순간에 일어나도 통과해야 한다.
     */
    it('로그아웃 **직후 같은 순간에 재로그인**해도 통과한다 (시간 이동 없음)', async () => {
      await service.logout(USER_ID, 'neture');

      const fresh = makeServiceToken('neture'); // 발급 시점의 세대를 새긴다 = 올라간 세대
      await expect(service.refreshTokens(fresh)).resolves.toMatchObject({
        refreshToken: expect.any(String),
      });
    });

    it('같은 순간의 **직전 토큰과 새 토큰이 갈린다** (iat 만으로는 불가능한 판정)', async () => {
      const before = makeServiceToken('neture'); // 세대 0
      await service.logout(USER_ID, 'neture'); // 세대 1
      const after = makeServiceToken('neture'); // 세대 1

      // 두 토큰의 iat 는 같은 초일 수 있다. 세대가 다르므로 정확히 갈린다.
      expect(tokenUtils.getRefreshTokenSessionEpoch(before)).toBe(0);
      expect(tokenUtils.getRefreshTokenSessionEpoch(after)).toBe(1);

      await expect(service.refreshTokens(before)).rejects.toMatchObject({
        code: 'SERVICE_SESSION_REVOKED',
      });
      await expect(service.refreshTokens(after)).resolves.toBeTruthy();
    });

    it('연속 로그아웃도 세대가 계속 올라간다 (같은 순간이어도)', async () => {
      await service.logout(USER_ID, 'neture');
      const gen1 = makeServiceToken('neture');
      await service.logout(USER_ID, 'neture');

      expect(epochOf('neture')).toBe(2);
      await expect(service.refreshTokens(gen1)).rejects.toMatchObject({
        code: 'SERVICE_SESSION_REVOKED',
      });
      await expect(service.refreshTokens(makeServiceToken('neture'))).resolves.toBeTruthy();
    });

    it('세대 0 은 유효한 값이다 — claim 없음으로 취급하지 않는다', async () => {
      // 0 을 truthy 검사로 걸러내면 그 토큰이 '배포 전 토큰' 이 되어 첫 로그아웃 뒤 거절된다.
      const token = makeServiceToken('neture');
      expect(tokenUtils.getRefreshTokenSessionEpoch(token)).toBe(0);
      await expect(service.refreshTokens(token)).resolves.toBeTruthy();
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
      const legacyToken = makeServiceToken(null, null);
      expect(tokenUtils.getRefreshTokenServiceKey(legacyToken)).toBeNull();
      expect(tokenUtils.getRefreshTokenSessionEpoch(legacyToken)).toBeNull();

      await service.logout(USER_ID, 'kpa-society');
      await expect(service.refreshTokens(legacyToken)).rejects.toMatchObject({
        code: 'SERVICE_SESSION_REVOKED',
      });
    });

    it('폐기 기록이 **아예 없으면** 배포 전 토큰도 통과한다 (배포만으로 전원 로그아웃 금지)', async () => {
      const legacyToken = makeServiceToken(null, null);
      expect(revocations).toEqual([]);
      await expect(service.refreshTokens(legacyToken)).resolves.toBeTruthy();
    });

    it('보안 세션 폐기는 여전히 전역 폐기다 — 위임이 아니라 자기 구현으로', async () => {
      const token = user.__loginRefreshToken;
      await service.revokeAllSessions(USER_ID);
      expect(user.refreshTokenFamily).toBeNull();
      await expect(service.refreshTokens(token)).rejects.toMatchObject({
        code: 'TOKEN_FAMILY_REVOKED',
      });
    });

    /**
     * 3차 리뷰 시나리오 5 — 서비스 독립성은 **재로그인까지** 성립해야 한다.
     *
     * A 로그아웃 직후 B 가 살아 있는 것만으로는 부족하다. A 에서 다시 로그인하면
     * `establishSession` 이 `users.refreshTokenFamily`(**사용자당 한 칸**)를 새 family 로
     * 교체하고, 그러면 B 의 다음 refresh 가 family 불일치가 되며 **그 처리가 family 를 비워**
     * 모든 서비스가 연쇄로 죽는다. 세대 축과 무관한, 기존 단일 family 계약의 문제다.
     *
     * 그래서 로그인은 **살아 있는 family 를 승계**한다(handoff 가 이미 그렇게 한다).
     * family = "이 사용자의 살아 있는 세션 계보" 이고, 서비스 단위 종료는 세대가 담당한다.
     */
    it('시나리오 5 · A 로그아웃 → A 재로그인 → **B refresh 가 살아 있다**', async () => {
      const familyBefore = user.refreshTokenFamily;
      const bToken = makeServiceToken('kpa-society'); // B 세션

      await service.logout(USER_ID, 'neture'); // A 로그아웃

      // A 재로그인: 실제 로그인 경로와 같이 **살아 있는 family 를 승계**해 발급한다.
      const aReissued = tokenUtils.generateTokens(
        user,
        [],
        'neture.co.kr',
        undefined,
        user.refreshTokenFamily, // 승계 — 새 family 를 만들지 않는다
        'neture',
        epochOf('neture'),
      ).refreshToken;
      expect(tokenUtils.getTokenFamily(aReissued)).toBe(familyBefore);

      // A 는 새 세대로 통과하고, B 는 family 도 세대도 그대로이므로 통과한다.
      await expect(service.refreshTokens(aReissued)).resolves.toBeTruthy();
      await expect(service.refreshTokens(bToken)).resolves.toBeTruthy();
      expect(user.refreshTokenFamily).toBe(familyBefore);
    });

    it('로그인 경로가 살아 있는 family 를 승계한다 (소스 고정)', () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, '..', 'auth-context.helper.ts'),
        'utf-8',
      );
      // 새 family 를 무조건 만들면 다른 서비스 세션이 family 불일치로 연쇄 사망한다.
      expect(src).toContain('const reuseFamily = user.refreshTokenFamily ?? null;');
      // 되돌리면 시나리오 5 가 재발한다 — 정규식 대신 문자열로 본다(이스케이프가 한 겹
      // 벗겨지면 조용히 통과하는 종류의 검사다).
      const args = src.replace(/\s+/g, ' ');
      expect(args).toContain('ctx.memberships, reuseFamily, serviceKey,');
      expect(args).not.toContain('ctx.memberships, null, serviceKey,');
    });

    it('두 경로는 서로 다른 동작이다 (같은 함수로 되돌아가면 실패한다)', async () => {
      const before = user.refreshTokenFamily;
      await service.logout(USER_ID, 'neture');
      const afterLogout = user.refreshTokenFamily;
      await service.revokeAllSessions(USER_ID);
      const afterLogoutAll = user.refreshTokenFamily;

      expect({ afterLogout, afterLogoutAll }).toEqual({ afterLogout: before, afterLogoutAll: null });
    });
  });

  // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 보완 3: 수단 표식은 **로그인한 수단**을 따른다 —
  //   계정에 Google 이 연결돼 있는지는 보지 않는다(refresh 경로는 linked_accounts 를 읽지 않는다).
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

    it('P4 Google 세션(표식 없음)은 platform 역할이 있어도 종전대로 회전된다', async () => {
      jest.mocked(freshenUserContext).mockResolvedValueOnce({ roles: ['platform:super_admin'], memberships: [] } as any);
      const rotated = await service.refreshTokens(user.__loginRefreshToken);
      expect((tokenUtils.verifyAccessToken(rotated.accessToken) as any)?.authMethod).toBeUndefined();
    });
  });
});
