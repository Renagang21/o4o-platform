/**
 * 매장 경영자용 `/store` 위치 이전 — 정적 계약 (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13)
 *
 * - store.neture.co.kr 에 서비스 지정 매장 화면(`/work/kpa-society/store/*`)을 둔다 — 공통 `/store/*` 와
 *   같은 화면 트리 · 서비스 문맥만 진입한 서비스로 고정(세션 유지).
 * - 옮긴 화면에서도 KPA 앱의 owner-only 권한 동작(`PharmacyOwnerOnlyGuard`)을 보존한다.
 * - `/work/:serviceKey` 업무에서 돌아올 때는 고정 서비스 문맥으로 복원한다.
 * - KPA 앱의 handoff 는 공통 매장 화면을 KPA 서비스 지정 경로로 보낸다(플래그는 기본 꺼짐 그대로).
 * web-store 는 CI 테스트 러너가 없어 텍스트 계약으로 고정한다. DB · 네트워크 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf-8');
const norm = (s: string) => s.replace(/\s+/g, ' ');

describe('web-store — 서비스 지정 매장 화면', () => {
  const app = read('services/web-store/src/App.tsx');
  const layout = read('services/web-store/src/components/layouts/UnifiedStoreLayout.tsx');
  const work = read('services/web-store/src/components/layouts/ServiceWorkLayout.tsx');
  const ctx = read('services/web-store/src/contexts/StoreContext.tsx');
  const svc = read('services/web-store/src/lib/serviceContext.ts');

  it('/store 와 /work/kpa-society/store 가 같은 화면 트리를 mount 한다', () => {
    expect(norm(app)).toContain('<Route path={S} element={gated(<UnifiedStoreLayout />)}> {storeChildRoutes()}');
    expect(norm(app)).toContain('<Route path={`${W}/kpa-society/store`} element={gated(<ServiceStoreLayout />)}> {storeChildRoutes()}');
  });

  it('owner-only 화면 4개는 StoreOwnerOnly 로 감싼다', () => {
    for (const p of ['my-products', 'handled-products', 'commerce/local-products', 'products/multilingual/:targetKind/:targetId']) {
      expect(norm(app)).toMatch(new RegExp(`<Route path="${p.replace(/[/:]/g, (c) => `\\${c}`)}" element=\\{<StoreOwnerOnly>`));
    }
    expect(svc).toContain('`${short}:store_owner`');
    expect(svc).toContain("'platform:super_admin'");
  });

  it('서비스 고정은 이 매장의 활성 서비스일 때만 · 세션 유지 · 매장 변경 시 해제', () => {
    expect(svc).toContain("SERVICE_SCOPE_STORAGE_KEY = 'o4o.store.serviceScope'");
    expect(svc).toContain('window.sessionStorage');
    expect(norm(svc)).toContain('if (scoped && workServiceKeys.includes(scoped)) return scoped;');
    expect(ctx).toContain('setActiveServiceContext(effectiveServiceKey)');
    // 매장 선택 · 매장 해제 · 계정 변경(§21-14) 세 곳
    expect((ctx.match(/setServiceScope\(null\)/g) ?? []).length).toBe(3);
  });

  it('서비스 업무에서 돌아오면 고정 서비스 문맥으로 복원 · 이용계약 게이트도 같은 문맥', () => {
    expect(work).toContain('restoreServiceKey={effectiveServiceKey}');
    expect(norm(layout)).toContain('<StoreAgreementGate serviceKey={effectiveServiceKey}>');
    expect(layout).toContain('data-testid="service-store-unavailable"');
  });
});

describe('KPA 전환 차단 요인 정리 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14', () => {
  const app = read('services/web-store/src/App.tsx');
  const layout = read('services/web-store/src/components/layouts/UnifiedStoreLayout.tsx');
  const work = read('services/web-store/src/components/layouts/ServiceWorkLayout.tsx');
  const svc = read('services/web-store/src/lib/serviceContext.ts');
  const ctx = read('services/web-store/src/contexts/StoreContext.tsx');
  const gate = read('services/web-store/src/components/StoreGate.tsx');
  const selector = read('services/web-store/src/pages/StoreSelectorPage.tsx');
  const login = read('services/web-store/src/pages/LoginPage.tsx');
  const ret = read('services/web-store/src/lib/returnTo.ts');
  const hdr = read('services/web-store/src/lib/storeOrganizationHeader.ts');
  const main = read('services/web-store/src/main.tsx');

  it('고정 서비스에서 `/store/...` 링크를 따라오면 `/work/<key>/store/...` 로 옮긴다 · mount 목록과 일치', () => {
    expect(svc).toContain("SERVICE_SCOPED_STORE_KEYS: readonly UnifiedServiceKey[] = ['kpa-society']");
    for (const key of ['kpa-society']) {
      expect(norm(app)).toContain(`<Route path={\`\${W}/${key}/store\`} element={gated(<ServiceStoreLayout />)}>`);
    }
    expect(layout).toContain('toServiceScopedStorePath(scopedServiceKey, `${pathname}${search}${hash}`)');
    expect(layout).toContain('<Navigate to={scopedPath} replace />');
  });

  it('다른 서비스 업무로 옮기면 서비스 고정을 푼다', () => {
    expect(norm(work)).toContain('if (valid && scopedServiceKey && scopedServiceKey !== serviceKey) setServiceScope(null);');
  });

  it('계정이 바뀌면 이전 계정의 매장 선택 · 서비스 고정을 버린다', () => {
    expect(ctx).toContain('prevUserIdRef');
    expect(norm(ctx)).toContain('if (prev === undefined || prev === uid) return; clearSelectedOrganizationId(); setSelectedId(null); setServiceScope(null);');
  });

  it('매장 선택 · 로그인 뒤 원래 경로로 돌아온다(같은 앱 경로만)', () => {
    expect(gate).toContain('<Navigate to={withReturnTo(WORKSPACE_PATHS.select, current)} replace />');
    expect(gate).toContain('to={withReturnTo(WORKSPACE_PATHS.login, current)}');
    expect(selector).toContain('navigate(returnTo ?? WORKSPACE_PATHS.home, { replace: true })');
    expect(login).toContain("readReturnTo(useLocation().search) ?? WORKSPACE_PATHS.home");
    expect(ret).toContain("raw.startsWith('//')");
    expect(ret).toContain("!raw.startsWith('/')");
  });

  it('선택 매장을 전용 헤더로 API 요청에 싣는다(X-Organization-Id 재사용 금지)', () => {
    expect(hdr).toContain("STORE_ORGANIZATION_HEADER = 'X-Store-Organization-Id'");
    expect(hdr).not.toMatch(/['"]X-Organization-Id['"]/);
    expect(hdr).toContain('isApiUrl(url)');
    expect(ctx).toContain('setActiveStoreOrganizationId(effectiveId);');
    expect(main).toContain('installStoreOrganizationHeader();');
    expect(read('apps/api-server/src/bootstrap/setup-middlewares.ts')).toContain("'X-Store-Organization-Id'");
  });

  it('KPA 옛 매장 경로는 404 대신 같은 화면으로', () => {
    const n = norm(app);
    expect(n).toContain('<Route path="dashboard" element={<Navigate to={S} replace />} />');
    expect(n).toContain('<Route path="settings/layout" element={<Navigate to={`${S}/info`} replace />} />');
    expect(n).toContain('<Route path="settings/template" element={<Navigate to={`${S}/info`} replace />} />');
    expect(n).toContain('<Route path="products" element={<Navigate to={`${W}/kpa-society/commerce/products`} replace />} />');
    expect(n).toContain('<Route path="products/b2c" element={<Navigate to={`${W}/kpa-society/commerce/products/b2c`} replace />} />');
    expect(n).toContain('<Route path="orders" element={<Navigate to={`${W}/kpa-society/commerce/orders`} replace />} />');
    expect(n).toContain('<Route path="channels/tablet" element={<Navigate to={`${W}/kpa-society/store/requests`} replace />} />');
  });
});

describe('KPA 앱 — 매장 handoff 는 서비스 지정 경로로(플래그 기본 꺼짐 유지)', () => {
  const kpa = read('services/web-kpa-society/src/App.tsx');
  it('handoff api 는 toKpaScopedStorePath 를 거친다', () => {
    expect(kpa).toContain('api={kpaStoreHandoffApi}');
    expect(kpa).toContain('toKpaScopedStorePath(returnPath)');
    expect(kpa).toContain('isUnifiedStoreHandoffEnabled(import.meta.env.VITE_UNIFIED_STORE_HANDOFF)');
  });
  it("배포 workflow 의 플래그는 여전히 'false'", () => {
    expect(read('.github/workflows/deploy-web-services.yml')).toContain("VITE_UNIFIED_STORE_HANDOFF: 'false'");
  });
});
