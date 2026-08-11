/**
 * WO-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1
 *
 * `DELETE /api/v1/operator/members/:userId/roles/:role` 의 안전 계약을 고정한다.
 *
 * 배경(우회 경로):
 *   이 경로의 operator/admin tier 제한은 `if (!scope.isPlatformAdmin)` 블록 안에 있다.
 *   즉 **platform admin 은 tier 가드를 통과하지 않고 지나간다**. 중앙
 *   `AdminUserController.revokeRoleAssignment` 에만 마지막 admin·자기 해제 보호를 두면
 *   platform admin 이 이 경로로 `{service}:admin` 을 마지막 1명까지 해제하거나
 *   자기 역할을 해제할 수 있다. 그 우회를 닫는다.
 *
 * 유지 계약:
 *   - platform:super_admin 의 정상적인 하위 역할 관리
 *   - 일반 회원 역할 제거와 기존 tier 규칙(비플랫폼 요청자)
 *   - role_assignments.is_active=false soft revoke
 */

const mockQuery = jest.fn();
const mockUserRepo = { count: jest.fn(), findOne: jest.fn() };

/** 트랜잭션 안에서 실행된 SQL */
const txQueries: Array<{ sql: string; params: unknown[] }> = [];
/** role -> 활성 보유자 userId 목록 */
let activeHolders: Record<string, string[]> = {};

const mockManager = {
  query: jest.fn(async (sql: string, params: unknown[] = []) => {
    txQueries.push({ sql, params });
    if (/SELECT user_id FROM role_assignments/i.test(sql)) {
      const role = String(params[0]);
      return (activeHolders[role] ?? []).map((user_id) => ({ user_id }));
    }
    if (/UPDATE role_assignments/i.test(sql)) {
      const [uid, role] = params as [string, string];
      const holders = activeHolders[role] ?? [];
      const hit = holders.includes(uid) ? 1 : 0;
      activeHolders[role] = holders.filter((id) => id !== uid);
      return [[], hit];
    }
    return [];
  }),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    // false 로 두면 컨트롤러가 ActionLogService 를 만들지 않는다(기존 테스트와 동일).
    isInitialized: false,
    query: (...args: any[]) => mockQuery(...args),
    getRepository: jest.fn(() => mockUserRepo),
    transaction: jest.fn(async (cb: (m: unknown) => Promise<unknown>) => cb(mockManager)),
  },
}));

jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockRemoveRole = jest.fn();
const mockGetUsersWithRole = jest.fn();
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    removeRole: (...args: any[]) => mockRemoveRole(...args),
    assignRole: jest.fn(),
    getRoleNames: jest.fn(),
    getUsersWithRole: (...args: any[]) => mockGetUsersWithRole(...args),
  },
}));

const mockGetRoleByName = jest.fn();
jest.mock('../../../modules/auth/services/role.service.js', () => ({
  roleService: { getRoleByName: (...args: any[]) => mockGetRoleByName(...args) },
}));

const mockInvalidateRoles = jest.fn();
jest.mock('../../../modules/auth/utils/role-cache.js', () => ({
  invalidateRoles: (...args: any[]) => mockInvalidateRoles(...args),
}));

import { MembershipConsoleController } from '../MembershipConsoleController.js';
import {
  LAST_ADMIN_PROTECTED_CODE,
  SELF_ROLE_REVOKE_FORBIDDEN_CODE,
} from '../../../utils/role-revoke-safety.js';

const controller = new MembershipConsoleController();

const TARGET_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ID = '22222222-3333-4444-8555-666666666666';
const REQUESTER_ID = '99999999-8888-4777-8666-555555555555';

const PLATFORM_SCOPE = { isPlatformAdmin: true, serviceKeys: [], rolePrefixes: [] };
const NETURE_OPERATOR_SCOPE = {
  isPlatformAdmin: false,
  serviceKeys: ['neture'],
  rolePrefixes: ['neture'],
};

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(userId: string, role: string, scope: any = PLATFORM_SCOPE, requesterId = REQUESTER_ID) {
  return {
    params: { userId, role },
    user: { id: requesterId },
    serviceScope: scope,
  } as any;
}

