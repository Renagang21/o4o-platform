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
    expect(svc).toContain("SERVICE_SCOPED_STORE_KEYS: readonly UnifiedServiceKey[] = ['kpa-society', 'k-cosmetics']");
    expect(norm(app)).toContain('<Route path={`${W}/kpa-society/store`} element={gated(<ServiceStoreLayout />)}>');
    // K-Cosmetics 는 공개 서비스 종료 — mount 위치는 종료 안내를 보여 준다(WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1).
    expect(norm(app)).toContain('<Route path={`${W}/k-cosmetics/store`} element={KcosRetired}>');
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
    // 상단 nav 로그인도 보존(§21-19 운영 실측 발견)
    expect(read('services/web-store/src/components/RootShell.tsx')).toContain('<Link to={withReturnTo(WORKSPACE_PATHS.login, `${pathname}${search}${hash}`)}>로그인</Link>');
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

describe('K-Cosmetics 매장 화면 이전 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-15', () => {
  const app = read('services/web-store/src/App.tsx');
  const layout = read('services/web-store/src/components/layouts/UnifiedStoreLayout.tsx');
  // 원본 앱(services/web-k-cosmetics) 은 퇴역 삭제됐다(WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1) —
  //   원본 대조 · 원본 handoff 계약은 함께 제거. 이식 트리(web-store kcos)는 다음 단계에서 제거한다.
  const K = 'services/web-store/src/services/kcos/';

  it('서비스 업무 화면은 중복 이식하지 않고 /work/k-cosmetics 로 보낸다', () => {
    const n = norm(app);
    for (const [from, to] of [['commerce/products', 'commerce/products'], ['commerce/orders', 'commerce/orders'], ['commerce/billing', 'commerce/billing'], ['interest-requests', 'interest-requests']]) {
      expect(n).toContain(`<Route path="${from}" element={<Navigate to={\`\${W}/k-cosmetics/${to}\`} replace />} />`);
    }
  });

  it('권한: 트리 전체 매장 경영자 게이트(원본 StoreOwnerGuard) · info 는 operator 제외(원본 RoleGuard)', () => {
    expect(layout).toContain("'k-cosmetics': { menu: COSMETICS_STORE_CONFIG, ownerOnly: true }");
    expect(layout).toContain("'kpa-society': { menu: UNIFIED_STORE_CONFIG, ownerOnly: false }");
    expect(app).toContain("KCOS_STORE_INFO_ROLES = ['cosmetics:store_owner', 'cosmetics:admin', 'platform:super_admin']");
    expect(norm(app)).toContain('<Route path="info" element={<ServiceRoleOnly serviceKey="k-cosmetics" roles={KCOS_STORE_INFO_ROLES}><KcosStoreInfoPage /></ServiceRoleOnly>} />');
  });

  it('이식 화면은 web-store 의 단일 client · 인증을 쓴다(선택 매장 헤더 공유)', () => {
    expect(read(`${K}lib/apiClient.ts`)).toContain("export { API_BASE_URL, authClient, api } from '../../../lib/apiClient';");
    expect(read(`${K}contexts/AuthContext.tsx`)).toContain("export { useAuth, getAccessToken } from '../../../contexts/AuthContext';");
  });

  it('홈(cockpit)은 통합 매장 선택과 같은 매장만 보여 준다', () => {
    const cockpit = read(`${K}pages/operator/StoreCockpitPage.tsx`);
    expect(cockpit).toContain('?.filter((s) => s.organization_id === organizationId) ?? []');
    expect(cockpit).not.toMatch(/to="\/operator\//);
    expect(cockpit).not.toMatch(/(actionTo|moreTo)="\/operator\//);
  });

  it('store 호스트에서 열리지 않는 경로를 쓰지 않는다(공개 태블릿 · /store-hub · 송출)', () => {
    const settings = read(`${K}pages/store/StoreSettingsPage.tsx`);
    expect(settings).not.toContain('`/tablet/');
    expect((settings.match(/\$\{KCOS_PUBLIC_ORIGIN\}\/tablet\//g) ?? []).length).toBe(3);
    expect(read(`${K}pages/store/StoreSignagePage.tsx`)).toContain("navigate('/hub/signage')");
    expect(read(`${K}pages/store/StoreChannelsPage.tsx`)).toContain("hubB2b: '/hub/b2b'");
    expect(read(`${K}pages/store/signage/SignagePlayerSelectPage.tsx`)).toContain('playPathPrefix="/work/k-cosmetics/store/marketing/signage/play"');
    expect(norm(app)).toContain('<Route path={`${W}/k-cosmetics/store/marketing/signage/play/:playlistId`} element={KcosRetired} />');
    expect(app).toContain('<Route path="/guide/*" element={<ServiceGuideRedirect />} />');
  });
});

describe('옛 주소 전환 범위 — 서비스 Hub · 공개 · 기기 경로는 handoff 하지 않는다(§21-18 · §21-19)', () => {
  const kpa = read('services/web-kpa-society/src/App.tsx');

  /** 한 줄 또는 여러 줄에 걸친 <Route path=P ...> 선언의 element 영역 */
  const routeDecl = (src: string, pathAttr: string) => {
    const i = src.indexOf(pathAttr);
    expect(i).toBeGreaterThan(-1);
    const open = src.lastIndexOf('<Route', i);
    const end = src.indexOf('>\n', src.indexOf('element=', open));
    return src.slice(open, end + 1);
  };

  it('서비스 Hub(/store-hub)는 handoff gate 밖', () => {
    expect(routeDecl(kpa, 'path="/store-hub" element=')).not.toContain('UnifiedStoreHandoff');
  });

  it('매장 경영자 /store 와 workspace/services 는 여전히 handoff gate 안(플래그로만 동작)', () => {
    expect(kpa).toContain('<Route path="/store" element={<PharmacyGuard><KpaUnifiedStoreHandoff><KpaStoreLayoutWrapper /></KpaUnifiedStoreHandoff></PharmacyGuard>}>');
    expect(kpa).toContain('<Route element={<PharmacyGuard><KpaUnifiedStoreHandoff><KpaStoreWorkspaceWrapper /></KpaUnifiedStoreHandoff></PharmacyGuard>}>');
    expect((kpa.match(/<KpaUnifiedStoreHandoff>/g) ?? []).length).toBe(2);
  });

  it('공개 · 기기 경로는 /store gate 밖의 최상위 절대 경로로 선언돼 있다', () => {
    for (const p of ['/store/marketing/signage/play/:playlistId', '/store/:slug/products/:id', '/store/:slug/blog', '/store/:slug/blog/:postSlug',
      '/qr/:slug', '/tablet/:slug', '/tablet/setup', '/multilingual-products/:publicKey', '/foreign-visitor/affiliate/:shortCode']) {
      const decl = routeDecl(kpa, `path="${p}"`);
      expect(decl).not.toContain('UnifiedStoreHandoff');
    }
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

describe('K-Cosmetics 공개 서비스 종료 — store 호스트는 종료된 호스트로 보내지 않는다', () => {
  // WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1 (Codex P1 수용 · B안)
  const app = read('services/web-store/src/App.tsx');
  it('K-Cosmetics 업무 · 매장 · 송출 mount 는 종료 안내만 보여 준다', () => {
    expect(norm(app)).toContain('<Route path={`${W}/k-cosmetics`} element={KcosRetired}>');
    expect(norm(app)).toContain('<Route path={`${W}/k-cosmetics/store`} element={KcosRetired}>');
    expect(app).not.toMatch(/k-cosmetics[^\n]*element=\{gated\(/);
  });
  it('이용 방법 이동은 K-Cosmetics 문맥에서 공개 사이트로 replace 하지 않는다', () => {
    expect(app).toContain("const retired = getActiveServiceKey() === 'k-cosmetics';");
    expect(app).toContain('if (!retired) window.location.replace(');
  });
  it('종료 안내는 약국 화면으로 redirect 하지 않는다', () => {
    const notice = app.slice(app.indexOf('const KcosRetired'), app.indexOf('const S = '));
    expect(notice).not.toMatch(/Navigate|kpa-society|pharmacy/);
  });
});
