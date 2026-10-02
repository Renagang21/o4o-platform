/**
 * Demo 계정 write 보호 — 동작 계약
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 (정책 §8 남은 3종)
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md` §8-1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 여기서 고정하는 것 — 이메일 변경 · role 변경 · ownership 해제/변경
 *
 *   W1 Demo 대상이면 거절하고, **write(INSERT · UPDATE · DELETE · save · role 편집) 가 0건**이다.
 *   W2 일반 사용자는 종전대로 write 까지 간다.
 *   W3 Demo 판정 조회가 실패하면 write 없이 실패한다(fail-closed).
 *
 * 판정은 **실제** `demoAccountService` 가 fake DB 의 `demo_accounts` 질의로 내린다(서비스를 mock 하지 않는다).
 * 그래서 `isDemoAccount` · `isDemoOrganization` 을 `return false` 로 바꾸면 W1 이 깨진다(변이 검사).
 */

type Row = Record<string, unknown>;
type Mode = 'demo' | 'regular' | 'error';

/** 이번 테스트의 Demo 판정 상태 — demo_accounts 질의에만 반응한다. */
let mode: Mode = 'regular';
const seen: string[] = [];
/** demo_accounts 이외 질의의 응답 — 테스트마다 정한다. */
let answer: (sql: string, params: unknown[]) => unknown = () => [];

const isWrite = (sql: string) => /^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql);
const writes = () => seen.filter(isWrite);

async function fakeQuery(sql: string, params: unknown[] = []): Promise<unknown> {
  seen.push(sql);
  if (/FROM\s+demo_accounts/i.test(sql)) {
    if (mode === 'error') throw new Error('connection lost');
    return mode === 'demo' ? [{ '?column?': 1 }] : [];
  }
  return answer(sql, params);
}

const fakeDb = { query: jest.fn(fakeQuery) };

const mockUserRepo = { findOne: jest.fn(), save: jest.fn(async (u: unknown) => u) };
const mockCreateQueryRunner = jest.fn();

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    query: (sql: string, params?: unknown[]) => fakeQuery(sql, params),
    getRepository: jest.fn(() => mockUserRepo),
    transaction: jest.fn(async (cb: (m: unknown) => unknown) => cb({ query: (s: string, p?: unknown[]) => fakeQuery(s, p) })),
    createQueryRunner: (...a: unknown[]) => mockCreateQueryRunner(...a),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockAssignRole = jest.fn();
const mockRemoveRole = jest.fn();
const mockHasRole = jest.fn(async () => false);
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    assignRole: (...a: unknown[]) => mockAssignRole(...a),
    removeRole: (...a: unknown[]) => mockRemoveRole(...a),
    hasRole: (...a: unknown[]) => (mockHasRole as any)(...a),
    removeAllRoles: jest.fn(),
    getRoleNames: jest.fn(async () => []),
  },
  RoleAssignmentService: jest.fn(),
}));

jest.mock('../../../modules/auth/utils/role-cache.js', () => ({ invalidateRoles: jest.fn() }));

const mockApplyAdminRoleEdit = jest.fn();
jest.mock('../../admin/admin-role-edit.js', () => {
  class AdminRoleEditForbiddenError extends Error {}
  return {
    AdminRoleEditForbiddenError,
    applyAdminRoleEdit: (...a: unknown[]) => mockApplyAdminRoleEdit(...a),
    assertAdminAssignableRoles: jest.fn(),
  };
});

jest.mock('../../NotificationService.js', () => ({ notificationService: { createNotification: jest.fn() } }));

import { AdminUserController } from '../../../controllers/admin/AdminUserController.js';
import { MembershipApprovalService } from '../../approval/MembershipApprovalService.js';
import { StoreOwnerTerminationService, StoreOwnerTerminationError } from '../../store-owner-termination.service.js';
import { NetureSupplierService } from '../../../modules/neture/services/supplier.service.js';
import {
  BranchOperatorDesignationService,
  BranchOperatorDesignationError,
} from '../../kpa-branch/branch-operator-designation.service.js';
import { DemoAccountForbiddenError, DEMO_ACCOUNT_FORBIDDEN_CODE } from '../demo-account.service.js';

const USER_ID = '11111111-2222-4333-8444-555555555555';
const ORG_ID = '9c87f46b-0000-4000-8000-000000000001';
const SUPPLIER_ID = '33333333-4444-4555-8666-777777777777';

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mode = 'regular';
  seen.length = 0;
  answer = () => [];
  mockUserRepo.findOne.mockImplementation(async ({ where }: { where: Row }) =>
    where.id ? { id: USER_ID, email: 'before@example.test', name: 'before' } : null,
  );
});

