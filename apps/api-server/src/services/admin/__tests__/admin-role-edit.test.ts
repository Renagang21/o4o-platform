/**
 * Admin 역할 편집 경계 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * "Admin 은 서비스 운영자만 지정하고, 이후 회원·개체 관리는 서비스 운영자가 담당한다."
 *   - 추가 가능한 역할 = 서비스 범위 운영자 카탈로그뿐. 회원 역할 · 개별 분회 운영자는 400.
 *   - 카탈로그 밖 기존 역할은 요청에 없어도 지우지 않는다(일괄 삭제 금지).
 *   - 편집 경로의 해제도 전용 해제 경로와 같은 안전장치(자기 해제 · 마지막 admin)를 거친다.
 */
const getRoleNames = jest.fn();
const removeRole = jest.fn(async () => undefined);
const assignRole = jest.fn(async () => ({}));
const ensure = jest.fn(async () => ({ created: [], kept: [] }));
const revokeWithLock = jest.fn();

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    getRoleNames: (...a: unknown[]) => getRoleNames(...(a as [])),
    removeRole: (...a: unknown[]) => removeRole(...(a as [])),
    assignRole: (...a: unknown[]) => assignRole(...(a as [])),
  },
}));
jest.mock('../service-membership-ensure.js', () => ({
  ensureServiceMembershipsForRoles: (...a: unknown[]) => ensure(...(a as [])),
}));
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../../utils/role-revoke-safety.js', () => {
  const actual = jest.requireActual('../../../utils/role-revoke-safety.js');
  return { ...actual, revokeServiceAdminRoleWithLock: (...a: unknown[]) => revokeWithLock(...(a as [])) };
});

import {
  AdminRoleEditForbiddenError,
  applyAdminRoleEdit,
  assertAdminAssignableRoles,
  planAdminRoleEdit,
} from '../admin-role-edit.js';
import { OperatorRoleContractError } from '../../../config/operator-role-catalog.js';

const SUPER = { id: 'admin-1', isPlatformSuperAdmin: true };

beforeEach(() => {
  jest.clearAllMocks();
  revokeWithLock.mockResolvedValue({ status: 'revoked', affected: 1 });
});

describe('assertAdminAssignableRoles — 추가 전용 경로', () => {
  it('서비스 범위 운영자 역할은 통과한다', () => {
    expect(assertAdminAssignableRoles(['supplier:admin', 'community:admin'])).toEqual(['supplier:admin', 'community:admin']);
  });
  it.each([
    ['개별 분회 운영자', 'kpa-branch:operator'],
    ['분회 회원', 'kpa-branch:member'],
    ['약국 경영자', 'kpa:store_owner'],
    ['플랫폼 관리자', 'platform:super_admin'],
  ])('%s(%s)는 400 ROLE_NOT_ASSIGNABLE', (_l, role) => {
    expect(() => assertAdminAssignableRoles([role])).toThrow(OperatorRoleContractError);
    try {
      assertAdminAssignableRoles([role]);
    } catch (e) {
      expect((e as OperatorRoleContractError).code).toBe('ROLE_NOT_ASSIGNABLE');
      expect((e as OperatorRoleContractError).statusCode).toBe(400);
    }
  });
});

describe('planAdminRoleEdit — 카탈로그 역할만 차이로 추가·해제', () => {
  it('요청에 없는 기존 회원 역할은 지우지 않는다', () => {
    expect(planAdminRoleEdit(['kpa:store_owner', 'kpa-branch:operator', 'supplier:admin'], ['supplier:admin', 'funding:admin'])).toEqual({
      add: ['funding:admin'],
      remove: [],
    });
  });
  it('요청에서 빠진 카탈로그 역할만 해제한다', () => {
    expect(planAdminRoleEdit(['kpa:store_owner', 'supplier:admin'], ['kpa:store_owner'])).toEqual({
      add: [],
      remove: ['supplier:admin'],
    });
  });
  it('이미 가진 카탈로그 밖 역할을 요청에 그대로 둬도 된다(폼 보존값)', () => {
    expect(() => planAdminRoleEdit(['kpa-branch:operator'], ['kpa-branch:operator', 'community:admin'])).not.toThrow();
  });
  it('카탈로그 밖 역할을 새로 추가하면 거절한다', () => {
    expect(() => planAdminRoleEdit(['supplier:admin'], ['supplier:admin', 'kpa-branch:operator'])).toThrow(/서비스 운영자 역할만/);
  });
});

describe('applyAdminRoleEdit — 해제 안전장치', () => {
  it('추가만 membership ensure 로 넘기고, 회원 역할은 건드리지 않는다', async () => {
    getRoleNames.mockResolvedValue(['kpa:store_owner']);
    const r = await applyAdminRoleEdit('u1', ['community:admin'], SUPER);
    expect(assignRole).toHaveBeenCalledWith({ userId: 'u1', role: 'community:admin' }, undefined);
    expect(ensure).toHaveBeenCalledWith('u1', ['community:admin'], undefined);
    expect(removeRole).not.toHaveBeenCalled();
    expect(r.remove).toEqual([]);
  });

  it('서비스 admin 해제는 잠금 해제 경로를 쓰고 super_admin 이면 마지막 admin 도 허용한다', async () => {
    getRoleNames.mockResolvedValue(['supplier:admin']);
    await applyAdminRoleEdit('u1', [], SUPER);
    expect(revokeWithLock).toHaveBeenCalledWith({}, 'u1', 'supplier:admin', { allowLastAdmin: true });
    expect(removeRole).not.toHaveBeenCalled();
  });

  it('마지막 admin 이면 403 LAST_ADMIN_PROTECTED 이고 추가를 실행하지 않는다', async () => {
    getRoleNames.mockResolvedValue(['supplier:admin']);
    revokeWithLock.mockResolvedValue({ status: 'last_admin' });
    await expect(applyAdminRoleEdit('u1', ['funding:admin'], { id: 'x', isPlatformSuperAdmin: false })).rejects.toMatchObject({
      statusCode: 403,
      code: 'LAST_ADMIN_PROTECTED',
    });
    expect(assignRole).not.toHaveBeenCalled();
  });

  it('super_admin 이 아닌 요청자의 자기 역할 해제는 쓰기 전에 403', async () => {
    getRoleNames.mockResolvedValue(['supplier:admin']);
    await expect(applyAdminRoleEdit('me', [], { id: 'me', isPlatformSuperAdmin: false })).rejects.toBeInstanceOf(
      AdminRoleEditForbiddenError,
    );
    expect(revokeWithLock).not.toHaveBeenCalled();
    expect(removeRole).not.toHaveBeenCalled();
  });
});

it('central admin-to-operator change removes admin with the same revocation safeguards', async () => {
  getRoleNames.mockResolvedValue(['community:admin']);
  const result = await applyAdminRoleEdit('u1', ['community:operator'], SUPER);
  expect(result.remove).toEqual(['community:admin']);
  expect(revokeWithLock).toHaveBeenCalledWith({}, 'u1', 'community:admin', { allowLastAdmin: true });
  expect(assignRole).toHaveBeenCalledWith({ userId: 'u1', role: 'community:operator' }, undefined);
});
it('central community operator revocation uses role removal', async () => {
  getRoleNames.mockResolvedValue(['community:operator']);
  await applyAdminRoleEdit('u1', [], SUPER);
  expect(removeRole).toHaveBeenCalledWith('u1', 'community:operator');
});
