/**
 * Router basename — 진입 경로에 따라 한 번만 정한다(SPA 내 이동은 basename 을 바꾸지 않는다).
 *
 *   neture.co.kr/hospital/...        → '/hospital'   (정본 진입 · LB 가 `/hospital/...` 을 그대로 전달)
 *   Cloud Run URL root(운영 smoke)    → ''
 *   localhost dev root               → ''
 *
 * kpa-branch(`/kpa`) 와 같은 규칙이다. 플랫폼 host 조건을 함께 보는 이유: 다른 host 의 `/hospital` 경로를
 * 공용 prefix 로 오인하지 않기 위해서다. 번들 asset 경로는 vite `base: '/hospital/'` 가 정하고, 이 함수는
 * **라우팅만** 정한다(둘은 별개 — Cloud Run root 진입에서도 asset 은 `/hospital/assets/*` 로 간다).
 */
export const PUBLIC_BASE_PATH = '/hospital';

/** 정본 진입이 올라가 있는 플랫폼 host. www 는 LB 가 같은 backend 로 보내므로 함께 인정한다. */
export function isPlatformHost(host: string): boolean {
  return host === 'neture.co.kr' || host === 'www.neture.co.kr';
}

export function detectBasename(
  host: string = window.location.hostname,
  pathname: string = window.location.pathname,
): string {
  if (!isPlatformHost(host)) return '';
  return pathname === PUBLIC_BASE_PATH || pathname.startsWith(`${PUBLIC_BASE_PATH}/`) ? PUBLIC_BASE_PATH : '';
}