// ── 이메일 변경 · role 변경 (Admin 사용자 편집) ─────────────────────────────
describe('AdminUserController.updateUser — 이메일 · role', () => {
  const controller = new AdminUserController();
  const req = (body: Row) => ({ params: { id: USER_ID }, body, user: { id: 'admin-1', roles: ['platform:super_admin'] } }) as any;

  it('W1 Demo 의 이메일 변경을 거절한다 — save 0', async () => {
    mode = 'demo';
    const res = makeRes();
    await controller.updateUser(req({ email: 'after@example.test' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: DEMO_ACCOUNT_FORBIDDEN_CODE }));
    expect(mockUserRepo.save).not.toHaveBeenCalled();
    expect(mockApplyAdminRoleEdit).not.toHaveBeenCalled();
  });

  it('W1 Demo 의 role 변경을 거절한다 — 역할 편집 0', async () => {
    mode = 'demo';
    const res = makeRes();
    await controller.updateUser(req({ roles: ['neture:operator'] }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockApplyAdminRoleEdit).not.toHaveBeenCalled();
    expect(mockUserRepo.save).not.toHaveBeenCalled();
  });

  it('W2 일반 사용자의 이메일 · role 변경은 그대로 된다', async () => {
    const res = makeRes();
    await controller.updateUser(req({ email: 'after@example.test', roles: ['neture:operator'] }), res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockApplyAdminRoleEdit).toHaveBeenCalledTimes(1);
    expect(mockUserRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'after@example.test' }));
  });

  it('W3 판정 조회 실패 → 500 · save 0 (통과로 바꾸지 않는다)', async () => {
    mode = 'error';
    const res = makeRes();
    await controller.updateUser(req({ email: 'after@example.test' }), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockUserRepo.save).not.toHaveBeenCalled();
    expect(mockApplyAdminRoleEdit).not.toHaveBeenCalled();
  });
});

// ── role · membership 해제 (서비스 탈퇴 · 회원 삭제) ─────────────────────────
describe('MembershipApprovalService — 탈퇴 · 삭제', () => {
  const service = new MembershipApprovalService();
  const withdraw = () =>
    service.withdrawMembership({
      userId: USER_ID, withdrawnBy: 'op-1', isPlatformAdmin: false, serviceKeys: ['kpa-society'], manager: fakeDb as any,
    });

  it('W1 Demo 탈퇴 처리를 거절한다 — write 0', async () => {
    mode = 'demo';
    await expect(withdraw()).rejects.toBeInstanceOf(DemoAccountForbiddenError);
    expect(writes()).toEqual([]);
    expect(seen.some((q) => /FROM service_memberships/i.test(q))).toBe(false);
  });

  it('W2 일반 사용자는 탈퇴 판정 질의로 진행한다', async () => {
    await expect(withdraw()).resolves.toBeNull(); // 대상 membership 이 없는 fake → null
    expect(seen.some((q) => /FROM service_memberships/i.test(q))).toBe(true);
  });

  it('W3 판정 조회 실패 → 예외 · write 0', async () => {
    mode = 'error';
    await expect(withdraw()).rejects.toThrow('connection lost');
    expect(writes()).toEqual([]);
  });

  it('W1 Demo 회원 삭제(hard)를 거절한다 — transaction 을 열지 않는다', async () => {
    mode = 'demo';
    await expect(
      service.deleteMember({ userId: USER_ID, deletedBy: 'op-1', isPlatformAdmin: true, serviceKeys: ['neture'], mode: 'hard' } as any),
    ).rejects.toBeInstanceOf(DemoAccountForbiddenError);
    expect(mockCreateQueryRunner).not.toHaveBeenCalled();
    expect(writes()).toEqual([]);
  });
});

// ── store ownership 해제 (매장 경영자 계약 종료) ─────────────────────────────
describe('StoreOwnerTerminationService.createCase — store ownership 해제', () => {
  const service = new StoreOwnerTerminationService(fakeDb as any);
  const create = () => service.createCase({ serviceKey: 'kpa-society', organizationId: ORG_ID, userId: USER_ID });

  beforeEach(() => {
    answer = (sql) => {
      if (/organization_service_enrollments|FROM role_assignments/i.test(sql)) return [{ '?column?': 1 }];
      if (/INSERT INTO store_owner_termination_cases/i.test(sql)) {
        const now = new Date().toISOString();
        return [{ id: 'case-1', service_key: 'kpa-society', organization_id: ORG_ID, user_id: USER_ID, status: 'termination_scheduled', requested_at: now, created_at: now, updated_at: now }];
      }
      return [];
    };
  });

  it('W1 Demo 매장의 계약 종료 건을 만들지 않는다 — INSERT 0', async () => {
    mode = 'demo';
    const err = await create().catch((e) => e);
    expect(err).toBeInstanceOf(StoreOwnerTerminationError);
    expect(err.code).toBe(DEMO_ACCOUNT_FORBIDDEN_CODE);
    expect(err.httpStatus).toBe(403);
    expect(writes()).toEqual([]);
  });

  it('W2 일반 매장은 종료 건이 생성된다', async () => {
    await expect(create()).resolves.toEqual(expect.objectContaining({ id: 'case-1' }));
    expect(writes()).toHaveLength(1);
  });

  it('W3 판정 조회 실패 → 예외 · INSERT 0', async () => {
    mode = 'error';
    await expect(create()).rejects.toThrow('connection lost');
    expect(writes()).toEqual([]);
  });
});

