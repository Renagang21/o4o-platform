/**
 * WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1
 *
 * rejectMembership / approveMembership 상태 전이 단위 테스트.
 *
 * 핵심 회귀 대상:
 * - D2: TypeORM pg driver 는 `UPDATE ... RETURNING` 에 `[rows, rowCount]` 를 반환한다.
 *       기존 구현은 이를 행 배열로 오해해 404 분기 도달 불가 + 응답 필드 undefined +
 *       KPA 동기화 미실행 상태였다. FakeQueryRunner 가 driver 반환 형태를 그대로 흉내낸다.
 * - D3: 반려 시 해당 서비스 role 만 비활성화되고 다른 서비스 role 은 불변이어야 한다.
 */

type Row = Record<string, any>;

interface FakeDb {
  memberships: Row[];
  roles: Row[];
  kpaMembers: Row[];
  users: Row[];
  cosmeticsMembers: Row[];
}

let db: FakeDb;
let committed: boolean;
let rolledBack: boolean;

/** pg driver 반환 형태 모사: SELECT → rows, UPDATE/DELETE/INSERT → [rows, rowCount] */
function driverShape(sql: string, rows: Row[]): any {
  const command = sql.trim().split(/\s+/)[0].toUpperCase();
  if (command === 'UPDATE' || command === 'DELETE') {
    return [rows, rows.length];
  }
  return rows;
}

const has = (sql: string, ...needles: string[]) => needles.every((n) => sql.includes(n));

