/**
 * 매장 경영자용 `/store` 위치 이전 — 정적 계약 (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13)
 *
 * - store.neture.co.kr 에 서비스 지정 매장 화면(`/work/kpa-society/store/*`)을 둔다 — 공통 `/store/*` 와
 *   같은 화면 트리 · 서비스 문맥만 진입한 서비스로 고정(세션 유지).
 * - 옮긴 화면에서도 KPA 앱의 owner-only 권한 동작(`PharmacyOwnerOnlyGuard`)을 보존한다.
 * - `/work/:serviceKey` 업무에서 돌아올 때는 고정 서비스 문맥으로 복원한다.
 * - KPA 앱의 handoff 는 공통 매장 화면을 KPA 서비스 지정 경로로 보낸다(플래그는 기본 꺼짐 그대로).
 * 서비스 경계는 정적 계약으로 고정한다. 실제 라우팅·전달 자료 보존은 web-store Vitest에서 검증한다. DB · 네트워크 0.
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

  it('매장 업무 화면은 승인 직원에게도 제공하고 구성원 관리는 Owner 전용이다', () => {
    for (const p of ['my-products', 'handled-products', 'commerce/local-products', 'products/multilingual/:targetKind/:targetId']) {
      const route = norm(app).split(`<Route path="${p}"`)[1]?.split('/>')[0];
      expect(route).toBeDefined();
      expect(route).not.toContain('<StoreOwnerOnly>');
    }
    expect(norm(app)).toContain('<Route path="members" element={<StoreOwnerOnly><StoreMembersPage /></StoreOwnerOnly>} />');
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
    expect(norm(app)).toContain('<Route path={`${W}/kpa-society/store`} element={gated(<ServiceStoreLayout />)}>');
    // K-Cosmetics 는 서비스 종료 — /work/k-cosmetics/* 전체가 종료 안내 하나다(WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1).
    expect(norm(app)).toContain('<Route path={`${W}/k-cosmetics/*`} element={KcosRetired} />');
    expect(layout).toContain('toServiceScopedStorePath(scopedServiceKey, `${pathname}${search}${hash}`)');
    // QR 제작 자료 등 location.state도 서비스 지정 경로로 보존한다.
    expect(layout).toContain('const { pathname, search, hash, state } = useLocation();');
    expect(layout).toContain('<Navigate to={scopedPath} state={state} replace />');
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

describe('K-Cosmetics 매장 화면 이전(§21-15) 은퇴 — WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1', () => {
  const app = read('services/web-store/src/App.tsx');
  const layout = read('services/web-store/src/components/layouts/UnifiedStoreLayout.tsx');
  const svc = read('services/web-store/src/lib/serviceContext.ts');

  it('이식 트리(services/kcos)는 삭제됐다', () => {
    expect(fs.existsSync(path.join(REPO, 'services/web-store/src/services/kcos'))).toBe(false);
    expect(app).not.toMatch(/from '\.\/services\/kcos\//);
  });

  it('k-cosmetics 는 더 이상 web-store 의 서비스 문맥이 아니다', () => {
    expect(svc).toContain("export type UnifiedServiceKey = 'kpa-society';");
    expect(layout).not.toContain("'k-cosmetics':");
    expect(app).not.toContain('KCOS_STORE_INFO_ROLES');
  });

  it('종료 서비스만 가입된 매장은 /store · /hub 에서 KPA 기본 문맥으로 떨어지지 않고 종료 안내를 받는다', () => {
    // 종료 서비스는 catalog 에서 workspaceAvailable=false 로 내려온다 — active 가입 기준으로 판정해야 KPA 기본 문맥으로 새지 않는다.
    expect(svc).toContain('export function hasOnlyRetiredWorkspaces(');
    expect(svc).toContain("const active = services.filter((s) => s.enrollmentStatus === 'active');");
    expect(svc).toContain('!active.some((s) => s.workspaceAvailable && isUnifiedServiceKey(s.serviceKey))');
    expect(layout).toContain('return !effectiveServiceKey && hasOnlyRetiredWorkspaces(services);');
    expect(layout).toContain('data-testid="store-retired-service"');
    expect(layout).toContain('if (useRetiredOnlyStore()) return <RetiredServiceNotice />;');
    // 옛 HUB는 자료함·공급 화면으로 이동하며 자료함도 종료 서비스 판정을 유지한다.
    expect(read('services/web-store/src/components/layouts/UnifiedStoreLibraryLayout.tsx')).toContain('if (retiredOnly) return <RetiredServiceNotice />;');
    expect(read('services/web-store/src/config/workspace.ts')).not.toContain("key: 'store-hub'");
    // 대표 루트는 소개 없이 위의 종료 판정을 유지하는 실제 내 매장 화면으로 이동한다.
    expect(read('services/web-store/src/pages/HomePage.tsx')).toContain('to={WORKSPACE_PATHS.myStore}');
  });
});

describe('옛 주소 전환 범위 — HUB는 기능별 이전, 공개·기기 경로는 보존', () => {
  const kpa = read('services/web-kpa-society/src/App.tsx');

  /** 한 줄 또는 여러 줄에 걸친 <Route path=P ...> 선언의 element 영역 */
  const routeDecl = (src: string, pathAttr: string) => {
    const i = src.indexOf(pathAttr);
    expect(i).toBeGreaterThan(-1);
    const open = src.lastIndexOf('<Route', i);
    const end = src.indexOf('>\n', src.indexOf('element=', open));
    return src.slice(open, end + 1);
  };

  it('옛 HUB는 가입 상태를 목적지에서 판정하며 내 매장 기능으로 항상 이전한다', () => {
    expect(kpa).toContain('<Route path="/store-hub/*" element={<KpaUnifiedStoreHandoff />} />');
    expect(kpa).toContain("'/store/pharmacy/supply'");
    expect(kpa).toContain('`/store/library/${resource}`');
  });

  // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 옛 KPA guard · 로컬 매장 화면은 제거됐다.
  it('내 매장 handoff 앞에 옛 KPA guard · 로컬 매장 layout 이 없다', () => {
    expect(kpa).toContain('<Route path="/store/*" element={<KpaUnifiedStoreHandoff />} />');
    expect(kpa).not.toContain('PharmacyGuard');
    expect(kpa).not.toContain('KpaStoreLayoutWrapper');
    expect(kpa).not.toContain('KpaStoreWorkspaceWrapper');
  });

  it('공개 · 기기 경로는 /store gate 밖의 최상위 절대 경로로 선언돼 있다', () => {
    // 송출(/store/marketing/signage/play/:id)은 로컬 route 없이 handoff 가 공통 최상위 route 로 보낸다(unifiedStoreScope).
    for (const p of ['/store/:slug/products/:id', '/store/:slug/blog', '/store/:slug/blog/:postSlug',
      '/qr/:slug', '/tablet/:slug', '/tablet/setup', '/multilingual-products/:publicKey', '/foreign-visitor/affiliate/:shortCode']) {
      const decl = routeDecl(kpa, `path="${p}"`);
      expect(decl).not.toContain('UnifiedStoreHandoff');
    }
  });
});

