/**
 * WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1 §16
 *
 * PharmacyHub 가 KPA canonical Tablet 모델을 **같은 계약으로** 채택했는지 회귀 고정한다.
 *
 *   §2 corner_legacy_all 암묵적 fallback 폐기
 *   §3 PH 가 공통 운영 Core(TabletCornerBoard / SwapDialog)를 채택
 *   §6 PH public kiosk route — 신규 renderer·API 0
 *   §7 서비스 격리 — PH 셸이 자기 서비스 매장만 렌더
 *
 * DB 는 붙이지 않는다 — 소스 정적 검사.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const PH_TABLETS_PAGE = 'services/web-pharmacy-hub/src/pages/store-owner/TabletsPage.tsx';
const PH_KIOSK_PAGE = 'services/web-pharmacy-hub/src/pages/tablet/TabletStorePage.tsx';
const PH_PUBLIC_API = 'services/web-pharmacy-hub/src/lib/api/publicTablet.ts';
const PH_APP = 'services/web-pharmacy-hub/src/App.tsx';
const PH_TABLET_API = 'services/web-pharmacy-hub/src/lib/api/pharmacyHubTablet.ts';
const KPA_PAGE = 'services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx';
const CORE_INDEX = 'packages/tablet-screen-set-editor/src/index.tsx';
const CORE_BOARD = 'packages/tablet-screen-set-editor/src/TabletCornerBoard.tsx';
const CORE_SWAP = 'packages/tablet-screen-set-editor/src/TabletScreenSetSwapDialog.tsx';
const PRODUCT_LIST_RESOLVE = 'apps/api-server/src/routes/platform/store-public/store-public-product-list-resolve.ts';
const PUBLIC_RESOLVE = 'apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts';
const PUBLIC_TABLET_HANDLER = 'apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts';
const STORE_TABLET_ROUTES = 'apps/api-server/src/routes/platform/store-tablet.routes.ts';

// ─────────────────────────────────────────────────────────────────────────────
// §2 암묵적 매장 전체 fallback 폐기
// ─────────────────────────────────────────────────────────────────────────────

describe('§2 진열 0행 = 상품 0 — 암묵적 전체상품 fallback 폐기', () => {
  it('resolver 에 configured=false(매장 전체) 경로가 없다', () => {
    const src = stripComments(read(PRODUCT_LIST_RESOLVE));
    expect(src).not.toContain('configured: false');
    expect(src).not.toContain("'corner_legacy_all'");
  });

  it.each([
    ['공개 resolver', PUBLIC_RESOLVE, '!effectiveTablet || !effectiveTablet.configured'],
    ['preview', STORE_TABLET_ROUTES, '!previewTablet || !previewTablet.configured'],
  ])('%s: 코너 미확정 **또는 진열 0행** 이면 상품 0건', (_l, path, condition) => {
    const src = stripComments(read(path));
    expect(src).toContain(condition);
    expect(src).toContain('EMPTY_PRODUCT_LIST_SECTION');
  });

  it("kiosk 는 'none'(0건)도 서버 확정으로 신뢰한다 (클라이언트 fallback 부활 금지)", () => {
    const src = stripComments(read('packages/tablet-kiosk-core/src/TabletKioskPage.tsx'));
    expect(src).toContain("mode !== 'selected' && mode !== 'corner_display' && mode !== 'none'");
    // 섹션 자체가 없을 때만 자체 조회로 남는다.
    expect(src).toContain('if (!section) return null;');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3 공통 운영 Core 채택
// ─────────────────────────────────────────────────────────────────────────────

describe('§3 PH 가 공통 운영 Core 를 채택한다', () => {
  it('PH 가 TabletCornerBoard 와 교체 다이얼로그를 공통 패키지에서 가져온다', () => {
    const src = stripComments(read(PH_TABLETS_PAGE));
    expect(src).toContain('TabletCornerBoard');
    expect(src).toContain('TabletScreenSetSwapDialog');
    expect(src).toContain("from '@o4o/tablet-screen-set-editor'");
  });

  it('KPA 도 같은 Core 를 쓴다 — 두 서비스가 같은 컴포넌트를 소비한다', () => {
    expect(stripComments(read(KPA_PAGE))).toContain('TabletCornerBoard');
  });

  it('PH 전용 코너 목록 구현이 남아 있지 않다 (중복 제거)', () => {
    const src = stripComments(read(PH_TABLETS_PAGE));
    // 과거 인라인 목록의 표식: 적용 select + "미적용" 배지.
    expect(src).not.toContain('화면 세트 적용`}');
    expect(src).not.toContain('— 적용 안 함 —');
    expect(src).not.toContain('미적용');
  });

  it('공통 Core 에 서비스 조건문이 없다 (§6 Core/Adapter 경계)', () => {
    for (const p of [CORE_BOARD, CORE_SWAP]) {
      const src = stripComments(read(p));
      expect(src).not.toContain('pharmacy-hub');
      expect(src).not.toContain('kpa-society');
      expect(src).not.toMatch(/serviceKey/);
      // Core 는 fetch·라우터를 모른다.
      expect(src).not.toContain('fetch(');
      expect(src).not.toContain('react-router');
    }
  });

  it('Core 가 두 컴포넌트를 모두 export 한다', () => {
    const src = read(CORE_INDEX);
    expect(src).toContain('TabletCornerBoard');
    expect(src).toContain('TabletScreenSetSwapDialog');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6 PH public kiosk
// ─────────────────────────────────────────────────────────────────────────────

describe('§6 PH public kiosk route', () => {
  it('PH 에 /tablet/:slug 공개 route 가 있다 (최대 adoption gap 해소)', () => {
    expect(read(PH_APP)).toContain('<Route path="/tablet/:slug" element={<TabletStorePage />} />');
  });

  it('신규 renderer 를 만들지 않고 공통 kiosk core 를 쓴다', () => {
    const src = stripComments(read(PH_KIOSK_PAGE));
    expect(src).toContain("from '@o4o/tablet-kiosk-core'");
    expect(src).toContain('<TabletKioskPage');
  });

  it('신규 공개 API 를 만들지 않고 공통 service-neutral endpoint 를 쓴다', () => {
    const src = stripComments(read(PH_PUBLIC_API));
    expect(src).toContain('/api/v1/stores');
    // PH 전용 공개 태블릿 endpoint 를 만들지 않는다.
    expect(src).not.toContain('/pharmacy-hub/public/tablet');
  });

  it('tabletId 있음/없음 계약이 KPA 와 같다 (없으면 first_active)', () => {
    const src = stripComments(read('services/web-pharmacy-hub/src/lib/tabletKioskUrl.ts'));
    expect(src).toContain('/tablet/');
    expect(src).toContain('tabletId=');
    // slug 가 없으면 URL 을 만들지 않는다(잘못된 주소 노출 방지).
    expect(src).toContain("if (!storeSlug) return '';");
  });

  it('실행 주소용 매장 slug 는 공통 라우터에서 얻는다 (서비스 전용 경로 의존 0)', () => {
    expect(stripComments(read(STORE_TABLET_ROUTES))).toContain("router.get('/store-runtime-info'");
    expect(stripComments(read(PH_TABLET_API))).toContain('store-runtime-info');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 서비스 격리
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 서비스 격리 — PH 셸은 자기 서비스 매장만 렌더한다', () => {
  it('공개 응답이 slug 의 serviceKey 를 함께 내려준다 (additive)', () => {
    expect(stripComments(read(PUBLIC_TABLET_HANDLER))).toContain('serviceKey: resolved.serviceKey');
  });

  it('PH kiosk 가 serviceKey 를 확인하고 타 서비스 매장을 거부한다', () => {
    const src = stripComments(read(PH_KIOSK_PAGE));
    expect(src).toContain("const PH_SERVICE_KEY = 'pharmacy-hub'");
    expect(src).toContain('setScope(key === PH_SERVICE_KEY');
    expect(src).toContain("scope !== 'allowed'");
  });

  it('공통 resolver 의 격리를 완화하지 않는다 — 셸은 좁히기만 한다', () => {
    const src = stripComments(read(PH_KIOSK_PAGE));
    // serviceKey 를 쿼리로 밀어넣어 서버 판정을 바꾸지 않는다.
    expect(src).not.toMatch(/serviceKey=/);
  });
});
