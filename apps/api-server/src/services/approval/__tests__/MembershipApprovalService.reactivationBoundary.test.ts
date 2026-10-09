/**
 * WO-O4O-MEMBERSHIP-REACTIVATION-PLATFORM-SUSPENSION-BOUNDARY-V1
 *
 * 서비스 운영자의 Membership 재활성화가 **플랫폼 정지를 해제하지 못하는지** 고정한다.
 *
 * 배경: WO-...-REJECTION-CROSS-SERVICE-ISOLATION-V1 이 "서비스 운영자 → users 전역 차단"을 막았다.
 *       그 대칭 결함이 "서비스 운영자 → 플랫폼 정지 해제" 이며 본 테스트가 그 경계를 고정한다.
 *
 * 현재 정책(2026-10-09 사용자 확정): 서비스 API는 admin/operator/platform 호출자 모두
 * users 상태를 보존한다. 공통 계정 정지·삭제 복구는 중앙 계정 관리 전용이다.
 */

type Row = Record<string, any>;

interface FakeDb {
  memberships: Row[];
  roles: Row[];
  users: Row[];
}

let db: FakeDb;
const queries: { sql: string; params: any[] }[] = [];

/** pg driver 반환 형태 모사: SELECT → rows, UPDATE/DELETE/INSERT → [rows, rowCount] */
function driverShape(sql: string, rows: Row[]): any {
  const command = sql.trim().split(/\s+/)[0].toUpperCase();
  if (command === 'UPDATE' || command === 'DELETE') return [rows, rows.length];
  return rows;
}

const has = (sql: string, ...needles: string[]) => needles.every((n) => sql.includes(n));

