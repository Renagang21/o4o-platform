/**
 * Browser Site Registry — agent 쪽 사본
 *
 * WO-O4O-BROWSER-CONTROL-V0 §11·§44
 *
 * 서버(`apps/api-server/src/services/local-agent/browser-site-registry.ts`)와 **같은 목록**이다.
 * 일부러 복제한다 — 이중 allowlist 의 agent 쪽 절반이기 때문이다. 서버가 (버그로든
 * 변조로든) 등재되지 않은 siteId 를 보내도 agent 가 여기서 다시 거절한다.
 *
 * **URL 은 이 파일에만 있다.** 서버가 URL 을 보내지 않고 siteId 만 보내며, agent 가
 * 자기 목록에서 URL 을 꺼낸다. 즉 서버가 어떤 문자열을 보내든 열리는 주소는 여기 적힌
 * 것뿐이다(§14·§27).
 *
 * 두 목록이 어긋나면 서버 테스트가 실패한다(양쪽 파일을 함께 읽어 비교한다).
 */

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

export function findBrowserSite(siteId) {
  return BROWSER_SITE_REGISTRY.find((s) => s.siteId === siteId);
}

export function listBrowserSiteIds() {
  return BROWSER_SITE_REGISTRY.map((s) => s.siteId);
}
