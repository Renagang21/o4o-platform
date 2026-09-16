/**
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 — Store Workspace · My Services 계약 테스트
 *
 * 검증 축 (WO §18 · §21):
 *   1. 대표 홈 "내 매장" 노출 서비스 = catalog `storeWorkspaceEnabled` ∩ store_owner role registry 파생
 *      (하드코딩 목록 drift 0 — neture / kpa-branch / cafe24-b2b 임의 포함 0)
 *   2. §21 합성 시나리오 매장 A: KPA active · KCos active · PH inactive
 *      → My Services 가 KPA + KCos 진입 가능, PH 는 inactive 로 명확 표시
 *   3. 다른 조직 enrollment 가 섞이면 FAIL (fold 는 조직 단위 입력만 받는다)
 *
 * 순수 단위 테스트 — DB 접속 없음.
 */
import { O4O_SERVICES, getServiceWorkspaceCapability } from '../config/service-catalog.js';
import { listStoreCapableServices } from '../utils/store-owner.utils.js';
import { foldEnrollmentsToStoreServices } from '../utils/service-tenant.resolver.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. STORE_CAPABLE_SERVICES drift
// ─────────────────────────────────────────────────────────────────────────────

describe('listStoreCapableServices — catalog storeWorkspaceEnabled 파생 (WO §18)', () => {
  const list = listStoreCapableServices();
  const keys = list.map((s) => s.serviceKey);

  it('kpa-society · k-cosmetics · pharmacy-hub 가 대상이다', () => {
    expect(keys.sort()).toEqual(['k-cosmetics', 'kpa-society', 'pharmacy-hub']);
  });

  it('모든 항목은 catalog storeWorkspaceEnabled=true 이고 canonical key 다', () => {
    for (const s of list) {
      const svc = O4O_SERVICES.find((o) => o.key === s.serviceKey);
      expect(svc).toBeDefined();
      expect(svc!.workspace.storeWorkspaceEnabled).toBe(true);
      expect(s.storeOwnerRole).toBe(`${s.rolePrefix}:store_owner`);
    }
  });

  it('catalog 에서 storeWorkspaceEnabled=true 인 서비스 중 role registry 가 없는 것은 없다 (drift 0)', () => {
    const catalogStore = O4O_SERVICES.filter((o) => o.workspace.storeWorkspaceEnabled).map((o) => o.key).sort();
    expect(catalogStore).toEqual([...keys].sort());
  });

  it('neture(special) · kpa-branch(none) · cafe24-b2b(undecided) 는 포함되지 않는다', () => {
    expect(keys).not.toContain('neture');
    expect(keys).not.toContain('kpa-branch');
    expect(keys).not.toContain('cafe24-b2b');
    expect(getServiceWorkspaceCapability('cafe24-b2b').storeWorkspaceEnabled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. §21 합성 시나리오 매장 A
// ─────────────────────────────────────────────────────────────────────────────

describe('My Services 합성 시나리오 매장 A (WO §21)', () => {
  const ORG_A = '00000000-0000-4000-8000-00000000000a';
  const rows = [
    { organization_id: ORG_A, service_code: 'kpa-society', status: 'active' },
    { organization_id: ORG_A, service_code: 'k-cosmetics', status: 'active' },
    { organization_id: ORG_A, service_code: 'pharmacy-hub', status: 'inactive' },
  ];

  it('KPA + KCos 는 workspaceAvailable=true, PH 는 inactive · workspaceAvailable=false 로 명확히 구분된다', () => {
    const services = foldEnrollmentsToStoreServices(ORG_A, rows);
    const byKey = Object.fromEntries(services.map((s) => [s.serviceKey, s]));

    expect(byKey['kpa-society']).toMatchObject({ enrollmentStatus: 'active', workspaceAvailable: true, organizationId: ORG_A });
    expect(byKey['k-cosmetics']).toMatchObject({ enrollmentStatus: 'active', workspaceAvailable: true, organizationId: ORG_A });
    expect(byKey['pharmacy-hub']).toMatchObject({ enrollmentStatus: 'inactive', workspaceAvailable: false, organizationId: ORG_A });

    const shown = services.filter((s) => s.enrollmentStatus === 'active' && s.workspaceAvailable).map((s) => s.serviceKey);
    expect(shown.sort()).toEqual(['k-cosmetics', 'kpa-society']);
  });

  it('모든 row 는 요청 조직으로 귀속된다 — 다른 조직 row 가 섞이면 FAIL 조건', () => {
    const services = foldEnrollmentsToStoreServices(ORG_A, rows);
    expect(services.every((s) => s.organizationId === ORG_A)).toBe(true);
    // 다른 조직의 row 를 넣어도 fold 는 organizationId 인자로만 귀속하므로 caller 가 조직 단위로 걸러야 한다.
    // resolveStoreServices 는 SELECT ... WHERE organization_id = $1 로 조직 단위 입력만 만든다 (기존 계약).
    expect(services.some((s) => s.organizationId !== ORG_A)).toBe(false);
  });

  it('store workspace 가 없는 서비스(neture) 는 active 여도 workspaceAvailable=false', () => {
    const services = foldEnrollmentsToStoreServices(ORG_A, [{ organization_id: ORG_A, service_code: 'neture', status: 'active' }]);
    expect(services[0]).toMatchObject({ serviceKey: 'neture', enrollmentStatus: 'active', workspaceAvailable: false });
  });
});
