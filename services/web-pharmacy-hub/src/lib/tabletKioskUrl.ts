/**
 * PharmacyHub 태블릿 공개 실행(kiosk) URL
 *
 * WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1 §6
 *
 * canonical 계약 (KPA 와 **같은 의미**):
 *   store slug + optional tabletId → 그 매장의 태블릿 runtime
 *     tabletId 있음 → 그 태블릿(코너)
 *     tabletId 없음 → first_active compatibility (서버가 결정)
 *
 * 경로는 PH 의 기존 공개 routing 구조에 맞춰 `/tablet/:slug` 를 쓴다
 * (KPA 와 같은 shape — 서비스마다 오리진이 다르므로 URL 충돌이 없다).
 */

/** 실행 주소의 오리진. 배포 환경에서 PH 웹 오리진을 주입하고, 없으면 현재 오리진. */
function kioskOrigin(): string {
  const injected = import.meta.env.VITE_PHARMACY_HUB_WEB_ORIGIN as string | undefined;
  return injected || window.location.origin;
}

/**
 * @param storeSlug `GET /pharmacy-hub/store-owner/store-runtime-info` 의 slug. 없으면 URL 을 만들 수 없다.
 * @param tabletId  코너 태블릿. 생략하면 first_active 로 열린다.
 */
export function buildPharmacyHubKioskUrl(storeSlug: string | null, tabletId?: string | null): string {
  if (!storeSlug) return '';
  const base = `${kioskOrigin()}/tablet/${encodeURIComponent(storeSlug)}`;
  return tabletId ? `${base}?tabletId=${encodeURIComponent(tabletId)}` : base;
}