// ── 사업자 ownership 해제 (공급자 비활성화) ──────────────────────────────────
describe('NetureSupplierService.deactivateSupplier — 사업자 ownership 해제', () => {
  const service = new NetureSupplierService();
  const deactivate = () => service.deactivateSupplier(SUPPLIER_ID, 'admin-1', '점검');

  beforeEach(() => {
    answer = (sql) => {
      // Demo 공급자는 neture_suppliers.user_id 가 NULL 이다 — 조직 owner 로만 판정된다.
      if (/FROM neture_suppliers WHERE id = \$1 FOR UPDATE/i.test(sql)) return [{ status: 'ACTIVE', user_id: null, organization_id: ORG_ID }];
      if (/COUNT\(/i.test(sql)) return [{ c: '0' }];
      if (/^\s*UPDATE/i.test(sql)) return [[], 0];
      return [];
    };
  });

  it('W1 Demo 공급자(user_id NULL · 조직 owner 가 Demo)를 비활성화하지 않는다 — write 0', async () => {
    mode = 'demo';
    await expect(deactivate()).resolves.toEqual({ success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE });
    expect(writes()).toEqual([]);
    expect(seen.some((q) => /JOIN organization_members/i.test(q))).toBe(true); // 조직 owner 경로로 판정
    expect(mockRemoveRole).not.toHaveBeenCalled();
  });

  it('W2 일반 공급자는 비활성화된다', async () => {
    const result = await deactivate();
    expect(result.success).toBe(true);
    expect(writes().some((q) => /UPDATE neture_suppliers/i.test(q))).toBe(true);
  });

  it('W3 판정 조회 실패 → 예외 · write 0', async () => {
    mode = 'error';
    await expect(deactivate()).rejects.toThrow('connection lost');
    expect(writes()).toEqual([]);
  });
});

// ── role 변경 (분회 운영자 지정 · 해제) ─────────────────────────────────────
describe('BranchOperatorDesignationService — 운영자 지정 · 해제', () => {
  const service = new BranchOperatorDesignationService(fakeDb as any);

  beforeEach(() => {
    answer = (sql) => {
      if (/FROM service_memberships/i.test(sql)) return [{ status: 'active' }];
      return [{ id: ORG_ID, user_id: USER_ID, '?column?': 1 }];
    };
  });

  it('W1 Demo 를 운영자로 지정하지 않는다 — assignRole 0', async () => {
    mode = 'demo';
    const err = await service.designate(ORG_ID, USER_ID, 'op-1').catch((e) => e);
    expect(err).toBeInstanceOf(BranchOperatorDesignationError);
    expect(err.statusCode).toBe(403);
    expect(mockAssignRole).not.toHaveBeenCalled();
  });

  it('W1 Demo 의 운영자 역할을 해제하지 않는다 — removeRole 0', async () => {
    mode = 'demo';
    mockHasRole.mockResolvedValueOnce(true);
    const err = await service.release(ORG_ID, USER_ID).catch((e) => e);
    expect(err).toBeInstanceOf(BranchOperatorDesignationError);
    expect(err.code).toBe(DEMO_ACCOUNT_FORBIDDEN_CODE);
    expect(mockRemoveRole).not.toHaveBeenCalled();
  });

  it('W2 일반 회원은 지정된다', async () => {
    await expect(service.designate(ORG_ID, USER_ID, 'op-1')).resolves.toEqual({ assigned: true });
    expect(mockAssignRole).toHaveBeenCalledTimes(1);
  });

  it('W3 판정 조회 실패 → 예외 · assignRole 0', async () => {
    mode = 'error';
    await expect(service.designate(ORG_ID, USER_ID, 'op-1')).rejects.toThrow('connection lost');
    expect(mockAssignRole).not.toHaveBeenCalled();
  });
});