function runQuery(sql: string, params: any[] = []): any {
  const s = sql.replace(/\s+/g, ' ').trim();
  queries.push({ sql: s, params });

  if (has(s, 'SELECT', 'FROM service_memberships')) {
    const [userId, keys] = params;
    const rows = db.memberships.filter(
      (m) =>
        m.user_id === userId &&
        ['suspended', 'withdrawn'].includes(m.status) &&
        (keys === undefined || (keys as string[]).includes(m.service_key)),
    );
    return driverShape(s, rows.map((m) => ({ ...m })));
  }

  if (has(s, 'UPDATE service_memberships')) {
    const ids: string[] = params[1] ?? [];
    const affected = db.memberships.filter((m) => ids.includes(m.id));
    for (const m of affected) m.status = 'active';
    return driverShape(s, affected.map((m) => ({ id: m.id })));
  }

  // ---- users : 실제 WHERE 조건을 평가해 "정말 갱신됐는지" 를 본다 ----
  if (has(s, 'UPDATE users')) {
    const [userId, liftable] = params;
    const target = db.users.find((u) => u.id === userId);
    if (!target) return driverShape(s, []);
    const allowed: string[] = Array.isArray(liftable) ? liftable : [];
    if (!allowed.includes(target.status)) return driverShape(s, []); // 조건 불일치 → 미갱신
    target.status = 'active';
    target.isActive = true;
    return driverShape(s, [{ id: target.id }]);
  }

  // ---- role_assignments (재활성화 STEP3) ----
  if (s.startsWith('SELECT id FROM role_assignments')) {
    const [userId, role] = params;
    const wantActive = s.includes('is_active = true');
    return driverShape(
      s,
      db.roles.filter((r) => r.user_id === userId && r.role === role && r.is_active === wantActive).map((r) => ({ id: r.id })),
    );
  }
  if (has(s, 'UPDATE role_assignments')) {
    const [userId, role] = params;
    const affected = db.roles.filter((r) => r.user_id === userId && r.role === role);
    for (const r of affected) r.is_active = true;
    return driverShape(s, affected.map((r) => ({ id: r.id })));
  }
  if (has(s, 'INSERT INTO role_assignments')) {
    const [userId, role] = params;
    const existing = db.roles.find((r) => r.user_id === userId && r.role === role && r.is_active === true);
    if (existing) return driverShape(s, [{ id: existing.id }]);
    const row = { id: `ra-${db.roles.length + 1}`, user_id: userId, role, is_active: true };
    db.roles.push(row);
    return driverShape(s, [{ id: row.id }]);
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

/** @param userStatus 재활성화 시점의 users.status */
function seed(userStatus: string) {
  db = {
    memberships: [
      { id: 'm-ph', user_id: 'u1', service_key: 'pharmacy-hub', role: 'pharmacy', status: 'suspended' },
      { id: 'm-kpa', user_id: 'u1', service_key: 'kpa-society', role: 'member', status: 'suspended' },
    ],
    roles: [{ id: 'ra-1', user_id: 'u1', role: 'member', is_active: false }],
    users: [{ id: 'u1', status: userStatus, isActive: false }],
  };
  queries.length = 0;
  jest.clearAllMocks();
}

const user = () => db.users.find((u) => u.id === 'u1')!;

const reactivateAsOperator = () =>
  service.reactivateMembership({
    userId: 'u1',
    reactivatedBy: 'op-1',
    isPlatformAdmin: false,
    serviceKeys: ['pharmacy-hub'],
  });

const reactivateAsPlatformAdmin = () =>
  service.reactivateMembership({
    userId: 'u1',
    reactivatedBy: 'admin-1',
    isPlatformAdmin: true,
    serviceKeys: [],
  });

describe('reactivateMembership — 플랫폼 정지 경계', () => {
  describe('서비스 운영자', () => {
    it('플랫폼 정지(users.status=suspended)를 해제하지 못한다', async () => {
      seed('suspended');

      const result = await reactivateAsOperator();

      expect(result).not.toBeNull();
      // 플랫폼 정지는 그대로
      expect(user().status).toBe('suspended');
      expect(user().isActive).toBe(false);
      // 해제 후보에서 'suspended' 가 빠졌는지 파라미터로 확인
      expect(queries.some(q => /^UPDATE users/i.test(q.sql))).toBe(false);
    });

    it('플랫폼 정지 상태여도 자기 서비스 membership 은 정상 재활성화된다', async () => {
      seed('suspended');

      await reactivateAsOperator();

      expect(db.memberships.find((m) => m.id === 'm-ph')!.status).toBe('active');
    });

    it('다른 서비스 membership 은 건드리지 않는다', async () => {
      seed('suspended');

      await reactivateAsOperator();

      expect(db.memberships.find((m) => m.id === 'm-kpa')!.status).toBe('suspended');
    });

    it('서비스 복구는 deleted 공통 계정을 복구하지 않는다', async () => {
      seed('deleted');

      await reactivateAsOperator();

      expect(user().status).toBe('deleted');
      expect(user().isActive).toBe(false);
    });

    it('정상 계정(users.status=active)에는 불필요한 변경을 하지 않는다', async () => {
      seed('active');

      await reactivateAsOperator();

      expect(user().status).toBe('active');
      // WHERE 조건 불일치 → 실제 행 갱신 0건
      expect(queries.some(q => /^UPDATE users/i.test(q.sql))).toBe(false);
    });
  });

  describe('플랫폼 관리자', () => {
    it.each(['suspended', 'deleted'])('platform service restoration preserves shared account %s', async (status) => {
      seed(status);
      await reactivateAsPlatformAdmin();
      expect(user().status).toBe(status);
      expect(user().isActive).toBe(false);
      expect(queries.some(q => /^UPDATE users/i.test(q.sql))).toBe(false);
    });

    it('스코프 없이 모든 서비스 membership 을 재활성화한다', async () => {
      seed('suspended');

      await reactivateAsPlatformAdmin();

      expect(db.memberships.find((m) => m.id === 'm-ph')!.status).toBe('active');
      expect(db.memberships.find((m) => m.id === 'm-kpa')!.status).toBe('active');
    });
  });
});
