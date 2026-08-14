/**
 * WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1
 *
 * KPA 매장 조직 canonical provisioning — service enrollment 생성/멱등/중복 0 검증.
 * DB 는 붙이지 않는다 (organization-ops / role-assignment / slug service 는 mock).
 */

const mockOrgOps = {
  ensureOrganization: jest.fn(),
  addMember: jest.fn().mockResolvedValue(undefined),
  enrollService: jest.fn().mockResolvedValue(undefined),
};
const mockRoleAssign = { assignRole: jest.fn().mockResolvedValue(undefined) };
const mockSlug = {
  findByStoreId: jest.fn(),
  generateUniqueSlug: jest.fn().mockResolvedValue('my-pharmacy'),
  reserveSlug: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../../modules/organization/services/organization-ops.service.js', () => ({
  organizationOpsService: mockOrgOps,
}));
jest.mock('../../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: mockRoleAssign,
}));
jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: jest.fn().mockImplementation(() => mockSlug),
}), { virtual: true });

import {
  ensureKpaStoreOrganization,
  KPA_CANONICAL_SERVICE_CODE,
  KPA_STORE_SLUG_SERVICE_KEY,
} from '../kpa-store-organization.provisioning.js';

const makeDataSource = () => ({ query: jest.fn().mockResolvedValue([]) }) as any;

const INPUT = {
  pharmacyName: '우리약국',
  businessNumberDigits: '1234567890',
  userId: 'user-1',
  assignedBy: 'operator-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOrgOps.ensureOrganization.mockResolvedValue({ id: 'org-1', created: true });
  mockSlug.findByStoreId.mockResolvedValue(null);
  mockSlug.generateUniqueSlug.mockResolvedValue('my-pharmacy');
});

describe('ensureKpaStoreOrganization', () => {
  it('canonical serviceKey 는 security-core resolver 결과다 (로컬 매핑 금지)', () => {
    expect(KPA_CANONICAL_SERVICE_CODE).toBe('kpa-society');
    // slug 키는 별개 축 — 두 값을 합치지 않는다
    expect(KPA_STORE_SLUG_SERVICE_KEY).toBe('kpa');
  });

  it('신규 매장 조직에 active service enrollment 를 정확히 1건 생성한다', async () => {
    const dataSource = makeDataSource();
    const result = await ensureKpaStoreOrganization({ dataSource, ...INPUT });

    expect(result.organizationId).toBe('org-1');
    expect(mockOrgOps.enrollService).toHaveBeenCalledTimes(1);
    expect(mockOrgOps.enrollService).toHaveBeenCalledWith({
      organizationId: 'org-1',
      serviceCode: 'kpa-society',
    });
    expect(mockOrgOps.ensureOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'kpa-pharm-1234567890', type: 'pharmacy' }),
    );
    expect(mockRoleAssign.assignRole).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', role: 'kpa:store_owner' }),
    );
  });

  it('재호출해도 enrollService 는 멱등 계약(ON CONFLICT DO NOTHING)으로 한 번씩만 위임한다', async () => {
    const dataSource = makeDataSource();
    mockOrgOps.ensureOrganization.mockResolvedValue({ id: 'org-1', created: false });
    mockSlug.findByStoreId.mockResolvedValue({ slug: 'my-pharmacy' });

    await ensureKpaStoreOrganization({ dataSource, ...INPUT });
    await ensureKpaStoreOrganization({ dataSource, ...INPUT });

    // 동일 (organization, service) — 호출은 2회지만 인자가 항상 동일해 중복 row 는 생기지 않는다
    expect(mockOrgOps.enrollService).toHaveBeenCalledTimes(2);
    expect(new Set(mockOrgOps.enrollService.mock.calls.map((c) => JSON.stringify(c[0]))).size).toBe(1);
    // 기존 slug 존재 → 재예약 없음 (no-op)
    expect(mockSlug.reserveSlug).not.toHaveBeenCalled();
    expect(mockSlug.generateUniqueSlug).not.toHaveBeenCalled();
  });

  it('kpa_members.organization_id 는 NULL 인 경우에만 보정한다 (분회 연결 보호)', async () => {
    const dataSource = makeDataSource();
    await ensureKpaStoreOrganization({ dataSource, ...INPUT });
    const [sql] = dataSource.query.mock.calls[0];
    expect(sql).toContain('UPDATE kpa_members');
    expect(sql).toContain('organization_id IS NULL');
  });

  it('slug 예약 실패는 비차단 — enrollment 는 이미 수행된 상태로 반환된다', async () => {
    const dataSource = makeDataSource();
    mockSlug.generateUniqueSlug.mockRejectedValue(new Error('slug boom'));

    const result = await ensureKpaStoreOrganization({ dataSource, ...INPUT });

    expect(result.slugError).toBe('slug boom');
    expect(result.organizationId).toBe('org-1');
    expect(mockOrgOps.enrollService).toHaveBeenCalledTimes(1);
  });

  it('slug 는 매장 URL 축 — enrollment 와 다른 키를 쓴다', async () => {
    const dataSource = makeDataSource();
    await ensureKpaStoreOrganization({ dataSource, ...INPUT });
    expect(mockSlug.reserveSlug).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'org-1', serviceKey: 'kpa' }),
    );
  });
});
