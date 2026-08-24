/**
 * WO-O4O-CROSSSERVICE-LEGACY-BARE-ROLE-CENSUS-AND-CLEANUP-V1 §9
 *
 * 멤버십 lifecycle 이 **접두어 없는 서비스 역할을 새로 만들지 않는다**는 계약을
 * 5개 서비스 전부에 대해 고정한다.
 *
 * 두 가지를 함께 본다.
 *
 *   (1) legacy bare membership role(`member` · `store_owner`) 은 승인·재활성화 시
 *       자기 서비스 prefix 가 붙어 부여된다(D4 정규화 — role prefix 는 canonical
 *       service_key 와 다르므로 `@o4o/security-core` SSOT 도출값을 그대로 기대한다).
 *   (2) bare admin tier(`admin` · `operator` · `super_admin`) 는 **부여하지 않는다**.
 *       특히 `super_admin` 은 로그인 경로가 `platform:super_admin` 과 동등하게 취급하므로
 *       (auth-login.service.ts PLATFORM_ADMIN_ROLES) 재활성화만으로 플랫폼 관리자가 되는
 *       경로를 막는다. 추측 prefix 변환도 하지 않는다(권한 확대 금지).
 *
 * 의도적으로 접두어가 없는 전역 역할(`supplier`/`partner` — WO-NETURE-ROLE-NORMALIZATION-V1,
 * `user`/`customer` — RBAC Role Catalog V1 Platform Core)은 그대로 부여되는지도 함께 고정한다.
 * 이 테스트가 실패하면 정규화 대상이 조용히 넓어졌거나 좁아진 것이다.
 */

type Row = Record<string, any>;

interface FakeDb {
  memberships: Row[];
  roles: Row[];
  users: Row[];
}

let db: FakeDb;
const queries: { sql: string; params: any[] }[] = [];

/** pg driver 반환 형태 모사: SELECT → rows, UPDATE/DELETE → [rows, rowCount] */
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
    const wantActive = s.includes('is_active = true') && !s.includes('SET is_active = true');
    const affected = db.roles.filter(
      (r) => r.user_id === userId && r.role === role && (wantActive ? r.is_active === true : r.is_active === false),
    );
    for (const r of affected) r.is_active = !s.includes('SET is_active = false');
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
    if (has(s, 'sm.id = $1') || has(s, 'WHERE id = $1')) {
      const row = db.memberships.find((m) => m.id === params[0]);
      return driverShape(s, row ? [{ ...row }] : []);
    }
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
    const ids: string[] = Array.isArray(params[1]) ? params[1] : [params[1]].filter(Boolean);
    const affected = db.memberships.filter((m) => ids.includes(m.id));
    for (const m of affected) m.status = 'active';
    return driverShape(s, affected.map((m) => ({ id: m.id })));
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

/** 5개 서비스 canonical service_key → 기대 role prefix (security-core SSOT 와 같아야 한다) */
const SERVICES: Array<{ serviceKey: string; prefix: string }> = [
  { serviceKey: 'kpa-society', prefix: 'kpa' },
  { serviceKey: 'k-cosmetics', prefix: 'cosmetics' },
  { serviceKey: 'glycopharm', prefix: 'glycopharm' },
  { serviceKey: 'neture', prefix: 'neture' },
  { serviceKey: 'pharmacy-hub', prefix: 'pharmacy-hub' },
];

/**
 * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §9:
 *   재활성화는 **restore-only** 다 — 정지 이전에 없던 역할을 새로 만들지 않는다.
 *   따라서 'suspended' fixture 는 정지가 실제로 남기는 모양(= 해당 역할의 비활성 row)을
 *   그대로 재현해야 한다. row 를 비워두면 "복구되지 않는다" 가 아니라 "애초에 없던 역할"을
 *   시험하게 된다. 정지가 그 역할을 만들 수 없는 경우(bare admin tier)는 seedRoles=false.
 */
function seed(
  serviceKey: string,
  membershipRole: string,
  status: 'pending' | 'suspended',
  suspendedRole?: string | null,
) {
  const roles =
    status === 'suspended' && suspendedRole
      ? [{ id: 'ra-0', user_id: 'u1', role: suspendedRole, is_active: false }]
      : [];
  db = {
    memberships: [{ id: 'm-1', user_id: 'u1', service_key: serviceKey, role: membershipRole, status }],
    roles,
    users: [{ id: 'u1', status: status === 'suspended' ? 'suspended' : 'pending', isActive: false }],
  };
  queries.length = 0;
  jest.clearAllMocks();
}

