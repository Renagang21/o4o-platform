/**
 * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §10·§11·§12
 *
 * 5개 서비스의 `active → suspended → active` 를 **하나의 계약**으로 고정한다.
 *
 * canonical contract (§7):
 *   - membership = "그 서비스에 들어갈 수 있느냐" — 접근 차단의 정본.
 *   - role       = "그 서비스 안에서 무엇을 할 수 있느냐" — row 는 보존하고 is_active 만 오르내린다.
 *   - 복구는 **restore-only** — 정지 이전에 없던 역할을 새로 만들지 않는다.
 *
 * 여기서 고정하는 것 (서비스별 예외 없음):
 *   1. 정지는 대상 서비스 membership 만 suspended 로 바꾼다 (cross-service fan-out 0).
 *   2. 정지는 그 서비스의 역할만 내린다. 다른 서비스 · 전역 · platform 역할은 불변.
 *   3. `{prefix}:store_owner` 회수는 5개 서비스 대칭이다 (기존 kpa 전용 분기 제거).
 *   4. 복구는 내려간 역할을 되살리기만 한다. 신규 bare role 0 · 신규 platform role 0.
 *   5. users.status 는 정지에서 절대 바뀌지 않는다.
 */

type Row = Record<string, any>;

interface FakeDb {
  memberships: Row[];
  roles: Row[];
  users: Row[];
  pharmacistProfiles: Row[];
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

  // ---- role_assignments ----
  if (s.startsWith('SELECT id FROM role_assignments')) {
    const [userId, role] = params;
    const wantActive = s.includes('is_active = true');
    return driverShape(
      s,
      db.roles
        .filter((r) => r.user_id === userId && r.role === role && r.is_active === wantActive)
        .map((r) => ({ id: r.id })),
    );
  }
  if (has(s, 'UPDATE role_assignments')) {
    const [userId, role] = params;
    const target = s.includes('SET is_active = false') ? true : false; // 대상 row 의 현재 is_active
    const setTo = !s.includes('SET is_active = false');
    const touchOnly = !s.includes('SET is_active'); // updated_at 만 갱신하는 활성 확인 쿼리
    const affected = db.roles.filter(
      (r) => r.user_id === userId && r.role === role && r.is_active === (touchOnly ? true : target),
    );
    if (!touchOnly) for (const r of affected) r.is_active = setTo;
    return driverShape(s, affected.map((r) => ({ id: r.id })));
  }
  if (has(s, 'INSERT INTO role_assignments')) {
    const [userId, role] = params;
    const row = { id: `ra-${db.roles.length + 1}`, user_id: userId, role, is_active: true };
    db.roles.push(row);
    return driverShape(s, [{ id: row.id }]);
  }

  // ---- service_memberships ----
  if (has(s, 'SELECT', 'FROM service_memberships')) {
    const [userId, keys] = params;
    const wanted = s.includes("status = 'active'") ? ['active'] : ['suspended', 'withdrawn'];
    const rows = db.memberships.filter(
      (m) =>
        m.user_id === userId &&
        wanted.includes(m.status) &&
        (keys === undefined || (keys as string[]).includes(m.service_key)),
    );
    return driverShape(s, rows.map((m) => ({ ...m })));
  }
  if (has(s, 'UPDATE service_memberships')) {
    const ids: string[] = Array.isArray(params[0]) ? params[0] : Array.isArray(params[1]) ? params[1] : [];
    const nextStatus = s.includes("status = 'suspended'") ? 'suspended' : 'active';
    const affected = db.memberships.filter((m) => ids.includes(m.id));
    for (const m of affected) m.status = nextStatus;
    return driverShape(s, affected.map((m) => ({ id: m.id })));
  }

  // ---- users ----
  if (has(s, 'UPDATE users')) {
    const [userId, statuses] = params;
    const affected = db.users.filter(
      (u) => u.id === userId && (!Array.isArray(statuses) || statuses.includes(u.status)),
    );
    for (const u of affected) u.status = 'active';
    return driverShape(s, affected.map((u) => ({ id: u.id })));
  }

