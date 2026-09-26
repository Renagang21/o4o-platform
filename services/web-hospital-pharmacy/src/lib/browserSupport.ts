/**
 * 지원 브라우저 판정 — V1 공식 지원은 Google Chrome · Microsoft Edge 뿐이다(§0·§17).
 *
 *   hasFileSystemAccess: 폴더 연결(showDirectoryPicker)이 가능한가 — 없으면 서비스를 쓸 수 없다.
 *   officiallySupported: Chrome/Edge 인가 — 다른 Chromium 계열(Whale·Opera 등)은 동작하더라도 공식 지원 대상이 아니므로 안내만 한다.
 */

interface UADataBrand {
  brand: string;
}

export interface BrowserSupport {
  hasFileSystemAccess: boolean;
  officiallySupported: boolean;
}

export function detectBrowserSupport(): BrowserSupport {
  const hasFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: UADataBrand[] } }).userAgentData?.brands ?? [];
  let officiallySupported: boolean;
  if (brands.length > 0) {
    officiallySupported = brands.some((b) => b.brand === 'Google Chrome' || b.brand === 'Microsoft Edge');
  } else {
    // userAgentData 미지원 브라우저 — UA 문자열로 보수 판정(Edg/ 또는 순수 Chrome/, 파생 브라우저 표식 제외).
    const ua = navigator.userAgent;
    const derived = /OPR\/|Whale\/|SamsungBrowser\/|YaBrowser\/|Vivaldi\//.test(ua);
    officiallySupported = /Edg\//.test(ua) || (/Chrome\//.test(ua) && !derived);
  }
  return { hasFileSystemAccess, officiallySupported: officiallySupported && hasFileSystemAccess };
}

export const SUPPORTED_BROWSER_NOTICE = '이 서비스는 Google Chrome 또는 Microsoft Edge 에서 사용할 수 있습니다.';
