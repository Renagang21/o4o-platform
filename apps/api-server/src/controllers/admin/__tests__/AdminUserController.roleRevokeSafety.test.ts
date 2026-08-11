/**
 * WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1
 *
 * 중앙 관리자 `/operators` 의 역할 해제(`DELETE /api/v1/admin/users/:userId/role-assignments/:role`)
 * 안전 계약을 고정한다.
 *
 *   1) 마지막 활성 서비스 admin 은 해제할 수 없다 (LAST_ADMIN_PROTECTED)
 *   2) 요청자는 자기 자신의 역할을 해제할 수 없다 (SELF_ROLE_REVOKE_FORBIDDEN)
 *   3) 기존 platform:super_admin 보호(SUPER_ADMIN_ROLE_PROTECTED)는 그대로 유지된다
 *   4) 해제는 계속 assignment row 의 is_active=false (soft revoke) 이며
 *      users.isActive · membership · credential 은 건드리지 않는다
 *
 * 이식 원본: Neture 전용 `PATCH /neture/admin/operators/:id/deactivate`
 *   (`routes/neture/controllers/neture.controller.ts` — LAST_ADMIN_PROTECTED / self-deactivation)
 */

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

/** 트랜잭션 안에서 실행된 SQL 을 기록해 soft revoke 계약을 검사한다. */
const txQueries: Array<{ sql: string; params: unknown[] }> = [];
const plainQueries: Array<{ sql: string; params: unknown[] }> = [];

/** role -> 활성 보유자 userId 목록 */
let activeHolders: Record<string, string[]> = {};

function applyRevoke(userId: string, role: string): [unknown[], number] {
  const holders = activeHolders[role] ?? [];
  const hit = holders.includes(userId) ? 1 : 0;
  activeHolders[role] = holders.filter((id) => id !== userId);
  return [[], hit];
}

const mockManager = {
  query: jest.fn(async (sql: string, params: unknown[] = []) => {
    txQueries.push({ sql, params });
    if (/SELECT user_id FROM role_assignments/i.test(sql)) {
      const role = String(params[0]);
      return (activeHolders[role] ?? []).map((user_id) => ({ user_id }));
    }
    if (/UPDATE role_assignments/i.test(sql)) {
      const [userId, role] = params as [string, string];
      return applyRevoke(userId, role);
    }
    return [];
  }),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: jest.fn(() => mockUserRepo),
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      plainQueries.push({ sql, params });
      if (/UPDATE role_assignments/i.test(sql)) {
        const [userId, role] = params as [string, string];
        return applyRevoke(userId, role);
      }
      return [];
    }),
    transaction: jest.fn(async (cb: (m: unknown) => Promise<void>) => cb(mockManager)),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    removeAllRoles: jest.fn(),
    assignRole: jest.fn(),
    getRoleNames: jest.fn(async () => []),
  },
}));

jest.mock('../../../utils/auth.utils.js', () => ({
  hashPassword: jest.fn(async (pw: string) => `hashed:${pw}`),
  comparePassword: jest.fn(async () => true),
}));

import { AdminUserController } from '../AdminUserController.js';

const controller = new AdminUserController();

const TARGET_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ID = '22222222-3333-4444-8555-666666666666';
const REQUESTER_ID = '99999999-8888-4777-8666-555555555555';

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(userId: string, role: string, requesterId: string = REQUESTER_ID) {
  return { params: { userId, role }, user: { id: requesterId } } as any;
}

function selectQuery() {
  return txQueries.find((q) => /SELECT user_id FROM role_assignments/i.test(q.sql));
}

function hasTxUpdate() {
  return txQueries.some((q) => /UPDATE role_assignments/i.test(q.sql));
}

beforeEach(() => {
  jest.clearAllMocks();
  txQueries.length = 0;
  plainQueries.length = 0;
  activeHolders = {};
  mockUserRepo.findOne.mockResolvedValue({ id: TARGET_ID, email: 'target@example.test' });
});

