/**
 * WO-O4O-SERVICE-MEMBER-SOFT-DELETE-CROSS-SERVICE-ISOLATION-V1
 *
 * 서비스 운영자의 회원 탈퇴(soft delete)가 **해당 서비스 Membership 에만** 적용되는지 고정한다.
 *
 * 배경: 계정 통제 경계의 마지막 잔여 CROSS_SERVICE_RISK.
 *   이전 구현은 호출자 권한과 무관하게 두 개의 전역 write 를 실행했다.
 *     1) UPDATE users SET status='deleted', "isActive"=false  → 모든 서비스 로그인·세션 차단
 *     2) UPDATE service_memberships WHERE user_id=$1          → 다른 서비스 membership 까지 종료
 *
 * 권한 경계 (WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1 에서 재정의):
 *   서비스 운영자 → 자기 서비스 membership + role 만 (users 무접촉)
 *   플랫폼 관리자 → **같은 규칙**. 권한은 "어느 서비스든 처리할 수 있다" 는 뜻이고,
 *                   변경 범위는 요청이 명시한 serviceKey 다. 범위가 없으면 거부(fail-closed).
 */

type Row = Record<string, any>;

interface FakeDb {
  memberships: Row[];
  roles: Row[];
  users: Row[];
}

let db: FakeDb;
const queries: { sql: string; params: any[] }[] = [];

function driverShape(sql: string, rows: Row[]): any {
  const command = sql.trim().split(/\s+/)[0].toUpperCase();
  if (command === 'UPDATE' || command === 'DELETE') return [rows, rows.length];
  return rows;
}

const has = (sql: string, ...needles: string[]) => needles.every((n) => sql.includes(n));

function runQuery(sql: string, params: any[] = []): any {
  const s = sql.replace(/\s+/g, ' ').trim();
  queries.push({ sql: s, params });

  // service boundary check
  if (has(s, 'SELECT 1 FROM service_memberships')) {
    const [userId, keys] = params;
    const rows = db.memberships.filter(
      (m) => m.user_id === userId && (keys === undefined || (keys as string[]).includes(m.service_key)),
    );
    return driverShape(s, rows.map(() => ({ '?column?': 1 })));
  }

  if (has(s, 'UPDATE service_memberships')) {
    const [userId, keys] = params;
    const scoped = Array.isArray(keys);
    const affected = db.memberships.filter(
      (m) => m.user_id === userId && (!scoped || (keys as string[]).includes(m.service_key)),
    );
    for (const m of affected) m.status = 'withdrawn';
    return driverShape(s, affected.map((m) => ({ id: m.id })));
  }

  // WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1: hard delete 경로 — 범위 밖 row 가 지워지지 않는지 보기 위해 DELETE 도 흉내낸다.
  if (has(s, 'DELETE FROM service_memberships')) {
    const [userId, keys] = params;
    const scoped = Array.isArray(keys);
    const removed = db.memberships.filter(
      (m) => m.user_id === userId && (!scoped || (keys as string[]).includes(m.service_key)),
    );
    db.memberships = db.memberships.filter((m) => !removed.includes(m));
    return driverShape(s, removed.map((m) => ({ id: m.id })));
  }

  if (has(s, 'DELETE FROM role_assignments')) {
    const [userId, likePattern] = params;
    const prefix = String(likePattern).replace(/%$/, '');
    const removed = db.roles.filter((r) => r.user_id === userId && String(r.role).startsWith(prefix));
    db.roles = db.roles.filter((r) => !removed.includes(r));
    return driverShape(s, removed.map((r) => ({ id: r.id })));
  }

  // users : WHERE id = $1 만 있는 전역 write
  if (has(s, 'UPDATE users')) {
    const [userId] = params;
    const target = db.users.find((u) => u.id === userId);
    if (target) {
      target.status = 'deleted';
      target.isActive = false;
    }
    return driverShape(s, target ? [{ id: target.id }] : []);
  }

  if (has(s, 'UPDATE role_assignments')) {
    const [userId, likePattern] = params;
    const prefix = String(likePattern).replace(/%$/, '');
    const affected = db.roles.filter(
      (r) => r.user_id === userId && r.is_active === true && String(r.role).startsWith(prefix),
    );
    for (const r of affected) r.is_active = false;
    return driverShape(s, affected.map((r) => ({ id: r.id })));
  }

  return driverShape(s, []);
}

