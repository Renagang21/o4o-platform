/**
 * Store 사업자 가입 계약
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8 · §18
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * 고정하는 것
 *   (E1~E4 가입 성공 경로 — 가입 대상 업종 0 으로 도달 불가 · PHASE1B 에서 제거)
 *   E5 입력 검증 — 가입 불가 서비스(약국 kpa 포함) · 이름 누락은 쓰기 전에 거절
 */
import {
  ENROLLABLE_SERVICE_KEYS,
  STORE_OWNER_ROLE_BY_SERVICE,
  StoreEnrollmentError,
  enrollStoreBusiness,
  isEnrollableServiceKey,
} from '../store-enrollment.service.js';

const ensureOrgMock = jest.fn();
const hasRoleMock = jest.fn();
const assignRoleMock = jest.fn();
const linkedMock = jest.fn();
const ensureMembershipMock = jest.fn();

jest.mock('../../../modules/organization/services/organization-ops.service.js', () => ({
  organizationOpsService: { ensureOrganizationWithOwnerAndService: (...a: unknown[]) => ensureOrgMock(...a) },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasRole: (...a: unknown[]) => hasRoleMock(...a),
    assignRole: (...a: unknown[]) => assignRoleMock(...a),
  },
}));
jest.mock('../../../utils/store-organization.resolver.js', () => ({
  STORE_MEMBER_ROLES: ['owner', 'admin', 'manager'],
  isOrganizationLinkedToService: (...a: unknown[]) => linkedMock(...a),
}));
jest.mock('../../admin/service-membership-ensure.js', () => ({
  ensureServiceMembershipsForRoles: (...a: unknown[]) => ensureMembershipMock(...a),
}));

const USER = 'user-1';
const ORG_A = '11111111-1111-4111-8111-111111111111';

/** organization_members 후보만 돌려주는 가짜 DataSource. */
const makeDs = (orgIds: string[]) => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  return {
    ds: {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
        return orgIds.map((id) => ({ organization_id: id }));
      }),
    } as never,
    calls,
  };
};

beforeEach(() => {
  ensureOrgMock.mockReset();
  hasRoleMock.mockReset();
  assignRoleMock.mockReset();
  linkedMock.mockReset();
  ensureMembershipMock.mockReset();
  ensureOrgMock.mockResolvedValue({ id: ORG_A, created: true });
  hasRoleMock.mockResolvedValue(false);
  assignRoleMock.mockResolvedValue({});
  linkedMock.mockResolvedValue(true);
  ensureMembershipMock.mockResolvedValue({ created: 1, kept: 0, policy: 'CREATED' });
});

const expectCode = async (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toMatchObject({ code } as Partial<StoreEnrollmentError>);

// E1~E4(가입 성공 경로)는 마지막 가입 대상이던 K-Cosmetics 가 은퇴하면서 도달 불가가 됐다 —
//   WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1. 현재 자가 가입 대상 업종은 없다.

describe('K-Cosmetics 자가 가입은 은퇴했다', () => {
  it('cosmetics 는 가입 대상이 아니다 — 조직 · role · membership 을 만들지 않는다', async () => {
    const { ds } = makeDs([]);
    await expectCode(
      enrollStoreBusiness(ds, { userId: USER, serviceKey: 'cosmetics', businessName: '가나상점' }),
      'SERVICE_NOT_ENROLLABLE',
    );
    expect(ds.query).not.toHaveBeenCalled();
    expect(ensureOrgMock).not.toHaveBeenCalled();
    expect(ensureMembershipMock).not.toHaveBeenCalled();
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('현재 자가 가입 대상 업종은 없다', () => {
    expect(ENROLLABLE_SERVICE_KEYS).toEqual([]);
  });

  it('owner role 규약은 그대로다 — 기존 cosmetics:store_owner 보유자 identity 는 DEFER', () => {
    expect(STORE_OWNER_ROLE_BY_SERVICE.cosmetics).toBe('cosmetics:store_owner');
  });
});

describe('E5 입력 검증은 쓰기 전에 끝난다', () => {
  it('가입 불가 서비스는 거절한다', async () => {
    const { ds } = makeDs([]);
    await expectCode(
      enrollStoreBusiness(ds, { userId: USER, serviceKey: 'cafe24-b2b', businessName: '가나' }),
      'SERVICE_NOT_ENROLLABLE',
    );
    expect(ds.query).not.toHaveBeenCalled();
    expect(ensureOrgMock).not.toHaveBeenCalled();
  });

  it('약국(kpa)은 자가 가입으로 열 수 없다 — 조직 · role · membership 을 만들지 않는다', async () => {
    // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · O4O-STORE-ACCESS-AND-MEMBERSHIP-V1 §3-A:
    //   약국 매장은 Neture 기본 가입 신청 + 운영자 승인으로만 열린다(승인 우회 경로 차단).
    const { ds } = makeDs([]);
    await expectCode(
      enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' }),
      'SERVICE_NOT_ENROLLABLE',
    );
    expect(ds.query).not.toHaveBeenCalled();
    expect(ensureOrgMock).not.toHaveBeenCalled();
    expect(ensureMembershipMock).not.toHaveBeenCalled();
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('가입 가능 서비스 목록은 비어 있다 — 어떤 owner role 도 자가 가입으로 열리지 않는다', () => {
    expect(isEnrollableServiceKey('cosmetics')).toBe(false); // K-Cosmetics 은퇴(PHASE1B)
    // Pharmacy-Hub 매장 자가 가입도 은퇴 — 약국은 Neture 기본 가입으로 통합(WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1).
    expect(isEnrollableServiceKey('pharmacy-hub')).toBe(false);
    // owner role 은 있지만 자가 가입 대상이 아니다(WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1).
    expect(STORE_OWNER_ROLE_BY_SERVICE.kpa).toBe('kpa:store_owner');
    expect(isEnrollableServiceKey('kpa')).toBe(false);
    expect(isEnrollableServiceKey('cafe24-b2b')).toBe(false); // 외부 로그인 전용 채널
    expect(isEnrollableServiceKey('platform')).toBe(false);
  });
});