describe('KPA 앱 — 매장 handoff는 서비스 경로로, 활성화 flag 없음', () => {
  const kpa = read('services/web-kpa-society/src/App.tsx');
  it('handoff api 는 toKpaScopedStorePath 를 거친다', () => {
    expect(kpa).toContain('const scopedPath = toKpaScopedStorePath(returnPath);');
    expect(kpa).toContain('kpaStoreServicesApi.resolveWorkspaceEntryUrl(scopedPath)');
    // D7: 활성화 flag 는 읽지 않는다 — handoff 는 무조건이다.
    expect(kpa).not.toContain('isUnifiedStoreHandoffEnabled');
  });
  it('배포 workflow 에 더 이상 쓰지 않는 handoff 활성화 build 입력이 없다', () => {
    const deployment = read('.github/workflows/deploy-web-services.yml');
    expect(deployment).not.toContain('VITE_UNIFIED_STORE_HANDOFF');
  });
});

describe('K-Cosmetics 공개 서비스 종료 — store 호스트는 종료된 호스트로 보내지 않는다', () => {
  // WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1 (Codex P1 수용 · B안)
  const app = read('services/web-store/src/App.tsx');
  const svc = read('services/web-store/src/lib/serviceContext.ts');
  it('K-Cosmetics 업무 · 매장 · 송출 경로는 하나의 종료 안내 catch-all 이다', () => {
    expect(norm(app)).toContain('<Route path={`${W}/k-cosmetics/*`} element={KcosRetired} />');
    expect(app).not.toMatch(/k-cosmetics[^\n]*element=\{gated\(/);
  });
  it('서비스 공개 origin 은 종료 호스트를 돌려줄 수 없고, 이용 방법(/guide/*) 이동 경로는 남아 있지 않다', () => {
    // UnifiedServiceKey 에서 k-cosmetics 가 빠져 getActiveServicePublicOrigin() 이 종료 호스트를 돌려줄 수 없다 (WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1).
    expect(svc).not.toMatch(/k-cosmetics\.site|retail\.neture\.co\.kr/);
    // pharmacy 가이드 화면 제거(WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7)로 GuideBackLink · /guide/* 이동도 제거됐다.
    expect(app).not.toContain('ServiceGuideRedirect');
    expect(app).not.toContain('path="/guide/*"');
  });
  it('종료 안내는 약국 화면으로 redirect 하지 않는다', () => {
    const notice = app.slice(app.indexOf('const KcosRetired'), app.indexOf('const S = '));
    expect(notice).not.toMatch(/Navigate|kpa-society|pharmacy/);
  });
});