const grantedRoles = () => db.roles.filter((r) => r.is_active).map((r) => r.role);

const approve = () =>
  service.approveMembership({
    membershipId: 'm-1',
    approvedBy: 'admin-1',
    isPlatformAdmin: true,
    serviceKeys: [],
  });

const reactivate = () =>
  service.reactivateMembership({
    userId: 'u1',
    reactivatedBy: 'admin-1',
    isPlatformAdmin: true,
    serviceKeys: [],
  });

describe('멤버십 lifecycle — 접두어 없는 서비스 역할을 만들지 않는다 (5개 서비스)', () => {
  describe.each(SERVICES)('$serviceKey', ({ serviceKey, prefix }) => {
    it.each(['member', 'store_owner'])(
      "legacy bare membership role '%s' 승인 → 자기 서비스 prefix 가 붙는다",
      async (role) => {
        seed(serviceKey, role, 'pending');
        await approve();
        expect(grantedRoles()).toEqual([`${prefix}:${role}`]);
      },
    );

    it.each(['member', 'store_owner'])(
      "정지→복구 시에도 bare '%s' 를 되살리지 않는다",
      async (role) => {
        seed(serviceKey, role, 'suspended', `${prefix}:${role}`);
        await reactivate();
        expect(grantedRoles()).toEqual([`${prefix}:${role}`]);
      },
    );

    it.each(['member', 'store_owner'])(
      "복구는 restore-only — 정지 이전에 없던 '%s' 역할을 새로 만들지 않는다",
      async (role) => {
        seed(serviceKey, role, 'suspended', null);
        await reactivate();
        expect(db.roles).toHaveLength(0);
        expect(queries.some((q) => q.sql.includes('INSERT INTO role_assignments'))).toBe(false);
        // 멤버십 복구 자체는 진행된다 (역할 부여만 건너뛴다)
        expect(db.memberships[0].status).toBe('active');
      },
    );

    it.each(['admin', 'operator', 'super_admin'])(
      "bare admin tier '%s' 는 승인해도 부여하지 않는다",
      async (role) => {
        seed(serviceKey, role, 'pending');
        await approve();
        expect(db.roles).toHaveLength(0);
      },
    );

    it.each(['admin', 'operator', 'super_admin'])(
      "bare admin tier '%s' 는 복구해도 부여하지 않는다",
      async (role) => {
        seed(serviceKey, role, 'suspended', null);
        await reactivate();
        expect(db.roles).toHaveLength(0);
      },
    );

    it('membership 이 활성화되는 것 자체는 막지 않는다 (역할 부여만 건너뛴다)', async () => {
      seed(serviceKey, 'operator', 'pending');
      await approve();
      expect(db.memberships[0].status).toBe('active');
    });
  });

  describe('의도적으로 접두어가 없는 전역 역할은 그대로 부여한다', () => {
    it.each([
      ['neture', 'supplier'],
      ['neture', 'partner'],
      ['kpa-society', 'user'],
      ['k-cosmetics', 'customer'],
    ])('%s / %s', async (serviceKey, role) => {
      seed(serviceKey, role, 'pending');
      await approve();
      expect(grantedRoles()).toEqual([role]);
    });
  });

  describe('prefixed 역할은 그대로 둔다', () => {
    it.each(['kpa:admin', 'cosmetics:operator', 'platform:super_admin'])('%s', async (role) => {
      seed('kpa-society', role, 'suspended', role);
      await reactivate();
      expect(grantedRoles()).toEqual([role]);
    });
  });
});

describe('role_assignments write 는 정본 유일성 규칙을 대상으로 한다', () => {
  it('INSERT 는 부분 유니크 인덱스(user_id, role) WHERE is_active 를 추론 대상으로 쓴다', async () => {
    seed('kpa-society', 'member', 'pending');
    await approve();
    const insert = queries.find((q) => q.sql.includes('INSERT INTO role_assignments'));
    expect(insert).toBeDefined();
    expect(insert!.sql).toContain('ON CONFLICT (user_id, role) WHERE is_active');
    // 폐기된 3 컬럼 제약(migration 20270301000000 에서 제거) 을 다시 쓰면 42P10 이다
    expect(insert!.sql).not.toContain('(user_id, role, is_active)');
    expect(insert!.sql).not.toContain('unique_active_role_per_user');
  });
});
