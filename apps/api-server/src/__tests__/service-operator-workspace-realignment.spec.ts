/**
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 — 표준 Service Operator 최상위 IA · 다중 서비스 운영자 · 수신함 계약 테스트
 *
 * 검증 축 (WO §14 · §21 · §28):
 *   1. 표준 IA = 서비스 운영 / 사업 운영 / 운영 관리 (구 커뮤니티 운영 / 매장 HUB 운영 / 운영 공통 = RETIRED)
 *   2. 메뉴 항목(route) 단위 도메인 분류 — approvals 처럼 섞인 그룹은 item 단위로 나뉜다 (KPA · K-Cos · PH)
 *   3. 사이드바 · 대시보드 링크 dead link 0 (App.tsx 실 route 대조)
 *   4. 운영자 서비스 목록 = `/work-scope/operator-services` 하나 — 합성 Operator X(KPA + K-Cos): 2건 · PH 미노출 · 누출 0
 *   5. Supplier → Service Operator 수신함: 서비스 경계(serviceKey) 안에서만 읽고, 새 원장 · 상태 기계 없음
 *   6. Neture SPECIAL 자체 IA 보존 · 새 membership 테이블 / role 시스템 0
 *
 * 순수 단위 테스트 — DB 접속 없음 (dataSource.query stub). 프런트 config 는 type-only import 만 가지므로 직접 읽는다.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { resolveOperatorServices } from '../utils/service-tenant.resolver.js';
import { resolveCmsServiceKeys } from '../routes/cms-content/cms-content-utils.js';
import { listSupplierContentHandoffTargets } from '../modules/neture/constants/supplier-content-handoff-targets.js';
import {
  DEFAULT_OPERATOR_DOMAIN_IA,
  DOMAIN_LABELS,
  resolveDomainGroupItems,
} from '../../../../packages/operator-ux-core/src/sidebar/operatorDomainIA';
import {
  defaultOperatorEntryPath,
  selectOperatorServices,
} from '../../../../packages/operator-ux-core/src/service-switcher/createOperatorServicesApi';
import {
  UNIFIED_MENU as NETURE_MENU,
  NETURE_OPERATOR_DOMAIN_IA,
} from '../../../../services/web-neture/src/config/operatorMenuGroups';

const REPO = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(REPO, p), 'utf8');
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

type Menu = typeof NETURE_MENU;

/**
 * WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 표준 IA 의 마지막 앱 소비처였던 KPA 옛 운영 화면
 * (operatorMenuGroups · KpaOperatorDashboard · KpaOperatorLayoutWrapper)은 제거됐다.
 * 항목 단위 도메인 분류 규칙은 서비스와 무관한 고정 fixture 로 검증한다.
 */
const IA_FIXTURE_MENU: Menu = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  approvals: [
    { label: '콘텐츠 승인', path: '/operator/approvals', domain: 'service_operation' },
    { label: '상품 신청', path: '/operator/product-applications' },
  ],
  users: [{ label: '회원', path: '/operator/members' }],
  products: [{ label: '상품', path: '/operator/products' }],
  analytics: [{ label: '분석', path: '/operator/analytics' }],
} as Menu;

/** 항목 path → 도메인 (top-pinned dashboard 제외) */
function placementOf(menu: Menu): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of resolveDomainGroupItems(menu, DEFAULT_OPERATOR_DOMAIN_IA)) {
    for (const item of entry.items) out.set(item.path, entry.domainKey);
  }
  return out;
}

function allPaths(menu: Menu, opts: { includeTopPinned?: boolean } = {}): string[] {
  const out: string[] = [];
  for (const [group, items] of Object.entries(menu)) {
    if (!opts.includeTopPinned && DEFAULT_OPERATOR_DOMAIN_IA.topPinnedGroups.includes(group as any)) continue;
    for (const item of items ?? []) out.push(item.path);
  }
  return out;
}

/** App.tsx(+ routes/*.tsx) 의 `<Route path="…">` 를 모아 operator 하위 경로가 실재하는지 판정 */
function operatorRouteSegments(service: string): Set<string> {
  const files = [`services/${service}/src/App.tsx`];
  const routesDir = resolve(REPO, `services/${service}/src/routes`);
  if (existsSync(routesDir)) {
    for (const f of readdirSync(routesDir)) {
      if (f.endsWith('.tsx')) files.push(`services/${service}/src/routes/${f}`);
    }
  }
  const segs = new Set<string>();
  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/path=["']([^"']+)["']/g)) segs.add(m[1]);
  }
  return segs;
}