  // ---- kpa_pharmacist_profiles ----
  if (has(s, 'FROM kpa_pharmacist_profiles')) {
    return driverShape(s, db.pharmacistProfiles.filter((p) => p.user_id === params[0]));
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

const SERVICES: Array<{ serviceKey: string; prefix: string }> = [
  { serviceKey: 'kpa-society', prefix: 'kpa' },
  { serviceKey: 'k-cosmetics', prefix: 'cosmetics' },
  { serviceKey: 'glycopharm', prefix: 'glycopharm' },
  { serviceKey: 'neture', prefix: 'neture' },
  { serviceKey: 'pharmacy-hub', prefix: 'pharmacy-hub' },
];

const activeRoles = () => db.roles.filter((r) => r.is_active).map((r) => r.role).sort();
const statusOf = (serviceKey: string) =>
  db.memberships.find((m) => m.service_key === serviceKey)!.status;

const suspend = (serviceKeys: string[]) =>
  service.suspendMembership({
    userId: 'u1',
    suspendedBy: 'op-1',
    isPlatformAdmin: false,
    serviceKeys,
  } as any);

const reactivate = (serviceKeys: string[]) =>
  service.reactivateMembership({
    userId: 'u1',
    reactivatedBy: 'op-1',
    isPlatformAdmin: false,
    serviceKeys,
  } as any);

/** 5개 서비스 전부에 active membership 을 가진 계정 (§10 fan-out fixture) */
function seedAllFive(opts: { membershipRole?: string; extraRoles?: string[]; pharmacyOwner?: boolean } = {}) {
  const membershipRole = opts.membershipRole ?? 'member';
  db = {
    memberships: SERVICES.map((s, i) => ({
      id: `m-${i}`,
      user_id: 'u1',
      service_key: s.serviceKey,
      role: membershipRole,
      status: 'active',
    })),
    roles: [
      ...SERVICES.map((s, i) => ({
        id: `ra-s${i}`,
        user_id: 'u1',
        role: `${s.prefix}:${membershipRole}`,
        is_active: true,
      })),
      ...(opts.extraRoles ?? []).map((role, i) => ({
        id: `ra-x${i}`,
        user_id: 'u1',
        role,
        is_active: true,
      })),
    ],
    users: [{ id: 'u1', status: 'active', isActive: true }],
    pharmacistProfiles: opts.pharmacyOwner ? [{ user_id: 'u1', activity_type: 'pharmacy_owner' }] : [],
  };
  queries.length = 0;
  jest.clearAllMocks();
}

describe('§10 cross-service fan-out — 한 서비스 정지가 다른 서비스로 번지지 않는다', () => {
  it.each(SERVICES)('$serviceKey 만 정지된다', async ({ serviceKey, prefix }) => {
    seedAllFive();
    await suspend([serviceKey]);

    expect(statusOf(serviceKey)).toBe('suspended');
    for (const other of SERVICES.filter((s) => s.serviceKey !== serviceKey)) {
      expect(statusOf(other.serviceKey)).toBe('active');
      expect(activeRoles()).toContain(`${other.prefix}:member`);
    }
    expect(activeRoles()).not.toContain(`${prefix}:member`);
  });

  it('정지는 users.status 를 바꾸지 않는다', async () => {
    seedAllFive();
    await suspend(['kpa-society']);
    expect(db.users[0].status).toBe('active');
    expect(queries.some((q) => q.sql.includes('UPDATE users'))).toBe(false);
  });

  it('전역 역할과 platform 역할은 정지 대상이 아니다', async () => {
    seedAllFive({ extraRoles: ['supplier', 'customer', 'platform:super_admin'] });
    await suspend(['neture']);
    expect(activeRoles()).toEqual(
      expect.arrayContaining(['supplier', 'customer', 'platform:super_admin']),
    );
  });
});

describe('§12 active → suspended → active 왕복', () => {
  it.each(SERVICES)('$serviceKey — 역할 구성이 정지 이전과 같아진다', async ({ serviceKey }) => {
    seedAllFive();
    const before = activeRoles();
    const rowsBefore = db.roles.length;

    await suspend([serviceKey]);
    await reactivate([serviceKey]);

    expect(statusOf(serviceKey)).toBe('active');
    expect(activeRoles()).toEqual(before);
    // row 는 보존된다 — 새로 만들지도, 지우지도 않는다
    expect(db.roles).toHaveLength(rowsBefore);
  });

  it.each(SERVICES)(
    '$serviceKey — store_owner 회수·복구가 5개 서비스 대칭이다',
    async ({ serviceKey, prefix }) => {
      seedAllFive({ membershipRole: 'store_owner', pharmacyOwner: true });
      const storeOwnerRole = `${prefix}:store_owner`;

      await suspend([serviceKey]);
      expect(activeRoles()).not.toContain(storeOwnerRole);

      await reactivate([serviceKey]);
      expect(activeRoles()).toContain(storeOwnerRole);
    },
  );

  it('membership.role 과 별개로 붙어 있는 store_owner 도 대칭 처리된다 (기존 kpa 전용 분기 제거)', async () => {
    // membership.role='member' 인데 capability role 로 store_owner 를 별도 보유한 계정
    seedAllFive({ extraRoles: ['cosmetics:store_owner', 'glycopharm:store_owner'] });

    await suspend(['k-cosmetics']);
    expect(activeRoles()).not.toContain('cosmetics:store_owner');
    // 정지하지 않은 서비스의 store_owner 는 그대로다
    expect(activeRoles()).toContain('glycopharm:store_owner');

    await reactivate(['k-cosmetics']);
    expect(activeRoles()).toContain('cosmetics:store_owner');
  });
});

describe('§11 admin tier — 복구가 권한을 만들어내지 않는다', () => {
  it.each(SERVICES)(
    '$serviceKey — bare admin tier membership.role 은 복구해도 부여되지 않는다',
    async ({ serviceKey }) => {
      seedAllFive({ membershipRole: 'super_admin' });
      // seedAllFive 가 만든 `{prefix}:super_admin` 은 이 시나리오에서 의미가 없다 — 비운다
      db.roles = [];

      await suspend([serviceKey]);
      await reactivate([serviceKey]);

      expect(db.roles).toHaveLength(0);
      expect(queries.some((q) => q.sql.includes('INSERT INTO role_assignments'))).toBe(false);
      expect(statusOf(serviceKey)).toBe('active');
    },
  );

  it('복구는 어떤 경우에도 role_assignments 를 INSERT 하지 않는다 (restore-only)', async () => {
    seedAllFive();
    db.roles = []; // 정지 이전에 역할 row 가 하나도 없던 계정

    await suspend(['pharmacy-hub']);
    await reactivate(['pharmacy-hub']);

    expect(db.roles).toHaveLength(0);
    expect(queries.some((q) => q.sql.includes('INSERT INTO role_assignments'))).toBe(false);
  });
});