describe('마지막 활성 서비스 admin 해제 차단', () => {
  it('서비스 admin 이 1명일 때 해제를 거절한다', async () => {
    activeHolders['neture:admin'] = [TARGET_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'LAST_ADMIN_PROTECTED' })
    );
    // 보호가 걸리면 UPDATE 가 전혀 실행되지 않는다.
    expect(hasTxUpdate()).toBe(false);
    expect(activeHolders['neture:admin']).toEqual([TARGET_ID]);
  });

  it('서비스 admin 이 2명 이상이면 1명 해제를 허용한다', async () => {
    activeHolders['neture:admin'] = [TARGET_ID, OTHER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(activeHolders['neture:admin']).toEqual([OTHER_ID]);
  });

  it('비활성 assignment 는 활성 admin 수에 포함하지 않는다', async () => {
    // 활성 보유자는 대상 1명뿐이고, 다른 사용자의 비활성 행은 집합에 들어오지 않는다.
    activeHolders['kpa:admin'] = [TARGET_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'kpa:admin'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'LAST_ADMIN_PROTECTED' })
    );
    // 보유자 조회는 is_active = true 로 한정한다.
    expect(selectQuery()).toBeDefined();
    expect(selectQuery()!.sql).toMatch(/is_active\s*=\s*true/);
  });

  it('다른 서비스의 admin 은 해당 서비스의 마지막 admin 수에 포함하지 않는다', async () => {
    // cosmetics:admin 활성 보유자는 대상 1명뿐 → 다른 서비스 admin 이 많아도 보호된다.
    activeHolders['cosmetics:admin'] = [TARGET_ID];
    activeHolders['neture:admin'] = [OTHER_ID, REQUESTER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'cosmetics:admin'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'LAST_ADMIN_PROTECTED' })
    );
    // 판정 쿼리는 해제 대상 role 하나만 조회한다.
    const roleParams = txQueries
      .filter((q) => /SELECT user_id FROM role_assignments/i.test(q.sql))
      .map((q) => q.params[0]);
    expect(roleParams).toEqual(['cosmetics:admin']);
  });

  it('마지막 1명이어도 operator 역할에는 보호가 걸리지 않는다', async () => {
    activeHolders['neture:operator'] = [TARGET_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:operator'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // 서비스 admin 이 아니면 트랜잭션 경로를 타지 않는다(기존 동작 유지).
    expect(txQueries).toHaveLength(0);
  });

  it('service admin 이 아닌 역할 접미사(_admin)는 보호 대상이 아니다', async () => {
    activeHolders['kpa:district_admin'] = [TARGET_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'kpa:district_admin'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(txQueries).toHaveLength(0);
  });

  it('활성 보유자가 아니면 LAST_ADMIN_PROTECTED 가 아니라 404 로 응답한다', async () => {
    activeHolders['neture:admin'] = [OTHER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ROLE_ASSIGNMENT_NOT_FOUND' })
    );
  });

  it('동시 해제로 보호가 우회되지 않도록 활성 보유자를 FOR UPDATE 로 잠근다', async () => {
    activeHolders['glycopharm:admin'] = [TARGET_ID, OTHER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'glycopharm:admin'), res);

    expect(selectQuery()!.sql).toMatch(/FOR UPDATE/);
    // 판정과 UPDATE 가 같은 트랜잭션 매니저에서 실행된다.
    expect(hasTxUpdate()).toBe(true);
    expect(plainQueries.some((q) => /UPDATE role_assignments/i.test(q.sql))).toBe(false);
  });
});

describe('자기 자신의 역할 해제 차단', () => {
  it('요청자가 자기 역할을 해제하면 거절한다', async () => {
    activeHolders['neture:admin'] = [REQUESTER_ID, OTHER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(REQUESTER_ID, 'neture:admin', REQUESTER_ID), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'SELF_ROLE_REVOKE_FORBIDDEN' })
    );
    // 계정 조회조차 하지 않고 차단한다.
    expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    expect(activeHolders['neture:admin']).toEqual([REQUESTER_ID, OTHER_ID]);
  });

  it('operator 역할이어도 자기 해제는 거절한다', async () => {
    activeHolders['kpa:operator'] = [REQUESTER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(REQUESTER_ID, 'kpa:operator', REQUESTER_ID), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SELF_ROLE_REVOKE_FORBIDDEN' })
    );
  });

  it('다른 사용자의 operator 역할 해제는 허용한다', async () => {
    activeHolders['neture:operator'] = [TARGET_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:operator'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(activeHolders['neture:operator']).toEqual([]);
  });
});

describe('기존 계약 회귀', () => {
  it('platform:super_admin 보호는 그대로 유지된다', async () => {
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'platform:super_admin'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SUPER_ADMIN_ROLE_PROTECTED' })
    );
  });

  it('자기 자신이어도 platform:super_admin 보호가 먼저 적용된다', async () => {
    const res = makeRes();

    await controller.revokeRoleAssignment(
      makeReq(REQUESTER_ID, 'platform:super_admin', REQUESTER_ID),
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SUPER_ADMIN_ROLE_PROTECTED' })
    );
  });

  it('platform:admin 은 서비스 admin 이 아니므로 기존 경로를 그대로 탄다', async () => {
    activeHolders['platform:admin'] = [TARGET_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'platform:admin'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(txQueries).toHaveLength(0);
  });

  it('존재하지 않는 사용자는 404 로 응답한다', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('해제는 soft revoke 이며 users · membership · credential 을 건드리지 않는다', async () => {
    activeHolders['neture:admin'] = [TARGET_ID, OTHER_ID];
    const res = makeRes();

    await controller.revokeRoleAssignment(makeReq(TARGET_ID, 'neture:admin'), res);

    const allSql = [...txQueries, ...plainQueries].map((q) => q.sql).join('\n');
    expect(allSql).toMatch(/SET is_active = false/);
    expect(allSql).not.toMatch(/DELETE FROM role_assignments/i);
    expect(allSql).not.toMatch(/service_memberships/i);
    expect(allSql).not.toMatch(/service_credentials/i);
    expect(allSql).not.toMatch(/UPDATE\s+users/i);
    expect(mockUserRepo.save).not.toHaveBeenCalled();
  });
});