/** roles 카탈로그 응답 — 실제 seed 규약을 따른다 */
function primeRole(name: string) {
  const [serviceKey, roleKey] = name.includes(':') ? name.split(':') : ['neture', name];
  mockGetRoleByName.mockImplementation((requested: string) =>
    Promise.resolve(
      requested === name
        ? {
            name,
            serviceKey,
            roleKey,
            isAdminRole: roleKey === 'admin' || roleKey.endsWith('_admin'),
            isAssignable: true,
          }
        : null,
    ),
  );
}

function hasTxUpdate() {
  return txQueries.some((q) => /UPDATE role_assignments/i.test(q.sql));
}

beforeEach(() => {
  jest.clearAllMocks();
  txQueries.length = 0;
  activeHolders = {};
  mockRemoveRole.mockResolvedValue(true);
  mockGetUsersWithRole.mockResolvedValue([]);
  mockUserRepo.count.mockResolvedValue(0);
  // checkServiceBoundary(SELECT 1 FROM service_memberships) 는 통과시킨다.
  mockQuery.mockResolvedValue([{ ok: 1 }]);
});

describe('자기 역할 해제 차단', () => {
  it('platform admin 이 자기 역할을 해제하면 거절한다', async () => {
    primeRole('neture:admin');
    activeHolders['neture:admin'] = [REQUESTER_ID, OTHER_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(REQUESTER_ID, 'neture:admin'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: SELF_ROLE_REVOKE_FORBIDDEN_CODE }),
    );
    // role 카탈로그 조회 전에 차단한다.
    expect(mockGetRoleByName).not.toHaveBeenCalled();
    expect(mockRemoveRole).not.toHaveBeenCalled();
    expect(hasTxUpdate()).toBe(false);
  });

  it('서비스 운영자가 자기 역할을 해제해도 거절한다', async () => {
    primeRole('neture:seller');
    const res = makeRes();

    await controller.removeMemberRole(
      makeReq(REQUESTER_ID, 'neture:seller', NETURE_OPERATOR_SCOPE),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: SELF_ROLE_REVOKE_FORBIDDEN_CODE }),
    );
    expect(mockRemoveRole).not.toHaveBeenCalled();
  });
});

describe('마지막 활성 서비스 admin 해제 차단', () => {
  it('platform admin 이어도 마지막 활성 {service}:admin 은 해제할 수 없다', async () => {
    primeRole('neture:admin');
    activeHolders['neture:admin'] = [TARGET_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: LAST_ADMIN_PROTECTED_CODE }),
    );
    expect(hasTxUpdate()).toBe(false);
    expect(mockRemoveRole).not.toHaveBeenCalled();
    expect(activeHolders['neture:admin']).toEqual([TARGET_ID]);
  });

  it('admin 이 2명 이상이면 1명 해제를 허용한다', async () => {
    primeRole('neture:admin');
    activeHolders['neture:admin'] = [TARGET_ID, OTHER_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(activeHolders['neture:admin']).toEqual([OTHER_ID]);
    // 역할 캐시 무효화를 빠뜨리지 않는다(기존 removeRole 경로가 하던 일).
    expect(mockInvalidateRoles).toHaveBeenCalledWith(TARGET_ID);
  });

  it('비활성 assignment 는 활성 admin 수에 포함하지 않는다', async () => {
    primeRole('kpa:admin');
    activeHolders['kpa:admin'] = [TARGET_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'kpa:admin'), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: LAST_ADMIN_PROTECTED_CODE }),
    );
    const select = txQueries.find((q) => /SELECT user_id FROM role_assignments/i.test(q.sql));
    expect(select).toBeDefined();
    expect(select!.sql).toMatch(/is_active\s*=\s*true/);
  });

  it('다른 서비스의 admin 은 해당 서비스의 마지막 admin 수에 포함하지 않는다', async () => {
    primeRole('cosmetics:admin');
    activeHolders['cosmetics:admin'] = [TARGET_ID];
    activeHolders['neture:admin'] = [OTHER_ID, REQUESTER_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'cosmetics:admin'), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: LAST_ADMIN_PROTECTED_CODE }),
    );
    const roleParams = txQueries
      .filter((q) => /SELECT user_id FROM role_assignments/i.test(q.sql))
      .map((q) => q.params[0]);
    expect(roleParams).toEqual(['cosmetics:admin']);
  });

  it('동시 해제를 막기 위해 활성 보유자를 FOR UPDATE 로 잠그고 같은 트랜잭션에서 UPDATE 한다', async () => {
    primeRole('glycopharm:admin');
    activeHolders['glycopharm:admin'] = [TARGET_ID, OTHER_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'glycopharm:admin'), res);

    const select = txQueries.find((q) => /SELECT user_id FROM role_assignments/i.test(q.sql));
    expect(select!.sql).toMatch(/FOR UPDATE/);
    expect(hasTxUpdate()).toBe(true);
    // soft revoke 계약 유지 — DELETE 하지 않는다.
    const allSql = txQueries.map((q) => q.sql).join('\n');
    expect(allSql).toMatch(/SET is_active = false/);
    expect(allSql).not.toMatch(/DELETE FROM role_assignments/i);
    expect(allSql).not.toMatch(/UPDATE\s+users/i);
    expect(allSql).not.toMatch(/service_memberships/i);
    expect(allSql).not.toMatch(/service_credentials/i);
  });

  it('보유자가 아니면 기존과 같이 404 로 응답한다', async () => {
    primeRole('neture:admin');
    activeHolders['neture:admin'] = [OTHER_ID];
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'neture:admin'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Role not found or already inactive' }),
    );
  });
});

