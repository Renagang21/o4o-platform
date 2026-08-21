/**
 * 조직 재사용 가드 계약 테스트
 *
 * WO-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1
 *
 * 기존 구현은 후보가 정확히 1개면 **그 조직이 무엇인지 보지 않고** 재사용했다.
 * 이 테스트는 재사용 전 안전성 검사(type / 타 서비스 enrollment / service-neutral 자산)가
 * **두 재사용 경로 모두**에 걸린다는 것을 고정한다.
 *
 * DB 는 붙이지 않는다 — dataSource.query 를 SQL 패턴으로 라우팅해 시나리오를 만든다.
 * (운영 DB 에 위험 fixture 를 만들지 않기 위한 선택이다.)
 */

// jest 는 `@o4o/platform-core/store-identity` 서브패스 export 를 해석하지 못한다
// (jest.config moduleNameMapper 대상이 아니다). 가드 판정은 slug·조직 write 와 무관하므로
// virtual mock 으로 끊어 **판정 로직만** 검사한다.
jest.mock(
  '@o4o/platform-core/store-identity',
  () => ({ StoreSlugService: class { async generateUniqueSlug() { return 'slug'; } async reserveSlug() { return { slug: 'slug' }; } } }),
  { virtual: true },
);
jest.mock('../../../modules/organization/services/organization-ops.service.js', () => ({
  organizationOpsService: {
    addMember: jest.fn(async () => undefined),
    enrollService: jest.fn(async () => undefined),
    ensureOrganizationWithOwnerAndService: jest.fn(async () => ({ id: 'new-org', created: true })),
  },
}));

import { PharmacyHubStoreProvisioningService } from '../PharmacyHubStoreProvisioningService';

const USER = '6967ebe0-2f87-4cab-809b-8c7190493cef';
const ORG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

interface Scenario {
  /** 이미 pharmacy-hub active enrollment 를 가진 조직인가 (멱등 재실행 경로) */
  alreadyPharmacyHub?: boolean;
  /** organization_members 후보 (owner/admin/manager, left_at IS NULL) */
  memberOrgs?: Array<{ id: string; code: string; name: string }>;
  /** businessNumber 로 매칭되는 조직 */
  bnOrgs?: Array<{ id: string; code: string; name: string }>;
  /** organizations 단건 조회 결과 */
  org?: { id: string; code: string; name: string; type: string } | null;
  /** 타 서비스 active enrollment */
  otherEnrollments?: Array<{ service_code: string }>;
  /** service-neutral 자산 건수 (label → n) */
  assetCounts?: Record<string, number>;
  businessInfo?: Record<string, unknown>;
}

function makeService(sc: Scenario) {
  const calls: string[] = [];
  const query = jest.fn(async (sql: string, params?: any[]) => {
    calls.push(sql);
    const s = String(sql);

    if (s.includes('FROM service_memberships')) {
      return [{ role: 'pharmacy-hub:store_owner', status: 'active' }];
    }
    if (s.includes('FROM users')) {
      return [{ id: USER, name: '테스트', email: 't@example.com', businessInfo: sc.businessInfo ?? {} }];
    }
    if (s.includes('FROM organization_members')) return sc.memberOrgs ?? [];
    // 사업자번호 매칭 (regexp_replace 사용) — organizations 단건 조회와 구분한다.
    if (s.includes('FROM organizations') && s.includes('regexp_replace')) return sc.bnOrgs ?? [];
    if (s.includes('FROM organizations') && s.includes('LIMIT 1')) {
      return sc.org === null ? [] : [sc.org ?? { id: ORG, code: 'org-code', name: '조직', type: 'pharmacy' }];
    }
    if (s.includes('FROM organization_service_enrollments')) {
      // service_code = $2 (PH 자체 확인) vs service_code <> $2 (타 서비스 확인)
      if (s.includes('service_code = $2')) return sc.alreadyPharmacyHub ? [{ '?column?': 1 }] : [];
      return sc.otherEnrollments ?? [];
    }
    // service-neutral 자산 카운트 — UNION ALL 로 label/n 을 함께 돌려준다.
    if (s.includes('UNION ALL') && s.includes('count(*)')) {
      const labels = [...s.matchAll(/'([^']+)' AS label/g)].map((m) => m[1]);
      return labels.map((label) => ({ label, n: sc.assetCounts?.[label] ?? 0 }));
    }
    return [];
  });

  const svc = new PharmacyHubStoreProvisioningService({ query } as any);
  return { svc, query, calls };
}