function runQuery(sql: string, params: any[] = []): any {
  const s = sql.replace(/\s+/g, ' ').trim();

  // ---- service_memberships ----
  if (has(s, 'SELECT', 'FROM service_memberships')) {
    const [id, keys] = params;
    const statuses = /IN \('pending', 'active'\)/.test(s)
      ? ['pending', 'active']
      : ['pending', 'rejected'];
    const rows = db.memberships.filter(
      (m) =>
        m.id === id &&
        statuses.includes(m.status) &&
        (keys === undefined || (keys as string[]).includes(m.service_key))
    );
    return driverShape(s, rows.map((m) => ({ ...m })));
  }
  if (has(s, 'UPDATE service_memberships')) {
    const isReject = s.includes("status = 'rejected'");
    const id = isReject ? params[1] : params[1];
    const target = db.memberships.find((m) => m.id === id);
    if (!target) return driverShape(s, []);
    if (isReject) {
      target.status = 'rejected';
      target.rejection_reason = params[0];
    } else {
      target.status = 'active';
    }
    return driverShape(s, [{ id: target.id }]);
  }

  // ---- role_assignments ----
  if (s.startsWith('SELECT id FROM role_assignments')) {
    const [userId, role] = params;
    const wantActive = s.includes('is_active = true');
    return driverShape(
      s,
      db.roles
        .filter((r) => r.user_id === userId && r.role === role && r.is_active === wantActive)
        .map((r) => ({ id: r.id }))
    );
  }
  if (has(s, 'DELETE FROM role_assignments')) {
    const [userId, role] = params;
    const removed = db.roles.filter(
      (r) => r.user_id === userId && r.role === role && r.is_active === false
    );
    db.roles = db.roles.filter((r) => !removed.includes(r));
    return driverShape(s, removed.map((r) => ({ id: r.id })));
  }
  if (has(s, 'UPDATE role_assignments')) {
    const [userId, role] = params;
    const setClause = s.slice(s.indexOf(' SET '), s.indexOf(' WHERE '));
    const whereClause = s.slice(s.indexOf(' WHERE '));
    const setsActiveTrue = setClause.includes('is_active = true');
    const setsActiveFalse = setClause.includes('is_active = false');
    const matchActive = whereClause.includes('is_active = true');
    const matchInactive = whereClause.includes('is_active = false');
    const candidates = db.roles.filter(
      (r) =>
        r.user_id === userId &&
        r.role === role &&
        (matchActive ? r.is_active === true : matchInactive ? r.is_active === false : true)
    );
    const affected = candidates.slice(0, s.includes('LIMIT 1') ? 1 : candidates.length);
    for (const r of affected) {
      if (setsActiveTrue) r.is_active = true;
      else if (setsActiveFalse) r.is_active = false;
    }
    // unique_active_role_per_user UNIQUE (user_id, role, is_active) 시뮬레이션
    const seen = new Set<string>();
    for (const r of db.roles) {
      const key = `${r.user_id}|${r.role}|${r.is_active}`;
      if (seen.has(key)) throw new Error('duplicate key value violates unique constraint "unique_active_role_per_user"');
      seen.add(key);
    }
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

  // ---- users / kpa_members / cosmetics_members ----
  if (has(s, 'UPDATE users')) return driverShape(s, []);
  if (has(s, 'UPDATE kpa_members')) {
    const userId = params[0];
    const rows = db.kpaMembers.filter((k) => k.user_id === userId);
    const targetStatus = s.includes("status = 'rejected'") ? 'rejected' : 'active';
    for (const k of rows) {
      if (targetStatus === 'rejected' && ['pending', 'active'].includes(k.status)) k.status = 'rejected';
      if (targetStatus === 'active' && k.status === 'pending') k.status = 'active';
    }
    return driverShape(s, rows.map((k) => ({ user_id: k.user_id })));
  }
  if (has(s, 'SELECT 1 FROM kpa_members')) {
    return driverShape(s, db.kpaMembers.filter((k) => k.user_id === params[0]).map(() => ({ '?column?': 1 })));
  }
  if (has(s, 'INSERT INTO kpa_members')) {
    db.kpaMembers.push({ user_id: params[0], status: 'active' });
    return driverShape(s, []);
  }
  if (has(s, 'INSERT INTO cosmetics_members')) {
    db.cosmeticsMembers.push({ user_id: params[0], status: 'active' });
    return driverShape(s, []);
  }

  return driverShape(s, []);
}

const fakeQueryRunner = {
  connect: jest.fn(async () => {}),
  startTransaction: jest.fn(async () => {}),
  commitTransaction: jest.fn(async () => {
    committed = true;
  }),
  rollbackTransaction: jest.fn(async () => {
    rolledBack = true;
  }),
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

const ALL_KEYS = ['pharmacy-hub', 'kpa-society', 'neture', 'k-cosmetics', 'glycopharm'];

beforeEach(() => {
  committed = false;
  rolledBack = false;
  db = {
    memberships: [
      { id: 'm-ph', user_id: 'u1', service_key: 'pharmacy-hub', role: 'pharmacy-hub:store_owner', status: 'pending' },
      { id: 'm-kpa', user_id: 'u1', service_key: 'kpa-society', role: 'member', status: 'active' },
    ],
    roles: [
      { id: 'ra-kpa', user_id: 'u1', role: 'member', is_active: true },
      { id: 'ra-neture', user_id: 'u1', role: 'neture:supplier', is_active: true },
    ],
    kpaMembers: [{ user_id: 'u1', status: 'active' }],
    users: [{ id: 'u1', status: 'pending' }],
    cosmeticsMembers: [],
  };
  jest.clearAllMocks();
});

const reject = (membershipId: string, reason = '서류 미비', serviceKeys = ALL_KEYS) =>
  service.rejectMembership({ membershipId, reason, isPlatformAdmin: false, serviceKeys });

const approve = (membershipId: string, serviceKeys = ALL_KEYS) =>
  service.approveMembership({ membershipId, approvedBy: 'op-1', isPlatformAdmin: false, serviceKeys });

describe('rejectMembership — 반환값 정합성 (D2)', () => {
  it('pending → rejected: 실제 membership 행을 반환한다', async () => {
    const result = await reject('m-ph');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('m-ph');
    expect(result!.user_id).toBe('u1');
    expect(result!.service_key).toBe('pharmacy-hub');
    expect(result!.role).toBe('pharmacy-hub:store_owner');
    expect(result!.status).toBe('rejected');
    expect(result!.rejection_reason).toBe('서류 미비');
    expect(committed).toBe(true);
  });

  it('active → rejected 도 처리한다', async () => {
    const result = await reject('m-kpa');
    expect(result!.status).toBe('rejected');
    expect(db.memberships.find((m) => m.id === 'm-kpa')!.status).toBe('rejected');
  });

  it('존재하지 않는 membership 은 null 을 반환한다 (404 분기 복원)', async () => {
    const result = await reject('m-none');
    expect(result).toBeNull();
    expect(rolledBack).toBe(true);
    expect(committed).toBe(false);
  });

  it('이미 rejected 인 membership 은 null 을 반환한다', async () => {
    db.memberships[0].status = 'rejected';
    expect(await reject('m-ph')).toBeNull();
  });

  it('scope 밖 service_key 는 null 을 반환한다', async () => {
    expect(await reject('m-ph', '사유', ['kpa-society'])).toBeNull();
  });
});

describe('rejectMembership — role 격리 (D3)', () => {
  it('대상 서비스 role 만 비활성화하고 다른 서비스 role 은 불변', async () => {
    db.roles.push({ id: 'ra-ph', user_id: 'u1', role: 'pharmacy-hub:store_owner', is_active: true });

    await reject('m-ph');

    expect(db.roles.find((r) => r.role === 'pharmacy-hub:store_owner')!.is_active).toBe(false);
    expect(db.roles.find((r) => r.role === 'neture:supplier')!.is_active).toBe(true);
    expect(db.roles.find((r) => r.role === 'member')!.is_active).toBe(true);
  });

  it('role row 를 삭제하지 않는다', async () => {
    db.roles.push({ id: 'ra-ph', user_id: 'u1', role: 'pharmacy-hub:store_owner', is_active: true });
    const before = db.roles.length;
    await reject('m-ph');
    expect(db.roles.length).toBe(before);
  });

  it('membership.role 이 없으면 반려는 수행하고 role 변경만 건너뛴다', async () => {
    db.memberships[0].role = null;
    const snapshot = JSON.stringify(db.roles);

    const result = await reject('m-ph');

    expect(result!.status).toBe('rejected');
    expect(JSON.stringify(db.roles)).toBe(snapshot);
  });

  it('legacy k-cosmetics seller 는 승인 시 부여한 cosmetics:store_owner 를 회수한다', async () => {
    db.memberships.push({ id: 'm-cos', user_id: 'u1', service_key: 'k-cosmetics', role: 'seller', status: 'active' });
    db.roles.push({ id: 'ra-cos', user_id: 'u1', role: 'cosmetics:store_owner', is_active: true });

    await reject('m-cos');

    expect(db.roles.find((r) => r.role === 'cosmetics:store_owner')!.is_active).toBe(false);
  });
});

describe('rejectMembership — KPA 동기화 (D2 부수 효과)', () => {
  it('kpa-society 반려 시 kpa_members 가 rejected 로 동기화된다', async () => {
    await reject('m-kpa');
    expect(db.kpaMembers[0].status).toBe('rejected');
  });

  it('다른 서비스 반려는 kpa_members 를 건드리지 않는다', async () => {
    await reject('m-ph');
    expect(db.kpaMembers[0].status).toBe('active');
  });
});

describe('재승인 정합성 (§4.3)', () => {
  it('rejected → approved 시 기존 role row 를 재활성화하고 중복 active row 를 만들지 않는다', async () => {
    db.roles.push({ id: 'ra-ph', user_id: 'u1', role: 'pharmacy-hub:store_owner', is_active: true });

    await reject('m-ph');
    const approved = await approve('m-ph');

    expect(approved!.status).toBe('active');
    const phRoles = db.roles.filter((r) => r.role === 'pharmacy-hub:store_owner');
    expect(phRoles).toHaveLength(1);
    expect(phRoles[0].is_active).toBe(true);
    expect(phRoles[0].id).toBe('ra-ph');
  });

  it('기존 role row 가 없으면 생성한다', async () => {
    await approve('m-ph');
    const phRoles = db.roles.filter((r) => r.role === 'pharmacy-hub:store_owner');
    expect(phRoles).toHaveLength(1);
    expect(phRoles[0].is_active).toBe(true);
  });

  it('반려 → 승인 → 반려 를 반복해도 unique constraint 를 위반하지 않는다', async () => {
    db.roles.push({ id: 'ra-ph', user_id: 'u1', role: 'pharmacy-hub:store_owner', is_active: true });

    await reject('m-ph');
    await approve('m-ph');
    await reject('m-ph');

    const phRoles = db.roles.filter((r) => r.role === 'pharmacy-hub:store_owner');
    expect(phRoles).toHaveLength(1);
    expect(phRoles[0].is_active).toBe(false);
  });
});