describe('기존 계약 유지', () => {
  it('platform admin 의 타인 operator 역할 해제는 기존 경로로 허용한다', async () => {
    primeRole('neture:operator');
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'neture:operator'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // 서비스 admin 이 아니면 잠금 트랜잭션을 타지 않는다(동작 변경 없음).
    expect(txQueries).toHaveLength(0);
    expect(mockRemoveRole).toHaveBeenCalledWith(TARGET_ID, 'neture:operator');
  });

  it('platform admin 의 타인 일반 하위 역할 해제는 기존 경로로 허용한다', async () => {
    primeRole('neture:seller');
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'neture:seller'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(txQueries).toHaveLength(0);
    expect(mockRemoveRole).toHaveBeenCalledWith(TARGET_ID, 'neture:seller');
  });

  it('district_admin 은 서비스 단위 admin 이 아니므로 기존 경로를 그대로 탄다', async () => {
    primeRole('kpa:district_admin');
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'kpa:district_admin'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(txQueries).toHaveLength(0);
  });

  it('비플랫폼 요청자의 operator/admin tier 가드는 그대로다', async () => {
    primeRole('neture:admin');
    activeHolders['neture:admin'] = [TARGET_ID, OTHER_ID];
    const res = makeRes();

    await controller.removeMemberRole(
      makeReq(TARGET_ID, 'neture:admin', NETURE_OPERATOR_SCOPE),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY' }),
    );
    // tier 가드에서 끝나므로 해제 로직에 도달하지 않는다.
    expect(hasTxUpdate()).toBe(false);
    expect(mockRemoveRole).not.toHaveBeenCalled();
  });

  it('비플랫폼 요청자의 서비스 범위 밖 역할 해제 거절이 그대로다', async () => {
    primeRole('cosmetics:seller');
    const res = makeRes();

    await controller.removeMemberRole(
      makeReq(TARGET_ID, 'cosmetics:seller', NETURE_OPERATOR_SCOPE),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Cannot remove roles outside your service scope' }),
    );
  });

  it('알 수 없는 역할은 그대로 400 이다', async () => {
    mockGetRoleByName.mockResolvedValue(null);
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'neture:nope'), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid role' }));
  });

  it('마지막 활성 platform:super_admin 보호(409)는 그대로다', async () => {
    primeRole('platform:super_admin');
    mockGetUsersWithRole.mockResolvedValue([TARGET_ID]);
    mockUserRepo.count.mockResolvedValue(1);
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'platform:super_admin'), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'LAST_PLATFORM_SUPER_ADMIN' }),
    );
    // platform: 접두는 서비스 admin 판정에서 제외되므로 잠금 경로를 타지 않는다.
    expect(txQueries).toHaveLength(0);
  });

  it('platform:super_admin 이 여러 명이면 기존대로 해제할 수 있다', async () => {
    primeRole('platform:super_admin');
    mockGetUsersWithRole.mockResolvedValue([TARGET_ID, OTHER_ID]);
    mockUserRepo.count.mockResolvedValue(2);
    const res = makeRes();

    await controller.removeMemberRole(makeReq(TARGET_ID, 'platform:super_admin'), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockRemoveRole).toHaveBeenCalledWith(TARGET_ID, 'platform:super_admin');
  });
});