/** dryRun=true 로 호출해 write 없이 판정만 본다. */
const resolve = (sc: Scenario) => makeService(sc).svc.provisionStoreSubject(USER, null, true);

describe('조직 재사용 가드 — Case A~F', () => {
  it('A. 안전한 pharmacy 조직 1개 → 재사용', async () => {
    const r = await resolve({
      memberOrgs: [{ id: ORG, code: 'kpa-pharm-x', name: '안전 약국' }],
      org: { id: ORG, code: 'kpa-pharm-x', name: '안전 약국', type: 'pharmacy' },
      otherEnrollments: [],
      assetCounts: {},
    });
    expect(r.outcome).not.toBe('held');
    expect(r.organizationId).toBe(ORG);
  });

  it('B. type=store 조직 1개 → held ORGANIZATION_TYPE_NOT_COMPATIBLE', async () => {
    const r = await resolve({
      memberOrgs: [{ id: ORG, code: 'KCOS1', name: '테스트 뷰티샵' }],
      org: { id: ORG, code: 'KCOS1', name: '테스트 뷰티샵', type: 'store' },
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('ORGANIZATION_TYPE_NOT_COMPATIBLE');
    expect(r.detail).toContain('store');
  });

  it('B-2. type=supplier 조직도 held (매장이 아니다)', async () => {
    const r = await resolve({
      memberOrgs: [{ id: ORG, code: 'neture-supplier-x', name: '공급자' }],
      org: { id: ORG, code: 'neture-supplier-x', name: '공급자', type: 'supplier' },
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('ORGANIZATION_TYPE_NOT_COMPATIBLE');
  });

  it('C. pharmacy 지만 타 서비스 active enrollment 보유 → held', async () => {
    const r = await resolve({
      memberOrgs: [{ id: ORG, code: 'kpa-pharm-y', name: '겸업 약국' }],
      org: { id: ORG, code: 'kpa-pharm-y', name: '겸업 약국', type: 'pharmacy' },
      otherEnrollments: [{ service_code: 'kpa-society' }],
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('ORGANIZATION_HAS_OTHER_SERVICE_ENROLLMENT');
    expect(r.detail).toContain('kpa-society');
  });

  it('D. pharmacy 지만 service-neutral 자산 보유 → held (건수까지 안내)', async () => {
    const r = await resolve({
      memberOrgs: [{ id: ORG, code: 'kpa-pharm-z', name: '자산 보유 약국' }],
      org: { id: ORG, code: 'kpa-pharm-z', name: '자산 보유 약국', type: 'pharmacy' },
      otherEnrollments: [],
      assetCounts: { QR: 50, '경영활용 제품': 20 },
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS');
    expect(r.detail).toContain('QR 50건');
    expect(r.detail).toContain('경영활용 제품 20건');
  });

  it('D-2. QR 1건만 있어도 held (임계값 없음)', async () => {
    const r = await resolve({
      memberOrgs: [{ id: ORG, code: 'kpa-pharm-q', name: '약국' }],
      org: { id: ORG, code: 'kpa-pharm-q', name: '약국', type: 'pharmacy' },
      assetCounts: { QR: 1 },
    });
    expect(r.holdReason).toBe('ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS');
  });

  it('E. businessNumber 단일 매칭이 비약국이면 held (경로 B 도 같은 가드)', async () => {
    const r = await resolve({
      memberOrgs: [],
      businessInfo: { businessNumber: '108-8699992', businessName: '테스트 사업자' },
      bnOrgs: [{ id: ORG, code: 'KCOSA3DDC841B946', name: '테스트 뷰티샵' }],
      org: { id: ORG, code: 'KCOSA3DDC841B946', name: '테스트 뷰티샵', type: 'store' },
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('ORGANIZATION_TYPE_NOT_COMPATIBLE');
  });

  it('E-2. businessNumber 매칭이 안전한 pharmacy 면 재사용', async () => {
    const r = await resolve({
      memberOrgs: [],
      businessInfo: { businessNumber: '111-11-11111', businessName: '약국' },
      bnOrgs: [{ id: ORG, code: 'kpa-pharm-ok', name: '안전 약국' }],
      org: { id: ORG, code: 'kpa-pharm-ok', name: '안전 약국', type: 'pharmacy' },
      otherEnrollments: [],
      assetCounts: {},
    });
    expect(r.outcome).not.toBe('held');
    expect(r.organizationId).toBe(ORG);
  });

  it('F. 후보 0개 → 신규 생성 경로 (가드 미적용)', async () => {
    const r = await resolve({
      memberOrgs: [],
      bnOrgs: [],
      businessInfo: { businessName: '새 약국' },
    });
    expect(r.outcome).toBe('created');
    expect(r.organizationId).toBeNull();
    expect(r.organizationCode).toBe('ph-pharm-6967ebe02f87');
  });
});

describe('멱등 재실행 — 이미 우리 매장이면 가드 대상이 아니다', () => {
  it('PH active enrollment 가 있으면 자산이 많아도 재사용한다 (noop 경로 보존)', async () => {
    const r = await resolve({
      alreadyPharmacyHub: true,
      memberOrgs: [{ id: ORG, code: 'ph-pharm-x', name: '[E2E_TEST] 검증약국' }],
      org: { id: ORG, code: 'ph-pharm-x', name: '[E2E_TEST] 검증약국', type: 'pharmacy' },
      // 이 자산들은 PH 가 스스로 만든 것이다 — 타 서비스 유입이 아니다.
      assetCounts: { QR: 5, '자료함': 1, '태블릿': 2, '화면 세트': 2 },
    });
    expect(r.outcome).not.toBe('held');
    expect(r.organizationId).toBe(ORG);
  });

  it('PH enrollment 가 없으면 같은 자산 보유가 held 사유가 된다 (대조)', async () => {
    const r = await resolve({
      alreadyPharmacyHub: false,
      memberOrgs: [{ id: ORG, code: 'kpa-pharm-x', name: 'KPA 약국' }],
      org: { id: ORG, code: 'kpa-pharm-x', name: 'KPA 약국', type: 'pharmacy' },
      assetCounts: { QR: 5 },
    });
    expect(r.holdReason).toBe('ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS');
  });
});

describe('기존 held 계약 보존', () => {
  it('후보 2개 이상은 여전히 AMBIGUOUS_ORGANIZATION (가드보다 먼저 판정)', async () => {
    const r = await resolve({
      memberOrgs: [
        { id: ORG, code: 'a', name: 'A' },
        { id: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', code: 'b', name: 'B' },
        { id: 'cccccccc-1111-4111-8111-cccccccccccc', code: 'c', name: 'C' },
      ],
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('AMBIGUOUS_ORGANIZATION');
  });

  it('사업자번호 조직 2개 이상은 여전히 DUPLICATE_BUSINESS_NUMBER', async () => {
    const r = await resolve({
      memberOrgs: [],
      businessInfo: { businessNumber: '222-22-22222', businessName: '약국' },
      bnOrgs: [
        { id: ORG, code: 'a', name: 'A' },
        { id: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', code: 'b', name: 'B' },
      ],
    });
    expect(r.outcome).toBe('held');
    expect(r.holdReason).toBe('DUPLICATE_BUSINESS_NUMBER');
  });

  it('store_owner membership 이 아니면 대상 아님 (skipped)', async () => {
    const { svc } = makeService({});
    (svc as any).dataSource.query = jest.fn(async (sql: string) =>
      String(sql).includes('service_memberships')
        ? [{ role: 'pharmacy-hub:operator', status: 'active' }]
        : [],
    );
    const r = await svc.provisionStoreSubject(USER, null, true);
    expect(r.outcome).toBe('skipped');
  });
});

describe('가드는 읽기만 한다', () => {
  it('held 판정 시 INSERT/UPDATE/DELETE 를 실행하지 않는다', async () => {
    const { svc, calls } = makeService({
      memberOrgs: [{ id: ORG, code: 'KCOS1', name: '뷰티샵' }],
      org: { id: ORG, code: 'KCOS1', name: '뷰티샵', type: 'store' },
    });
    // dryRun=false 로도 held 는 write 전에 끝나야 한다.
    const r = await svc.provisionStoreSubject(USER, null, false);
    expect(r.outcome).toBe('held');
    const writes = calls.filter((s) => /\b(INSERT|UPDATE|DELETE)\b/i.test(s));
    expect(writes).toEqual([]);
  });
});
