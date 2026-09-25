/**
 * WO-O4O-PLATFORM-ADMIN-SERVICE-ROLE-RESET-V1
 *
 * 플랫폼 관리자의 역할 정리 계약을 판정부 단위로 고정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 운영 모델
 *
 *   platform:super_admin = **모든 서비스의 운영자를 지정·해제하는 권한**
 *   platform:super_admin ≠ 각 서비스의 admin
 *   platform:super_admin ≠ 각 서비스의 operator
 *
 *   그런데 종전 가드는
 *     ① 자기 역할 해제를 요청자와 무관하게 전면 금지했고
 *     ② 마지막 `{service}:admin` 해제를 요청자와 무관하게 금지했다.
 *   그래서 관리자 계정에 붙은 불필요한 서비스 역할을 **정리할 경로 자체가 없었다**
 *   (두 번째 super_admin 을 임시로 세우는 우회만 남았고, 그것은 정비가 아니다).
 *
 * 새 계약
 *
 *   platform:super_admin 자신의 service-scoped role 해제 = 허용
 *   platform:super_admin 자신의 platform role 해제       = 금지 (복구 불가 상태 방지)
 *   platform:super_admin 의 마지막 {service}:admin 해제   = 허용 (다시 지정할 수 있다)
 *   그 밖의 요청자                                        = 기존 보호 그대로
 */
import {
  canRevokeOwnRole,
  isServiceScopedRole,
  revokeServiceAdminRoleWithLock,
} from '../role-revoke-safety.js';

describe('isServiceScopedRole', () => {
  it.each(['neture:admin', 'kpa:operator', 'kpa-branch:operator', 'cosmetics:admin', 'pharmacy-hub:operator'])(
    '%s 는 service-scoped 다',
    (role) => {
      expect(isServiceScopedRole(role)).toBe(true);
    },
  );

  it.each(['platform:super_admin', 'platform:admin'])('%s 는 service-scoped 가 아니다', (role) => {
    expect(isServiceScopedRole(role)).toBe(false);
  });

  it('prefix 가 없는 legacy 이름은 service-scoped 로 단정하지 않는다 (fail-closed)', () => {
    for (const role of ['admin', 'operator', 'super_admin', '']) {
      expect(isServiceScopedRole(role)).toBe(false);
    }
  });

  it('형태가 깨진 입력도 false 다', () => {
    for (const role of [':admin', 'neture:', null, undefined, 42, {}]) {
      expect(isServiceScopedRole(role as unknown)).toBe(false);
    }
  });
});

describe('canRevokeOwnRole', () => {
  it('플랫폼 관리자는 자기 service-scoped 역할을 해제할 수 있다', () => {
    expect(canRevokeOwnRole({ requesterIsPlatformSuperAdmin: true, role: 'neture:operator' })).toBe(true);
    expect(canRevokeOwnRole({ requesterIsPlatformSuperAdmin: true, role: 'cosmetics:admin' })).toBe(true);
  });

  it('플랫폼 관리자여도 자기 platform 역할은 해제할 수 없다', () => {
    expect(canRevokeOwnRole({ requesterIsPlatformSuperAdmin: true, role: 'platform:super_admin' })).toBe(false);
    expect(canRevokeOwnRole({ requesterIsPlatformSuperAdmin: true, role: 'platform:admin' })).toBe(false);
  });

  it('플랫폼 관리자가 아니면 어떤 역할도 자기 해제할 수 없다', () => {
    for (const role of ['neture:operator', 'cosmetics:admin', 'platform:admin']) {
      expect(canRevokeOwnRole({ requesterIsPlatformSuperAdmin: false, role })).toBe(false);
    }
  });
});

describe('revokeServiceAdminRoleWithLock — allowLastAdmin', () => {
  /** 최소 트랜잭션 러너 — 실제 SQL 형태를 그대로 받는다 */
  function makeRunner(holders: string[]) {
    const sqls: Array<{ sql: string; params: unknown[] }> = [];
    let updated = 0;
    const runner = {
      transaction: async <T>(fn: (m: { query: (sql: string, params?: unknown[]) => Promise<any> }) => Promise<T>) =>
        fn({
          query: async (sql: string, params: unknown[] = []) => {
            sqls.push({ sql, params });
            if (/SELECT user_id FROM role_assignments/i.test(sql)) {
              return holders.map((user_id) => ({ user_id }));
            }
            updated += 1;
            return [[], 1];
          },
        }),
    };
    return { runner, sqls, updates: () => updated };
  }

  it('기본값은 종전 그대로 — 마지막 admin 이면 해제하지 않는다', async () => {
    const { runner, updates } = makeRunner(['u1']);

    const outcome = await revokeServiceAdminRoleWithLock(runner, 'u1', 'neture:admin');

    expect(outcome).toEqual({ status: 'last_admin' });
    expect(updates()).toBe(0);
  });

  it('allowLastAdmin 이면 마지막 admin 도 해제한다', async () => {
    const { runner, sqls, updates } = makeRunner(['u1']);

    const outcome = await revokeServiceAdminRoleWithLock(runner, 'u1', 'neture:admin', {
      allowLastAdmin: true,
    });

    expect(outcome).toEqual({ status: 'revoked', affected: 1 });
    expect(updates()).toBe(1);
    // 예외를 열어도 잠금 절차는 그대로다.
    expect(sqls[0].sql).toMatch(/FOR UPDATE/i);
  });

  it('allowLastAdmin 이어도 보유자가 아니면 해제하지 않는다', async () => {
    const { runner, updates } = makeRunner(['other']);

    const outcome = await revokeServiceAdminRoleWithLock(runner, 'u1', 'neture:admin', {
      allowLastAdmin: true,
    });

    expect(outcome).toEqual({ status: 'not_holder' });
    expect(updates()).toBe(0);
  });

  it('admin 이 2명 이상이면 옵션과 무관하게 해제한다', async () => {
    for (const allowLastAdmin of [false, true]) {
      const { runner } = makeRunner(['u1', 'u2']);
      const outcome = await revokeServiceAdminRoleWithLock(runner, 'u1', 'kpa:admin', { allowLastAdmin });
      expect(outcome).toEqual({ status: 'revoked', affected: 1 });
    }
  });
});
