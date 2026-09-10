/**
 * Browser Site Registry — 코드 등재부 (순수)
 *
 * WO-O4O-BROWSER-CONTROL-V0 §9·§10·§11·§12·§26·§48
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   siteId  = AI·서버·agent 가 주고받는 **유일한 canonical 식별자**
 *   사이트 정의 = 그 siteId 가 어떤 HTTPS URL 인가
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AI 는 URL 을 만들어낼 수 없다 (§10)
 *
 *   AI 가 넘길 수 있는 값은 `siteId` 하나이고, 그 값은 **이 목록에 있어야만** 한다.
 *   목록에 없으면 `BROWSER_SITE_NOT_REGISTERED` 로 끝난다. 사용자가 URL 을 직접 말해도,
 *   모델이 URL 을 지어내도, 그 문자열은 어디로도 흐르지 않는다 — 실행 경로에 "URL 을
 *   받는 칸" 자체가 없다.
 *
 *   `javascript:` · `file:` · `data:` · 임의 custom protocol 은 표현할 방법이 없다.
 *   등재 시점에 `https://` 만 받도록 아래 `assertHttps` 가 강제한다(§12).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ DB 등재부를 만들지 않는다 (§48)
 *
 *   Windows App Registry 와 같은 이유다. 사이트 목록은 코드 상수이며 테이블도
 *   migration 도 관리 화면도 없다. 등재는 코드 리뷰를 거친다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 이 등재부는 "여는" 것만 정한다
 *
 *   로그인 · credential · cookie · 세션에 관한 정보는 여기에 없고, 이 WO 의 어디에도 없다.
 *   사이트를 여는 것까지가 O4O 의 몫이고 로그인은 사용자가 사이트 안에서 직접 한다(§2·§4).
 */

export interface BrowserSiteDefinition {
  /** canonical 식별자. AI·서버·agent 가 이 값만 주고받는다. */
  siteId: string;
  /** 사용자에게 읽어줘도 안전한 이름. AI 응답에 나가는 유일한 표시 문자열이다. */
  displayName: string;
  /** 열 주소. **`https://` 만**(§12). agent 쪽 사본과 같아야 한다. */
  url: string;
  /**
   * 이 사이트로 인정할 origin. V0 에서는 탭 열거를 하지 않으므로 판정에 쓰이지 않지만,
   * 후속(탭 재사용·navigation)에서 "다른 origin 으로 새지 않는다" 의 기준이 된다.
   */
  allowedOrigins: string[];
}

function assertHttps(url: string): string {
  if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
    // 등재 자체가 코드이므로 이 throw 는 개발 시점(모듈 로드)에 터진다 — 런타임에 새 URL 이
    // 들어올 경로가 없기 때문이다.
    throw new Error(`browser-site-registry: HTTPS only — ${url}`);
  }
  return url;
}

/**
 * V0 등재 목록 — **안전한 테스트 사이트 1개**(§9·§36).
 *
 * O4O 자체 홈이다. 로그인 없이 열리고, 로그인이 필요한 흐름(§38 C·D)도 같은 사이트에서
 * 확인할 수 있다. 외부 실서비스를 지금 넣지 않는다 — 이 구조가 특정 사이트에 의존하지
 * 않는지를 먼저 증명하는 것이 V0 의 목적이고, 등재는 이 배열에 항목을 더하는 것으로 끝나야 한다.
 */
export const BROWSER_SITE_REGISTRY: readonly BrowserSiteDefinition[] = Object.freeze([
  Object.freeze({
    siteId: 'o4o.neture',
    displayName: 'O4O 홈',
    url: assertHttps('https://neture.co.kr/'),
    allowedOrigins: ['https://neture.co.kr'],
  }) as BrowserSiteDefinition,
]);

/** 등재된 siteId 목록. allowlist 조립과 테스트에서 쓴다. */
export const BROWSER_SITE_IDS: readonly string[] = Object.freeze(
  BROWSER_SITE_REGISTRY.map((s) => s.siteId),
);

export function findBrowserSite(siteId: string): BrowserSiteDefinition | undefined {
  return BROWSER_SITE_REGISTRY.find((s) => s.siteId === siteId);
}

export function isRegisteredBrowserSite(siteId: unknown): boolean {
  return typeof siteId === 'string' && BROWSER_SITE_IDS.includes(siteId);
}

/**
 * 사용자·AI 에게 보여줄 이름. 등재되지 않은 값이 들어와도 **원문을 되돌리지 않는다** —
 * 모델이 만들어낸 문자열이 그대로 화면에 찍히는 경로를 만들지 않기 위해서다.
 */
export function browserSiteDisplayName(siteId: string): string {
  return findBrowserSite(siteId)?.displayName ?? '해당 사이트';
}
