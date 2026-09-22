/**
 * Unified Store Workspace 진입(handoff) — 순수 규칙 (WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4)
 *
 * 세 서비스(KPA `/store` · KCos `/store` · PH `/store-owner`)의 매장 진입은 cutover 후
 * `store.neture.co.kr` 통합 Store Workspace 로 handoff 된다. 이 파일은
 *   (1) cutover 플래그 해석 — 빌드 시 `VITE_UNIFIED_STORE_HANDOFF` 로 주입, 기본 OFF(기존 화면 그대로)
 *   (2) 서비스별 legacy 경로 → 통합 Workspace 경로 매핑(returnPath)
 * 만 소유한다. 이동 자체는 `UnifiedStoreHandoffGate` 가 `POST /auth/handoff { targetWorkspace: 'store' }` 로 한다.
 *
 * 통합 Workspace 경로 계약(services/web-store):
 *   `/`(홈) · `/store/*`(공통 기능 1회) · `/work/<serviceKey>/*`(서비스 종속) · `/hub/*` · `/services` · `/settings`
 */

export type UnifiedStoreServiceKey = 'kpa-society' | 'k-cosmetics' | 'pharmacy-hub';

/** 빌드 플래그 해석 — 'true' | '1' 만 ON. 미설정·그 외 = OFF (프로덕션 기본은 기존 화면). */
export function isUnifiedStoreHandoffEnabled(raw: unknown): boolean {
  return raw === 'true' || raw === '1' || raw === true;
}

type Rule = [pattern: RegExp, replacement: string];

/** 서비스별 legacy → 통합 경로 규칙. 위에서부터 첫 매치. 마지막 규칙이 fallback. */
const RULES: Record<UnifiedStoreServiceKey, Rule[]> = {
  'kpa-society': [
    [/^\/store\/workspace\/?$/, '/'],
    [/^\/store\/services\/?$/, '/services'],
    [/^\/store-hub(\/.*)?$/, '/hub$1'],
    [/^\/store\/(commerce\/(products|orderable|order-worktable|orders|seller-recruitments|recruitment-applications)|online-sales|sales-channels|channels)(\/.*)?$/, '/work/kpa-society/$1$3'],
    [/^\/store(\/.*)?$/, '/store$1'],
  ],
  'k-cosmetics': [
    [/^\/store\/workspace\/?$/, '/'],
    [/^\/store\/services\/?$/, '/services'],
    [/^\/store-hub(\/.*)?$/, '/hub$1'],
    [/^\/store\/(commerce\/(products|orders|billing)|interest-requests)(\/.*)?$/, '/work/k-cosmetics/$1$3'],
    [/^\/store\/orders(\/.*)?$/, '/work/k-cosmetics/commerce/orders$1'],
    [/^\/store\/billing\/?$/, '/work/k-cosmetics/commerce/billing'],
    [/^\/store\/(channels|sales-channels)(\/.*)?$/, '/work/k-cosmetics'],
    [/^\/store\/local-products\/?$/, '/store/commerce/local-products'],
    [/^\/store\/tablet-displays\/?$/, '/store/commerce/tablet-displays'],
    [/^\/store\/signage(\/.*)?$/, '/store/marketing/signage$1'],
    [/^\/store\/(marketing\/pop\/library|library\/product-descriptions)\/?$/, '/store/marketing/product-descriptions'],
    [/^\/store(\/.*)?$/, '/store$1'],
  ],
  'pharmacy-hub': [
    [/^\/store-owner\/workspace\/?$/, '/'],
    [/^\/store-owner\/services\/?$/, '/services'],
    [/^\/store-owner\/account\/?$/, '/settings'],
    [/^\/store-hub(\/.*)?$/, '/hub$1'],
    [/^\/store-owner\/products\/multilingual(\/.*)$/, '/store/products/multilingual$1'],
    [/^\/store-owner\/multilingual-product-contents\/?$/, '/hub/multilingual-product-contents'],
    [/^\/store-owner\/(products|cart|orders|payment)(\/.*)?$/, '/work/pharmacy-hub/$1$2'],
    [/^\/store-owner\/local-products\/?$/, '/store/commerce/local-products'],
    [/^\/store-owner\/tablets\/?$/, '/store/commerce/tablet-displays'],
    [/^\/store-owner\/library\/resources\/?$/, '/store/library/resources'],
    [/^\/store-owner\/library\/?$/, '/store/library/contents'],
    [/^\/store-owner\/blog(\/.*)?$/, '/store/content/blog'],
    [/^\/store-owner\/(qr|pop|pop-v2|product-descriptions)\/?$/, '/store/marketing/$1'],
    [/^\/store-owner\/signage\/media\/?$/, '/store/marketing/signage/videos'],
    [/^\/store-owner\/signage(\/.*)?$/, '/store/marketing/signage$1'],
    [/^\/store-owner\/(handled-products|content|execution|analytics\/marketing|info)\/?$/, '/store/$1'],
    [/^\/store-owner\/?$/, '/store'],
    [/^\/store-owner(\/.*)?$/, '/store'],
  ],
};

/**
 * legacy 서비스 경로(pathname + search) → 통합 Workspace returnPath.
 * 규칙에 없는 경로는 공통 홈(`/store`)으로 보낸다(데드링크 대신 안전 착지).
 */
export function mapLegacyStorePathToUnified(serviceKey: UnifiedStoreServiceKey, pathname: string, search = ''): string {
  const rules = RULES[serviceKey];
  for (const [pattern, replacement] of rules) {
    if (pattern.test(pathname)) {
      const mapped = pathname.replace(pattern, replacement).replace(/\/+$/, '') || '/';
      return `${mapped}${search}`;
    }
  }
  return `/store${search}`;
}