const fakeQueryRunner = {
  connect: jest.fn(async () => {}),
  startTransaction: jest.fn(async () => {}),
  commitTransaction: jest.fn(async () => {}),
  rollbackTransaction: jest.fn(async () => {}),
  release: jest.fn(async () => {}),
  query: jest.fn(async (sql: string, params?: any[]) => runQuery(sql, params)),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    createQueryRunner: () => fakeQueryRunner,
    query: jest.fn(async (sql: string, params?: any[]) => runQuery(sql, params)),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { MembershipApprovalService } from '../MembershipApprovalService.js';

const service = new MembershipApprovalService();

function seed() {
  db = {
    memberships: [
      { id: 'm-kcos2', user_id: 'u1', service_key: 'k-cosmetics', role: 'pharmacy', status: 'active' },
      { id: 'm-kpa', user_id: 'u1', service_key: 'kpa-society', role: 'member', status: 'active' },
      { id: 'm-neture', user_id: 'u1', service_key: 'neture', role: 'supplier', status: 'active' },
    ],
    roles: [
      { id: 'ra-1', user_id: 'u1', role: 'cosmetics:pharmacy', is_active: true },
      { id: 'ra-2', user_id: 'u1', role: 'kpa:member', is_active: true },
      { id: 'ra-3', user_id: 'u1', role: 'neture:supplier', is_active: true },
      // 플랫폼 역할 — 어떤 경우에도 자동 비활성화 금지
      { id: 'ra-plat', user_id: 'u1', role: 'platform:super_admin', is_active: true },
    ],
    users: [{ id: 'u1', status: 'active', isActive: true }],
  };
  queries.length = 0;
  jest.clearAllMocks();
}

const user = () => db.users.find((u) => u.id === 'u1')!;
const membership = (id: string) => db.memberships.find((m) => m.id === id)!;
const role = (id: string) => db.roles.find((r) => r.id === id)!;
const usersWrites = () => queries.filter((q) => /^UPDATE users/i.test(q.sql));

const softDeleteAsOperator = () =>
  service.deleteMember({
    userId: 'u1',
    deletedBy: 'op-1',
    isPlatformAdmin: false,
    serviceKeys: ['k-cosmetics'],
    mode: 'soft',
  });

/**
 * WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1:
 *   플랫폼 관리자도 **대상 서비스를 명시**한다. 요청자 권한은 변경 범위를 넓히지 않는다.
 */
const softDeleteAsPlatformAdmin = (serviceKeys: string[]) =>
  service.deleteMember({
    userId: 'u1',
    deletedBy: 'admin-1',
    isPlatformAdmin: true,
    serviceKeys,
    mode: 'soft',
  });

const hardDeleteAsPlatformAdmin = (serviceKeys: string[]) =>
  service.deleteMember({
    userId: 'u1',
    deletedBy: 'admin-1',
    isPlatformAdmin: true,
    serviceKeys,
    mode: 'hard',
  });

const roleOrUndefined = (id: string) => db.roles.find((r) => r.id === id);
const membershipKeys = () => db.memberships.map((m) => m.service_key).sort();

describe('deleteMember(soft) — 서비스 탈퇴의 cross-service 격리', () => {
  describe('서비스 운영자', () => {
    it('users 공통 계정을 건드리지 않는다 (다른 서비스 로그인·세션 보존)', async () => {
      seed();

      const ok = await softDeleteAsOperator();

      expect(ok).toBe(true);
      expect(usersWrites()).toEqual([]);
      expect(user().status).toBe('active');
      expect(user().isActive).toBe(true);
    });

    it('대상 서비스 Membership 만 withdrawn 으로 종료한다', async () => {
      seed();

      await softDeleteAsOperator();

      expect(membership('m-kcos2').status).toBe('withdrawn');
      expect(membership('m-kpa').status).toBe('active');
      expect(membership('m-neture').status).toBe('active');
    });

    it('membership UPDATE 가 serviceKeys 로 스코프된다', async () => {
      seed();

      await softDeleteAsOperator();

      const smUpdates = queries.filter((q) => /^UPDATE service_memberships/i.test(q.sql));
      expect(smUpdates).toHaveLength(1);
      expect(smUpdates[0].sql).toContain('service_key = ANY($2)');
      expect(smUpdates[0].params).toEqual(['u1', ['k-cosmetics']]);
    });

    it('대상 서비스 Role 만 비활성화하고 다른 서비스·플랫폼 Role 은 보존한다', async () => {
      seed();

      await softDeleteAsOperator();

      expect(role('ra-1').is_active).toBe(false); // pharmacy-hub:*
      expect(role('ra-2').is_active).toBe(true); // kpa:*
      expect(role('ra-3').is_active).toBe(true); // neture:*
      expect(role('ra-plat').is_active).toBe(true); // platform:*
    });

    it('스코프 밖 사용자는 boundary check 에서 차단된다', async () => {
      seed();
      db.memberships = db.memberships.filter((m) => m.service_key !== 'k-cosmetics');

      const ok = await softDeleteAsOperator();

      expect(ok).toBe(false);
      expect(usersWrites()).toEqual([]);
      expect(membership('m-kpa').status).toBe('active');
    });
  });

  describe('플랫폼 관리자 — 권한이 변경 범위를 넓히지 않는다', () => {
    /**
     * WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1 — Authorization capability ≠ Mutation target scope
     *
     *   구 계약은 "플랫폼 관리자의 soft delete = 계정 전체 탈퇴 + 전 서비스 종료" 였고
     *   이 describe 가 `users.status='deleted'` 와 전 서비스 withdrawn 을 단정했다.
     *
     *   문제는 **범위가 의도가 아니라 요청자 권한으로 정해진다**는 점이었다 —
     *   k-cosmetics 회원 관리에서 누른 "탈퇴 처리" 도 요청자가 super_admin 이면 이 분기로 들어와
     *   그 사용자의 neture·KPA 관계까지 끊고 계정까지 죽였다(`requireAuth` 가 `isActive` 를 본다).
     *
     *   새 계약: 대상은 **명시한 serviceKey** 로만 정하고, 범위가 없으면 전 서비스 fallback 대신
     *   거부한다. 계약을 지우지 않고 **뒤집어** 고정한다 — 되살아나면 이 테스트가 먼저 깨진다.
     */
    it('범위가 비면 거부한다 — fail-closed (soft · DB write 0)', async () => {
      seed();

      const ok = await softDeleteAsPlatformAdmin([]);

      expect(ok).toBe(false);
      // 트랜잭션 진입 전에 거부한다 — 어떤 쿼리도 실행되지 않는다.
      expect(queries).toEqual([]);
      expect(membershipKeys()).toEqual(['k-cosmetics', 'kpa-society', 'neture']);
      expect(user().status).toBe('active');
      expect(user().isActive).toBe(true);
    });

    it('범위가 비면 거부한다 — fail-closed (hard · DB write 0)', async () => {
      seed();

      const ok = await hardDeleteAsPlatformAdmin([]);

      expect(ok).toBe(false);
      expect(queries).toEqual([]);
      expect(membershipKeys()).toEqual(['k-cosmetics', 'kpa-society', 'neture']);
      expect(user().isActive).toBe(true);
    });

    it('명시한 서비스만 종료한다 (soft · 다른 서비스 membership 불변)', async () => {
      seed();

      const ok = await softDeleteAsPlatformAdmin(['neture']);

      expect(ok).toBe(true);
      expect(membership('m-neture').status).toBe('withdrawn');
      expect(membership('m-kcos2').status).toBe('active');
      expect(membership('m-kpa').status).toBe('active');

      const smUpdates = queries.filter((q) => /^UPDATE service_memberships/i.test(q.sql));
      expect(smUpdates).toHaveLength(1);
      expect(smUpdates[0].params).toEqual(['u1', ['neture']]);
    });

    it('role 정리도 명시한 서비스 prefix 에만 적용된다 (soft)', async () => {
      seed();

      await softDeleteAsPlatformAdmin(['neture']);

      expect(role('ra-3').is_active).toBe(false); // neture:*
      expect(role('ra-1').is_active).toBe(true); // cosmetics:*
      expect(role('ra-2').is_active).toBe(true); // kpa:*
      expect(role('ra-plat').is_active).toBe(true); // platform:*
    });

    it('users 는 어느 경우에도 건드리지 않는다 (soft · hard)', async () => {
      seed();
      await softDeleteAsPlatformAdmin(['neture']);
      expect(usersWrites()).toEqual([]);

      seed();
      await hardDeleteAsPlatformAdmin(['neture']);
      expect(usersWrites()).toEqual([]);
      expect(user().status).toBe('active');
      expect(user().isActive).toBe(true);
    });

    it('KPA profile/organization 정리는 대상 serviceKey 가 KPA 일 때만 한다 (hard)', async () => {
      seed();
      await hardDeleteAsPlatformAdmin(['neture']);
      expect(queries.filter((q) => /kpa_members/i.test(q.sql))).toEqual([]);

      seed();
      await hardDeleteAsPlatformAdmin(['kpa-society']);
      expect(queries.filter((q) => /kpa_members/i.test(q.sql)).length).toBeGreaterThan(0);
    });
  });

  describe('다중 membership — 마지막 관계까지 끊어도 Identity 는 남는다', () => {
    /**
     * WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1 §7 production acceptance 와 같은 순서를 단위로 고정한다.
     *   neture + k-cosmetics 두 관계를 **한 번에 하나씩** 종료하고,
     *   두 번째에서 membership 이 0 이 되어도 `users` 는 active 로 남아야 한다.
     */
    function seedTwo() {
      seed();
      db.memberships = db.memberships.filter((m) => m.service_key !== 'kpa-society');
      db.roles = db.roles.filter((r) => r.id !== 'ra-2');
    }

    it('serviceKey=neture → neture 만 사라지고 k-cosmetics 는 role 까지 불변', async () => {
      seedTwo();

      const ok = await hardDeleteAsPlatformAdmin(['neture']);

      expect(ok).toBe(true);
      expect(membershipKeys()).toEqual(['k-cosmetics']);
      expect(membership('m-kcos2').status).toBe('active');
      expect(roleOrUndefined('ra-3')).toBeUndefined(); // neture:supplier 삭제
      expect(roleOrUndefined('ra-1')?.is_active).toBe(true); // cosmetics:pharmacy 불변
      expect(roleOrUndefined('ra-plat')?.is_active).toBe(true);
      expect(user().status).toBe('active');
      expect(user().isActive).toBe(true);
      expect(usersWrites()).toEqual([]);
    });

    it('이어서 serviceKey=k-cosmetics → memberships 0, users 는 여전히 active', async () => {
      seedTwo();

      await hardDeleteAsPlatformAdmin(['neture']);
      const ok = await hardDeleteAsPlatformAdmin(['k-cosmetics']);

      expect(ok).toBe(true);
      expect(membershipKeys()).toEqual([]);
      // 관계가 0개여도 Identity 는 존재한다 — 이 WO 의 불변식.
      expect(user().status).toBe('active');
      expect(user().isActive).toBe(true);
      expect(usersWrites()).toEqual([]);
      expect(roleOrUndefined('ra-plat')?.is_active).toBe(true);
    });
  });
});
