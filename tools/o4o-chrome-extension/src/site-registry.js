/**
 * Browser Site Registry — 확장 쪽 사본 (§21·§37·§54)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * 확장이 "이 tab 이 O4O 가 다루는 등재 site 인가" 만 판정하는 최소 레지스트리다.
 * agent(`tools/o4o-local-agent/src/browser-site-registry.mjs`) 와
 * 서버(`apps/api-server/src/services/local-agent/browser-site-registry.ts`) 의
 * 사본과 **동일한 siteId·url·allowedOrigins** 를 갖는다(테스트가 교차 확인).
 *
 * 이 레지스트리는 `<all_urls>` 를 쓰지 않기 위한 근거다(§21). 확장은 여기 등재된
 * origin 밖에서 아무 일도 하지 않는다. 등재되지 않은 site → BROWSER_SITE_NOT_ALLOWED(§54).
 * V0 은 DOM 조작을 하지 않으므로(§46) 이 레지스트리는 "식별" 에만 쓴다.
 */

/** 등재 site 정의. url 은 https 전용. */
export const BROWSER_SITE_REGISTRY = Object.freeze([
  Object.freeze({
    siteId: 'o4o.neture',
    displayName: 'O4O 홈',
    url: 'https://neture.co.kr/',
    allowedOrigins: Object.freeze(['https://neture.co.kr']),
  }),
  // WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0 §17·§43 — 약학정보원(첫 외부 실사이트).
  Object.freeze({
    siteId: 'healthkr',
    displayName: '약학정보원',
    url: 'https://health.kr/',
    allowedOrigins: Object.freeze(['https://health.kr']),
  }),
]);

export function listBrowserSiteIds() {
  return BROWSER_SITE_REGISTRY.map((s) => s.siteId);
}

export function findBrowserSite(siteId) {
  return BROWSER_SITE_REGISTRY.find((s) => s.siteId === siteId) || null;
}

/**
 * URL 의 origin 이 등재된 site 에 속하는지 판정한다. 반환값은 siteId 또는 null.
 * 파싱 실패(URL 이 아님)면 null — 예외를 던지지 않는다.
 */
export function siteIdForUrl(rawUrl) {
  let origin;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    return null;
  }
  for (const site of BROWSER_SITE_REGISTRY) {
    if (site.allowedOrigins.includes(origin)) return site.siteId;
  }
  return null;
}

/**
 * 확장 manifest 의 host_permissions 를 레지스트리에서 파생한다.
 * `<all_urls>` 대신 등재 origin 만 나열한다(§20·§21). manifest.json 생성 검증에 쓴다.
 */
export function derivedHostPermissions() {
  const patterns = new Set();
  for (const site of BROWSER_SITE_REGISTRY) {
    for (const origin of site.allowedOrigins) {
      patterns.add(`${origin}/*`);
    }
  }
  return [...patterns];
}
