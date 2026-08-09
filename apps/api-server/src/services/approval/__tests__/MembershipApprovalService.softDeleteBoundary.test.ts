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
 * 권한 경계:
 *   서비스 운영자 → membership + role 만 (users 무접촉)
 *   플랫폼 관리자 → 계정 전체 탈퇴 (기존 계약 보존)
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
      { id: 'm-glyco', user_id: 'u1', service_key: 'glycopharm', role: 'pharmacy', status: 'active' },
      { id: 'm-kpa', user_id: 'u1', service_key: 'kpa-society', role: 'member', status: 'active' },
      { id: 'm-neture', user_id: 'u1', service_key: 'neture', role: 'supplier', status: 'active' },
    ],
    roles: [
      { id: 'ra-1', user_id: 'u1', role: 'glycopharm:pharmacy', is_active: true },
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
    serviceKeys: ['glycopharm'],
    mode: 'soft',
  });

const softDeleteAsPlatformAdmin = () =>
  service.deleteMember({
    userId: 'u1',
    deletedBy: 'admin-1',
    isPlatformAdmin: true,
    serviceKeys: [],
    mode: 'soft',
  });

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

      expect(membership('m-glyco').status).toBe('withdrawn');
      expect(membership('m-kpa').status).toBe('active');
      expect(membership('m-neture').status).toBe('active');
    });

    it('membership UPDATE 가 serviceKeys 로 스코프된다', async () => {
      seed();

      await softDeleteAsOperator();

      const smUpdates = queries.filter((q) => /^UPDATE service_memberships/i.test(q.sql));
      expect(smUpdates).toHaveLength(1);
      expect(smUpdates[0].sql).toContain('service_key = ANY($2)');
      expect(smUpdates[0].params).toEqual(['u1', ['glycopharm']]);
    });

    it('대상 서비스 Role 만 비활성화하고 다른 서비스·플랫폼 Role 은 보존한다', async () => {
      seed();

      await softDeleteAsOperator();

      expect(role('ra-1').is_active).toBe(false); // glycopharm:*
      expect(role('ra-2').is_active).toBe(true); // kpa:*
      expect(role('ra-3').is_active).toBe(true); // neture:*
      expect(role('ra-plat').is_active).toBe(true); // platform:*
    });

    it('스코프 밖 사용자는 boundary check 에서 차단된다', async () => {
      seed();
      db.memberships = db.memberships.filter((m) => m.service_key !== 'glycopharm');

      const ok = await softDeleteAsOperator();

      expect(ok).toBe(false);
      expect(usersWrites()).toEqual([]);
      expect(membership('m-kpa').status).toBe('active');
    });
  });

  describe('플랫폼 관리자 — 계정 전체 탈퇴 계약 보존', () => {
    it('users 를 deleted 로 비활성화한다', async () => {
      seed();

      const ok = await softDeleteAsPlatformAdmin();

      expect(ok).toBe(true);
      expect(user().status).toBe('deleted');
      expect(user().isActive).toBe(false);
    });

    it('모든 서비스 Membership 을 종료한다', async () => {
      seed();

      await softDeleteAsPlatformAdmin();

      expect(membership('m-glyco').status).toBe('withdrawn');
      expect(membership('m-kpa').status).toBe('withdrawn');
      expect(membership('m-neture').status).toBe('withdrawn');
    });

    it('전 서비스 Role 을 비활성화하되 플랫폼 Role 은 보존한다', async () => {
      seed();

      await softDeleteAsPlatformAdmin();

      expect(role('ra-1').is_active).toBe(false);
      expect(role('ra-2').is_active).toBe(false);
      expect(role('ra-3').is_active).toBe(false);
      expect(role('ra-plat').is_active).toBe(true);
    });
  });
});
