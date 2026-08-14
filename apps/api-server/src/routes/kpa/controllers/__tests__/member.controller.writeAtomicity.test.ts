/**
 * WO-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1
 *
 * KPA 운영자 회원 정보 수정(PATCH /kpa/members/:id/info)과
 * 회원 승인(PATCH /kpa/members/:id/status)의 **쓰기 원자성**을 고정한다.
 *
 * 회귀 대상:
 *   D-1  users.name write 가 존재하지 않는 `updated_at` 컬럼을 참조 →
 *        이름 수정이 항상 실패했고 그 시점에 kpa_members 는 이미 commit 되어 있었다.
 *   D-2  승인 경로가 kpa_members commit 이후 users / profile / service_memberships
 *        동기화 실패를 console.error 로 삼키고 200 을 반환 →
 *        kpa_members=active / service_memberships=pending 부분 성공.
 *   D-5  /info 의 6개 독립 write 가 transaction 없이 순차 실행.
 *
 * 판정 계약:
 *   - 관련 write 는 전부 동일 transaction manager 로 나간다.
 *   - 중간 실패 시 transaction 은 commit 되지 않고 오류 응답(500)을 반환한다.
 *   - users 갱신 시각 컬럼은 quoted "updatedAt" 만 사용한다.
 *   - service_memberships write 는 KPA scope 로 한정된다.
 */

const mockApprovalService = {
  approveMembership: jest.fn(),
  suspendMembership: jest.fn().mockResolvedValue(null),
  withdrawMembership: jest.fn().mockResolvedValue(null),
  reactivateMembership: jest.fn().mockResolvedValue(null),
};

jest.mock('../../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => mockApprovalService),
}));

jest.mock('../../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: jest.fn(), removeRole: jest.fn(), getRoleNames: jest.fn() },
}));

jest.mock('../../../../services/email.service.js', () => ({
  emailService: { isServiceAvailable: () => false },
}));

