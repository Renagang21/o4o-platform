/**
 * pharmacy.neture.co.kr 표시 브랜드 — WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1
 *
 * 사용자 화면 표시 이름은 **O4O 약국** 이다.
 * 내부 식별자(serviceKey `kpa-society` · package name · DB key · API key)는 바꾸지 않는다.
 *
 * 로고 · favicon 은 사용자가 제작한다. 아래 asset 경로는 **자리(slot)** 다 —
 * 실제 파일이 public/brand/ 에 들어오기 전에는 화면 · 메타에서 참조하지 않는다
 * (`PHARMACY_BRAND_ASSETS_READY = false`). 존재하지 않는 URL 을 메타에 넣지 않는다.
 * 기존 KPA-Society asset(public/favicon.png · public/icons/*)은 교체 전까지 그대로 쓴다.
 */

export const PHARMACY_DISPLAY_NAME = 'O4O 약국';
export const PHARMACY_ORIGIN = 'https://pharmacy.neture.co.kr';
export const PHARMACY_ACCENT = '#2563eb';

/** 공용 헤더 브랜드 (GlobalHeader `brand`) */
export const PHARMACY_HEADER_BRAND = {
  icon: '💊',
  name: PHARMACY_DISPLAY_NAME,
  subtitle: '약국 정보 · 업무 연결',
  primaryColor: PHARMACY_ACCENT,
} as const;

/** 공개 홈 Hero 문구 (WO §Hero 확정 문구) */
export const PHARMACY_HERO = {
  title: ['약국의 정보와 업무를', '하나로 연결합니다'],
  description: ['제품 정보와 콘텐츠를 활용하고,', '매장 운영과 고객 서비스를 더 편리하게 시작하세요.'],
} as const;

/**
 * 사용자 제작 브랜드 asset 자리. 파일 투입 후 `PHARMACY_BRAND_ASSETS_READY` 를 true 로 바꾸고
 * index.html 의 favicon · apple-touch-icon · og:image 와 manifest icons 를 이 경로로 교체한다.
 */
export const PHARMACY_BRAND_ASSET_SLOTS = {
  logoHorizontal: '/brand/logo-horizontal.svg',
  logoMark: '/brand/logo-mark.svg',
  faviconSvg: '/brand/favicon.svg',
  faviconIco: '/brand/favicon.ico',
  appleTouchIcon: '/brand/apple-touch-icon.png',
  ogImage: '/brand/og-image.png',
  manifestIcon192: '/brand/icon-192.png',
  manifestIcon512: '/brand/icon-512.png',
} as const;

export const PHARMACY_BRAND_ASSETS_READY = false;

/** 현재 쓰는 legacy asset (KPA-Society 시절 — 즉시 삭제하지 않는다) */
export const PHARMACY_LEGACY_ASSETS = {
  favicon: '/favicon.png',
  appleTouchIcon: '/icons/apple-touch-icon.png',
  manifestIcon192: '/icons/icon-192.png',
  manifestIcon512: '/icons/icon-512.png',
} as const;