function assertRouteExists(service: string, path: string, segs: Set<string>) {
  // '/operator' 자체 · '/operator/x/y' 는 첫 세그먼트 또는 전체가 route 에 있어야 한다
  if (path === '/operator') return;
  const rest = path.replace(/^\/operator\//, '');
  const first = rest.split('/')[0];
  const ok = segs.has(rest) || segs.has(first) || segs.has(`${first}/*`) || segs.has(path) || segs.has(`/operator/${first}`);
  expect({ service, path, ok }).toEqual({ service, path, ok: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 표준 IA
// ─────────────────────────────────────────────────────────────────────────────

describe('표준 Service Operator 최상위 IA (WO §8)', () => {
  it('도메인 = service_operation / business_operation / operations_management, 라벨 = 서비스 운영 / 사업 운영 / 운영 관리', () => {
    expect(DEFAULT_OPERATOR_DOMAIN_IA.displayOrder).toEqual(['service_operation', 'business_operation', 'operations_management']);
    expect(DOMAIN_LABELS.service_operation.label).toBe('서비스 운영');
    expect(DOMAIN_LABELS.business_operation.label).toBe('사업 운영');
    expect(DOMAIN_LABELS.operations_management.label).toBe('운영 관리');
  });

  it('구 IA 키(community / store_hub / common)는 표준 기본값에 없다 (RETIRED)', () => {
    for (const k of ['community', 'store_hub', 'common']) {
      expect(DEFAULT_OPERATOR_DOMAIN_IA.labels).not.toHaveProperty(k);
      expect(DEFAULT_OPERATOR_DOMAIN_IA.displayOrder).not.toContain(k);
    }
    expect(Object.values(DEFAULT_OPERATOR_DOMAIN_IA.groupToDomain)).not.toContain('community');
    expect(Object.values(DEFAULT_OPERATOR_DOMAIN_IA.groupToDomain)).not.toContain('store_hub');
  });

  it('groupOrder 의 모든 그룹은 STANDARD group key 이며 dashboard 는 top-pinned 만이다', () => {
    const groups = new Set(Object.keys(DEFAULT_OPERATOR_DOMAIN_IA.groupToDomain));
    for (const list of Object.values(DEFAULT_OPERATOR_DOMAIN_IA.groupOrder)) {
      for (const g of list) {
        expect(groups.has(g)).toBe(true);
        expect(g).not.toBe('dashboard');
      }
    }
    expect(DEFAULT_OPERATOR_DOMAIN_IA.topPinnedGroups).toEqual(['dashboard']);
  });

  it('OperatorMenuItem.domain 은 additive optional 필드다 (표시 메타데이터)', () => {
    const t = read('packages/ui/src/operator-shell/types.ts');
    expect(t).toMatch(/domain\?: string;/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 항목 단위 분류
// ─────────────────────────────────────────────────────────────────────────────

describe('메뉴 항목(route) 단위 도메인 분류 (WO §9 · §10)', () => {
  const placed = placementOf(IA_FIXTURE_MENU);

  it('approvals 는 item 단위로 나뉜다: 항목 override(service_operation) 우선 · 미지정 항목은 그룹 기본 도메인', () => {
    expect(placed.get('/operator/approvals')).toBe('service_operation');
    expect(placed.get('/operator/product-applications')).toBe('business_operation');
    expect(placed.get('/operator/members')).toBe('service_operation');
    expect(placed.get('/operator/products')).toBe('business_operation');
  });

  it('dashboard 를 제외한 모든 항목이 정확히 한 도메인에 배치된다 (누락 0 · 중복 0)', () => {
    const paths = allPaths(IA_FIXTURE_MENU);
    const all = resolveDomainGroupItems(IA_FIXTURE_MENU, DEFAULT_OPERATOR_DOMAIN_IA).flatMap((e) => e.items.map((i) => i.path));
    expect([...all].sort()).toEqual([...paths].sort());
  });

  it('한 그룹이 두 도메인에 나뉘어도 각 도메인 안에서는 그룹이 한 번만 나타난다', () => {
    const entries = resolveDomainGroupItems(IA_FIXTURE_MENU, DEFAULT_OPERATOR_DOMAIN_IA);
    const seen = new Set<string>();
    for (const e of entries) {
      const id = `${e.domainKey}:${e.groupKey}`;
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(entries.filter((e) => e.groupKey === 'approvals').map((e) => e.domainKey).sort()).toEqual([
      'business_operation',
      'service_operation',
    ]);
  });

  it('DomainIASidebar 는 같은 규칙(resolveDomainGroupItems)을 쓰고 서비스별 if 분기가 없다', () => {
    const c = code('packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx');
    expect(c).toContain('resolveDomainGroupItems(menuItems, domainIAConfig)');
    expect(c).not.toMatch(/serviceKey\s*===/);
    expect(c).not.toMatch(/'kpa-society'|'k-cosmetics'|'pharmacy-hub'|'neture'/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. dead link 0
// ─────────────────────────────────────────────────────────────────────────────

describe('사이드바 · 대시보드 링크 = 실 route (dead link 0)', () => {
  it('KPA 옛 운영 화면(메뉴 · 대시보드 · layout)은 제거됐고 App.tsx 에 /operator 대시보드 route 가 없다 (D7)', () => {
    for (const p of [
      'services/web-pharmacy-business/src/config/operatorMenuGroups.ts',
      'services/web-pharmacy-business/src/pages/operator/KpaOperatorDashboard.tsx',
      'services/web-pharmacy-business/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx',
      'services/web-pharmacy-business/src/routes/OperatorRoutes.tsx',
    ]) {
      expect([p, existsSync(resolve(REPO, p))]).toEqual([p, false]);
    }
    // 옛 진입(/operator · /admin)은 대시보드 없이 사업 운영 화면으로 보내는 호환 이동만 남는다.
    const app = readFileSync(resolve(REPO, 'services/web-pharmacy-business/src/App.tsx'), 'utf8');
    expect(app).not.toContain('OperatorRoutes');
    expect(app).toContain('<Route path="/operator/*" element={<Navigate to="/operator/semi-franchises" replace />} />');
    expect(app).toContain('<Route path="/admin/*" element={<Navigate to="/operator/semi-franchises" replace />} />');
    void operatorRouteSegments;
    void assertRouteExists;
  });

  it('삭제된 화면을 가리키는 외부 진입은 404 대신 현행 화면으로 이동한다 (D7)', () => {
    const app = readFileSync(resolve(REPO, 'services/web-pharmacy-business/src/App.tsx'), 'utf8');
    // 문의 알림 · Neture 문의 화면의 /operator/collaboration-requests → 사업 문의함
    expect(app).toContain('<Route path="/operator/collaboration-requests" element={<Navigate to={`/operator/inbox/business/${BUSINESS_SITE.key}`} replace />} />');
    // 회원 알림 targetUrl '/mypage' · web-store GuideBackLink 의 /guide/*
    expect(app).toContain('<Route path="/mypage/*" element={<Navigate to="/" replace />} />');
    expect(app).toContain('<Route path="/guide/*" element={<Navigate to="/" replace />} />');
    // 인라인 본문 없는 page QR 은 삭제된 /content/:id 로 보내지 않는다
    const qr = readFileSync(resolve(REPO, 'services/web-pharmacy-business/src/pages/qr/QrLandingPage.tsx'), 'utf8');
    expect(qr).not.toContain('navigate(`/content/');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 운영자 서비스 목록 = /work-scope/operator-services — 합성 Operator X
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;
function makeDataSource(responses: Row[][]) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const queue = [...responses];
  const dataSource: any = {
    isInitialized: true,
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return queue.shift() ?? [];
    }),
  };
  return { dataSource, calls };
}

describe('합성 Operator X — KPA + K-Cos 운영자 (WO §21)', () => {
  it('operator-services 는 2건(KPA · K-Cos)이며 PH 는 없다 · 전환 가능은 KPA 뿐(K-Cos 는 운영 종료로 workspaceAvailable=false)', async () => {
    const { dataSource, calls } = makeDataSource([
      [{ role: 'cosmetics:operator' }, { role: 'kpa:operator' }],
      // membership 질의는 catalog 순서(kpa-society → k-cosmetics)
      [{ status: 'active' }],
      [{ status: 'active' }],
    ]);
    const list = await resolveOperatorServices(dataSource, 'operator-x');
    expect(list.map((s) => s.serviceKey)).toEqual(['k-cosmetics', 'kpa-society']);
    expect(list.map((s) => s.serviceKey)).not.toContain('pharmacy-hub');
    expect(calls.slice(1).map((c) => c.params[1])).toEqual(['kpa-society', 'k-cosmetics']);

    const { available, unavailable } = selectOperatorServices(list);
    expect(available.map((s) => s.serviceKey)).toEqual(['kpa-society']);
    expect(unavailable.map((s) => s.serviceKey)).toEqual(['k-cosmetics']);
    for (const s of available) expect(defaultOperatorEntryPath(s)).toBe('/operator');
  });

  it('PH role 이 없으면 PH membership 을 질의조차 하지 않는다 (누출 0)', async () => {
    const { dataSource, calls } = makeDataSource([
      [{ role: 'kpa:operator' }],
      [{ status: 'active' }],
    ]);
    await resolveOperatorServices(dataSource, 'operator-x');
    expect(calls.map((c) => c.params[1]).filter(Boolean)).toEqual(['kpa-society']);
  });

  it('role 은 있으나 membership 이 active 가 아닌 서비스는 목록에 없다 (URL/serviceKey 조작으로 늘어나지 않는다)', async () => {
    const { dataSource } = makeDataSource([
      [{ role: 'kpa:operator' }, { role: 'cosmetics:operator' }],
      [{ status: 'active' }],   // kpa-society
      [{ status: 'pending' }],  // k-cosmetics
    ]);
    const list = await resolveOperatorServices(dataSource, 'operator-x');
    expect(list.map((s) => s.serviceKey)).toEqual(['kpa-society']);
    expect(selectOperatorServices(list).available).toHaveLength(1);
  });

  it('kpa-branch(none) 는 목록에 남되 표준 전환 경로가 없다 · undecided 는 unavailable', () => {
    const rows = [
      { serviceKey: 'kpa-branch', serviceName: '분회', scope: 'operator' as const, workspaceMode: 'none' as const, workspaceAvailable: true },
      { serviceKey: 'cafe24-b2b', serviceName: 'Cafe24', scope: 'operator' as const, workspaceMode: 'undecided' as const, workspaceAvailable: false },
      { serviceKey: 'neture', serviceName: 'Neture', scope: 'admin' as const, workspaceMode: 'special' as const, workspaceAvailable: true },
    ];
    const sel = selectOperatorServices(rows);
    expect(sel.available.map((s) => s.serviceKey)).toEqual(['kpa-branch', 'neture']);
    expect(sel.unavailable.map((s) => s.serviceKey)).toEqual(['cafe24-b2b']);
    expect(defaultOperatorEntryPath(rows[0])).toBeNull();
    expect(defaultOperatorEntryPath(rows[2])).toBe('/operator');
  });

  it('전환 바 · 대표 홈은 operator-services 만 읽고 프런트에 서비스 목록 · role 파싱을 하드코딩하지 않는다', () => {
    const switcher = code('packages/operator-ux-core/src/service-switcher/OperatorServiceSwitcher.tsx');
    expect(switcher).not.toMatch(/'kpa-society'|'k-cosmetics'|'pharmacy-hub'/);
    expect(switcher).not.toMatch(/role_assignments|\.roles\b/);
    const api = code('packages/operator-ux-core/src/service-switcher/createOperatorServicesApi.ts');
    expect(api).toContain("'/work-scope/operator-services'");
    expect(api).toContain("'/auth/handoff'");
    const home = code('services/web-neture/src/lib/home-entry.ts');
    expect(home).toContain("api.get('/work-scope/operator-services')");
    expect(home).not.toContain('ROLE_PREFIX_TO_SERVICE');
    expect(home).not.toContain('OPERATOR_OR_ABOVE_ROLES');
    for (const w of [
      'services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx',
    ]) {
      const c = code(w);
      expect(c).toContain('createOperatorServicesApi(');
      expect(c).toContain('<OperatorServiceSwitcher');
    }
  });

  it('새 membership 테이블 · 새 role 시스템 · migration 이 없다', () => {
    expect(existsSync(resolve(REPO, 'apps/api-server/migrations'))).toBe(true);
    const mig = readdirSync(resolve(REPO, 'apps/api-server/migrations'))
      .filter((f) => /operator[-_]?service|service[-_]?operator/i.test(f));
    expect(mig).toEqual([]);
    const resolver = code('apps/api-server/src/utils/service-tenant.resolver.ts');
    expect(resolver).toContain('role_assignments');
    expect(resolver).not.toMatch(/operator_service_memberships|operator_services\b/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Supplier → Service Operator 수신함
// ─────────────────────────────────────────────────────────────────────────────

describe('Supplier → Service Operator 수신함 (WO §12)', () => {
  it('수신(승인) 화면이 없는 서비스는 제공 대상이 아니다 — 현재 대상 0 (K-Cos · PH 운영 종료, KPA 수신 화면 제거)', () => {
    const targets = listSupplierContentHandoffTargets().map((t) => t.key).sort();
    expect(targets).toEqual([]);
    // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: KPA 옛 /operator/approvals 화면은 제거됐다.
    //   수신 화면을 pharmacy.neture.co.kr 에 새로 만들 때 RECEIVER_UNAVAILABLE 에서 뺀다.
  });

  it('공통 inbox 는 serviceKey 경계 + authorRole=supplier 로만 읽고, 기존 CMS 상태 전이만 호출한다 (새 원장 · workflow 0)', () => {
    const c = code('packages/operator-core-ui/src/modules/supplier-content-inbox/SupplierContentInbox.tsx');
    expect(c).toContain("serviceKey: cmsServiceKey");
    expect(c).toContain("authorRole: 'supplier'");
    expect(c).toContain('/cms/contents/${row.id}/status');
    expect(c).not.toMatch(/handoff_receipts|supplier_handoffs|workflow/i);
  });

  it('제공 측(SupplierContentService.submit) 계약은 그대로다 — KPA 만 kpa_approval_requests, 그 외는 cms 행이 수신함', () => {
    const c = code('apps/api-server/src/routes/kpa/services/supplier-content.service.ts');
    expect(c).toContain("const SERVICE_KEY = 'kpa'");
    expect(c).toContain('withKpaApprovalRequest = serviceKey === SERVICE_KEY');
  });

  it('CMS read 경계는 serviceKey 다 — inbox 가 쓰는 canonical 키는 서버가 alias 까지 접는다 (k-cosmetics → cosmetics 포함)', () => {
    expect(resolveCmsServiceKeys('k-cosmetics').sort()).toEqual(['cosmetics', 'k-cosmetics']);
    expect(resolveCmsServiceKeys('pharmacy-hub')).toEqual(['pharmacy-hub']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Neture SPECIAL 보존
// ─────────────────────────────────────────────────────────────────────────────

describe('Neture SPECIAL — 자체 도메인 IA 보존 (WO §7)', () => {
  it('NETURE_OPERATOR_DOMAIN_IA 는 공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통 을 유지한다', () => {
    expect(NETURE_OPERATOR_DOMAIN_IA.displayOrder).toEqual([
      'supply_distribution',
      'commerce_settlement',
      'community_content',
      'common',
    ]);
    const wrapper = code('services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx');
    // Neture-wide operators retain the IA; collaborator-only operators receive their narrow menu.
    expect(wrapper).toContain('domainIAConfig={scopedOnly ? undefined : NETURE_OPERATOR_DOMAIN_IA}');
  });

  it('Neture 메뉴는 표준 IA 로 강제되지 않는다 (item domain override 없음 · 자체 config 로 전 항목 배치)', () => {
    const paths = allPaths(NETURE_MENU);
    const placed = resolveDomainGroupItems(NETURE_MENU, NETURE_OPERATOR_DOMAIN_IA).flatMap((e) => e.items.map((i) => i.path));
    expect([...placed].sort()).toEqual([...paths].sort());
    for (const items of Object.values(NETURE_MENU)) for (const i of items ?? []) expect((i as any).domain).toBeUndefined();
  });
});