jest.mock('../../../../services/NotificationService.js', () => ({
  notificationService: { createNotification: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../../modules/organization/services/organization-ops.service.js', () => ({
  organizationOpsService: {
    ensureOrganization: jest.fn().mockResolvedValue({ id: 'org-1' }),
    addMember: jest.fn().mockResolvedValue(undefined),
    // WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1:
    //   canonical provisioning helper 가 service enrollment 까지 수행한다.
    enrollService: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: jest.fn().mockImplementation(() => ({
    findByStoreId: jest.fn().mockResolvedValue({ slug: 'x' }),
    generateUniqueSlug: jest.fn(),
    reserveSlug: jest.fn(),
  })),
}), { virtual: true });

import { createMemberController } from '../member.controller.js';

const MEMBER_ID = '11111111-2222-4333-8444-555555555555';
const USER_ID = '22222222-3333-4444-8555-666666666666';
const OPERATOR_ID = '99999999-8888-4777-8666-555555555555';

type Call = { sql: string; params: any[]; scope: 'tx' | 'global' };

const WRITE_RE = /^\s*(UPDATE|INSERT|DELETE)\b/i;

function normalize(sql: string): string {
  return String(sql).replace(/\s+/g, ' ').trim();
}

/** 테스트용 DataSource 더블 — transaction 경계와 SQL 흐름을 기록한다. */
function makeDataSource(options: { member?: any; failOn?: RegExp; failOnSaveEntity?: string } = {}) {
  const calls: Call[] = [];
  const saves: Array<{ entity: string; scope: 'tx' | 'global'; value: any }> = [];
  const state: any = {
    txStarted: 0,
    txCommitted: 0,
    txRolledBack: 0,
    // WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
    txManager: null as any,
    txOpen: false,
    delegateCalledInsideTx: {} as Record<string, boolean>,
  };

  const member = options.member ?? {
    id: MEMBER_ID,
    user_id: USER_ID,
    status: 'pending',
    identity_status: 'active',
    membership_type: 'pharmacist',
    activity_type: 'pharmacy_employee',
    license_number: 'L-1',
    pharmacy_name: null,
    pharmacy_address: null,
    university_name: null,
    student_year: null,
  };

  const runQuery = async (scope: 'tx' | 'global', sql: string, params: any[] = []) => {
    const n = normalize(sql);
    calls.push({ sql: n, params, scope });
    if (options.failOn && options.failOn.test(n)) {
      throw new Error('INJECTED_FAILURE');
    }
    if (/SELECT "businessInfo" FROM users/i.test(n)) {
      return [{ businessInfo: { businessNumber: '123-45-67890', legacyKeep: 'keep-me' } }];
    }
    if (/SELECT email, name FROM users/i.test(n)) return [{ email: null, name: null }];
    return [];
  };

  const entityName = (e: any) => (typeof e === 'string' ? e : e?.name ?? String(e));

  const makeManager = (scope: 'tx' | 'global') => ({
    query: (sql: string, params?: any[]) => runQuery(scope, sql, params ?? []),
    findOne: async (entity: any, _opts: any) => (entityName(entity) === 'KpaMember' ? member : null),
    save: async (entity: any, value: any) => {
      const name = entityName(entity);
      saves.push({ entity: name, scope, value });
      if (options.failOnSaveEntity && name === options.failOnSaveEntity) {
        throw new Error('INJECTED_FAILURE');
      }
      return value;
    },
    create: (_entity: any, value: any) => value,
  });

  const repo = (name: string) => ({
    findOne: async () => (name === 'KpaMember' ? member : null),
    save: async (value: any) => {
      saves.push({ entity: name, scope: 'global', value });
      return value;
    },
    create: (value: any) => value,
  });

  const dataSource: any = {
    getRepository: (e: any) => repo(entityName(e)),
    query: (sql: string, params?: any[]) => runQuery('global', sql, params ?? []),
    transaction: async (cb: any) => {
      state.txStarted += 1;
      state.txOpen = true;
      const manager = makeManager('tx');
      state.txManager = manager;
      try {
        const result = await cb(manager);
        state.txCommitted += 1;
        return result;
      } catch (e) {
        state.txRolledBack += 1;
        throw e;
      } finally {
        state.txOpen = false;
      }
    },
  };

  return { dataSource, calls, saves, state, member };
}

function getHandler(dataSource: any, path: string, method: 'patch') {
  const router: any = createMemberController(
    dataSource,
    ((_req: any, _res: any, next: any) => next()) as any,
    (() => (_req: any, _res: any, next: any) => next()) as any,
  );
  const layer = router.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  );
  if (!layer) throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
}

function makeRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = (body: Record<string, any>) => ({
  params: { id: MEMBER_ID },
  body,
  user: { id: OPERATOR_ID, roles: ['kpa:operator'] },
}) as any;

beforeEach(() => jest.clearAllMocks());

describe('PATCH /kpa/members/:id/info — write atomicity', () => {
  it('정상 수정: 관련 write 가 모두 동일 transaction 안에서 함께 반영된다', async () => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/info', 'patch');
    const res = makeRes();

    await handler(req({
      name: '홍길동',
      nickname: '길동',
      business_number: '999-88-77777',
      activity_type: 'pharmacy_employee',
    }), res);

    expect(res.json).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(h.state.txCommitted).toBe(1);
    expect(h.state.txRolledBack).toBe(0);

    // 관련 write 가 transaction 밖으로 새지 않는다
    const outsideWrites = h.calls.filter((c) => c.scope === 'global' && WRITE_RE.test(c.sql));
    expect(outsideWrites).toEqual([]);

    // kpa_members / users(name) / users(nickname) / users(businessInfo) / 자격 profile 이 모두 tx 안
    const txWrites = h.calls.filter((c) => c.scope === 'tx' && WRITE_RE.test(c.sql));
    expect(txWrites.some((c) => /UPDATE users SET name = \$1/i.test(c.sql))).toBe(true);
    expect(txWrites.some((c) => /UPDATE users SET nickname = \$1/i.test(c.sql))).toBe(true);
    expect(txWrites.some((c) => /UPDATE users SET "businessInfo"/i.test(c.sql))).toBe(true);
    expect(txWrites.some((c) => /INSERT INTO kpa_pharmacist_profiles/i.test(c.sql))).toBe(true);
    expect(h.saves.filter((s) => s.entity === 'KpaMember' && s.scope === 'tx')).toHaveLength(1);
    expect(h.saves.filter((s) => s.entity === 'KpaMember' && s.scope === 'global')).toHaveLength(0);
  });

  it('D-1 회귀: users 갱신 시각은 존재하지 않는 updated_at 이 아니라 "updatedAt" 을 참조한다', async () => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/info', 'patch');
    await handler(req({ name: '홍길동' }), makeRes());

    const usersWrites = h.calls.filter((c) => /^UPDATE users\b/i.test(c.sql));
    expect(usersWrites.length).toBeGreaterThan(0);
    for (const c of usersWrites) {
      expect(c.sql).toContain('"updatedAt"');
      expect(/[^"]\bupdated_at\b/.test(c.sql)).toBe(false);
    }
  });

  it('중간 write 실패 주입: transaction 이 commit 되지 않고 500 을 반환한다', async () => {
    const h = makeDataSource({ failOn: /UPDATE users SET nickname/i });
    const handler = getHandler(h.dataSource, '/:id/info', 'patch');
    const res = makeRes();

    await handler(req({ name: '홍길동', nickname: '길동', business_number: '999-88-77777' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(h.state.txCommitted).toBe(0);
    expect(h.state.txRolledBack).toBe(1);
    // rollback 대상이 아닌(=transaction 밖) write 가 하나도 없어야 부분 성공이 남지 않는다
    expect(h.calls.filter((c) => c.scope === 'global' && WRITE_RE.test(c.sql))).toEqual([]);
    expect(h.saves.filter((s) => s.scope === 'global' && s.entity === 'KpaMember')).toEqual([]);
  });

  it('legacy businessInfo 키는 보존하고 canonical 키만 갱신한다 (기존 계약 회귀)', async () => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/info', 'patch');
    await handler(req({ business_number: '999-88-77777' }), makeRes());

    const bizWrite = h.calls.find((c) => /UPDATE users\s+SET "businessInfo"/i.test(c.sql));
    expect(bizWrite).toBeDefined();
    const payload = JSON.parse(bizWrite!.params[0]);
    expect(payload.businessNumber).toBe('999-88-77777');

    // WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1:
    //   보존 방식이 바뀌었다. 이전에는 애플리케이션이 legacy 키까지 payload 에 담아
    //   통째로 되썼다(그래서 그 사이 다른 경로가 저장한 값이 사라졌다).
    //   이제는 **patch 에 담지 않는 것** 이 곧 보존이며, 병합은 DB 가 수행한다.
    expect(payload).not.toHaveProperty('legacyKeep');
    expect(bizWrite!.sql).toContain('"businessInfo"::jsonb');
  });
});

describe('PATCH /kpa/members/:id/status — approval atomicity', () => {
  it('정상 승인: kpa_members / users / 자격 profile / service_memberships 가 한 transaction 에서 함께 변경된다', async () => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status: 'active' }), res);

    expect(h.state.txCommitted).toBe(1);
    const txWrites = h.calls.filter((c) => c.scope === 'tx' && WRITE_RE.test(c.sql));
    expect(txWrites.some((c) => /UPDATE users SET status = 'active'/i.test(c.sql))).toBe(true);
    expect(txWrites.some((c) => /INSERT INTO kpa_pharmacist_profiles/i.test(c.sql))).toBe(true);
    expect(txWrites.some((c) => /UPDATE service_memberships/i.test(c.sql))).toBe(true);
    expect(h.saves.filter((s) => s.entity === 'KpaMember' && s.scope === 'tx')).toHaveLength(1);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it('D-2 회귀: 승인 동기화 실패 시 200 이 아니라 500 을 반환하고 전체 rollback 된다', async () => {
    const h = makeDataSource({ failOn: /UPDATE service_memberships/i });
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status: 'active' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'INTERNAL_ERROR' }) }),
    );
    expect(h.state.txCommitted).toBe(0);
    expect(h.state.txRolledBack).toBe(1);
    expect(h.saves.filter((s) => s.entity === 'KpaMember' && s.scope === 'global')).toEqual([]);
    expect(h.calls.filter((c) => c.scope === 'global' && WRITE_RE.test(c.sql))).toEqual([]);
  });

  it('service_memberships write 는 KPA scope 로만 한정된다 (다른 서비스 membership 무영향)', async () => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    await handler(req({ status: 'active' }), makeRes());

    const smWrites = h.calls.filter((c) => /UPDATE service_memberships/i.test(c.sql));
    expect(smWrites.length).toBe(1);
    for (const c of smWrites) {
      expect(c.sql).toMatch(/service_key = 'kpa-society'/);
      expect(c.params).toContain(USER_ID);
    }
  });

  it.each([
    ['rejected', 'suspendMembership'],
    ['suspended', 'suspendMembership'],
    ['withdrawn', 'withdrawMembership'],
  ])('반려·정지·탈퇴 회귀: %s 는 기존 canonical service 위임을 유지한다', async (status, method) => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status }), res);

    expect((mockApprovalService as any)[method]).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, serviceKeys: ['kpa-society'], isPlatformAdmin: false }),
    );
    expect(h.state.txCommitted).toBe(1);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it('재승인 회귀: suspended → active 는 reactivateMembership 위임 후 kpa_members 를 저장한다', async () => {
    const h = makeDataSource({
      member: {
        id: MEMBER_ID, user_id: USER_ID, status: 'suspended', identity_status: 'suspended',
        membership_type: 'pharmacist', activity_type: 'pharmacy_employee',
        license_number: 'L-1', pharmacy_name: null, pharmacy_address: null,
        university_name: null, student_year: null,
      },
    });
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status: 'active' }), res);

    expect(mockApprovalService.reactivateMembership).toHaveBeenCalledTimes(1);
    // 승인 전용 동기화(users/profile/service_memberships inline UPDATE)는 실행되지 않는다
    expect(h.calls.some((c) => /UPDATE service_memberships/i.test(c.sql))).toBe(false);
    expect(h.state.txCommitted).toBe(1);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it('위임 실패는 더 이상 삼켜지지 않는다: kpa_members 저장 없이 500 을 반환한다', async () => {
    mockApprovalService.suspendMembership.mockRejectedValueOnce(new Error('INJECTED_FAILURE'));
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status: 'suspended' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    // WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1:
    //   위임이 같은 transaction 안에서 실행되므로 실패 시 transaction 전체가 rollback 된다.
    expect(h.state.txStarted).toBe(1);
    expect(h.state.txCommitted).toBe(0);
    expect(h.state.txRolledBack).toBe(1);
    expect(h.saves.filter((s) => s.entity === 'KpaMember')).toEqual([]);
  });

  // ============================================================
  // WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
  // ============================================================

  it.each([
    ['suspended', 'suspendMembership'],
    ['rejected', 'suspendMembership'],
    ['withdrawn', 'withdrawMembership'],
  ])('%s: 위임이 호출자 transaction manager 를 주입받아 같은 transaction 에서 실행된다', async (status, method) => {
    const h = makeDataSource();
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status }), res);

    const arg = (mockApprovalService as any)[method].mock.calls[0][0];
    expect(arg.manager).toBe(h.state.txManager);
    // manager 는 transaction 이 열린 뒤에만 생성되므로, 동일 참조 = transaction 내부 실행
    expect(h.state.txCommitted).toBe(1);
    expect(h.calls.filter((c) => c.scope === 'global' && WRITE_RE.test(c.sql))).toEqual([]);
  });

  it('재승인: reactivateMembership 도 동일 transaction manager 를 주입받는다', async () => {
    const h = makeDataSource({
      member: {
        id: MEMBER_ID, user_id: USER_ID, status: 'suspended', identity_status: 'suspended',
        membership_type: 'pharmacist', activity_type: 'pharmacy_employee',
        license_number: 'L-1', pharmacy_name: null, pharmacy_address: null,
        university_name: null, student_year: null,
      },
    });
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status: 'active' }), res);

    const arg = mockApprovalService.reactivateMembership.mock.calls[0][0];
    expect(arg.manager).toBe(h.state.txManager);
    expect(h.state.txCommitted).toBe(1);
  });

  it('위임 성공 후 kpa_members 저장이 실패하면 위임분까지 전체 rollback 된다', async () => {
    const h = makeDataSource({ failOnSaveEntity: 'KpaMember' });
    const handler = getHandler(h.dataSource, '/:id/status', 'patch');
    const res = makeRes();

    await handler(req({ status: 'suspended' }), res);

    expect(mockApprovalService.suspendMembership).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(h.state.txCommitted).toBe(0);
    expect(h.state.txRolledBack).toBe(1);
  });
});
