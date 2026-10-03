/**
 * Store 사업자 가입 계약
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8 · §18
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * 고정하는 것
 *   E1 가입은 조직 · 소유 관계 · 서비스 참여를 **공용 helper** 로 만든다(프로비저닝 중복 0)
 *   E2 Role ∧ Relationship — 관계를 세운 뒤에 `{prefix}:store_owner` 를 발급한다
 *   E3 멱등 — 이미 이 서비스의 매장 경영자면 아무 것도 만들지 않는다
 *   E4 임의 병합 금지 — 후보가 2개 이상이면 고르지 않고 409
 *   E5 입력 검증 — 가입 불가 서비스 · 이름 누락은 쓰기 전에 거절
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
const ORG_B = '22222222-2222-4222-8222-222222222222';

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

describe('E1·E2 가입은 공용 helper 를 쓰고, role 은 관계 뒤에 발급한다', () => {
  it('매장이 없으면 조직 · 소유 · 서비스 참여를 helper 가 만들고 owner role 을 발급한다', async () => {
    const { ds } = makeDs([]);
    const r = await enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' });

    expect(r).toMatchObject({ organizationId: ORG_A, serviceKey: 'kpa', outcome: 'created' });
    // 조직 생성을 이 모듈이 직접 하지 않는다 — helper 한 곳만 쓴다(프로비저닝 중복 0).
    expect(ensureOrgMock).toHaveBeenCalledTimes(1);
    expect(ensureOrgMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: '가나약국', type: 'store' }),
      USER,
      'kpa',
    );
    expect(assignRoleMock).toHaveBeenCalledWith(expect.objectContaining({ userId: USER, role: 'kpa:store_owner' }));
  });

  it('관계(helper) 가 role 발급보다 먼저다', async () => {
    const order: string[] = [];
    ensureOrgMock.mockImplementation(async () => {
      order.push('relationship');
      return { id: ORG_A, created: true };
    });
    assignRoleMock.mockImplementation(async () => {
      order.push('role');
      return {};
    });
    const { ds } = makeDs([]);
    await enrollStoreBusiness(ds, { userId: USER, serviceKey: 'cosmetics', businessName: '다라상점' });
    expect(order).toEqual(['relationship', 'role']);
  });

  it('서비스 가입은 status 를 보존하는 기존 ensure 계약을 쓴다', async () => {
    const { ds } = makeDs([]);
    await enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' });
    expect(ensureMembershipMock).toHaveBeenCalledWith(USER, ['kpa:store_owner']);
  });

  it('서비스별 owner role 규약을 따른다 — 새 prefix 를 만들지 않는다', () => {
    for (const key of ENROLLABLE_SERVICE_KEYS) {
      expect(STORE_OWNER_ROLE_BY_SERVICE[key]).toBe(`${key}:store_owner`);
    }
  });
});

describe('E3·E4 중복 생성과 임의 병합을 하지 않는다', () => {
  it('이미 이 서비스의 경영자면 아무 것도 만들지 않는다', async () => {
    hasRoleMock.mockResolvedValue(true);
    const { ds } = makeDs([ORG_A]);

    const r = await enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' });

    expect(r).toEqual({ organizationId: ORG_A, serviceKey: 'kpa', outcome: 'existing' });
    expect(ensureOrgMock).not.toHaveBeenCalled();
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('관계는 있는데 role 이 없으면 그 조직에 연결한다(중복 생성 0)', async () => {
    ensureOrgMock.mockResolvedValue({ id: ORG_A, created: false });
    const { ds } = makeDs([ORG_A]);

    const r = await enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' });

    expect(r.outcome).toBe('connected');
    expect(assignRoleMock).toHaveBeenCalled();
  });

  it('후보가 둘 이상이면 고르지 않고 거절한다', async () => {
    const { ds } = makeDs([ORG_A, ORG_B]);
    await expectCode(
      enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' }),
      'AMBIGUOUS_ORGANIZATION',
    );
    expect(ensureOrgMock).not.toHaveBeenCalled();
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('다른 서비스의 조직은 후보가 아니다 — 업종을 건너뛰지 않는다', async () => {
    linkedMock.mockResolvedValue(false); // 내 조직이지만 이 서비스에 등록돼 있지 않다
    const { ds } = makeDs([ORG_A, ORG_B]);

    const r = await enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '가나약국' });

    // 후보 0 → 모호하지 않고, 새로 만든다.
    expect(r.outcome).toBe('created');
    expect(ensureOrgMock).toHaveBeenCalledTimes(1);
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

  it('이름이 없으면 거절한다', async () => {
    const { ds } = makeDs([]);
    await expectCode(
      enrollStoreBusiness(ds, { userId: USER, serviceKey: 'kpa', businessName: '   ' }),
      'BUSINESS_NAME_REQUIRED',
    );
    expect(ensureOrgMock).not.toHaveBeenCalled();
  });

  it('가입 가능 서비스 목록은 owner role registry 와 같은 축이다', () => {
    expect(isEnrollableServiceKey('kpa')).toBe(true);
    expect(isEnrollableServiceKey('cafe24-b2b')).toBe(false); // 외부 로그인 전용 채널
    expect(isEnrollableServiceKey('platform')).toBe(false);
  });
});
