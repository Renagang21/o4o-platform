import { getCooperationExtension } from '@o4o/shared-space-ui';
import { BUSINESS_SITE } from './businessSite';

export const PHARMACY_BRAND_KEY = ['carepharm', 'drugstore'].includes(BUSINESS_SITE.key) ? BUSINESS_SITE.key : 'pharmacy';
/**
 * pharmacy.neture.co.kr 표시 브랜드 — WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1
 *
 * 사용자 화면 표시 이름은 **O4O 약국** 이다.
 * 내부 식별자(serviceKey `kpa-society` · package name · DB key · API key)는 바꾸지 않는다.
 *
 * 로고와 favicon은 기존 O4O 색상·벡터에 서비스별 기호를 추가한 승인된 파생형이다.
 * 기존 공통 원본과 legacy 파일은 보존하며, 실제 배포된 brand 파일만 참조한다.
 */

export const PHARMACY_DISPLAY_NAME = BUSINESS_SITE.name;
export const PHARMACY_ORIGIN = getCooperationExtension(BUSINESS_SITE.key)?.model.origin ?? 'https://pharmacy.neture.co.kr';
export const PHARMACY_ACCENT = '#2563eb';

/** 공용 헤더 브랜드 (GlobalHeader `brand`) */
export const PHARMACY_HEADER_BRAND = {
  icon: '💊',
  logoSrc: `/brand/${PHARMACY_BRAND_KEY}/logo-mark.svg`,
  name: PHARMACY_DISPLAY_NAME,
  subtitle: BUSINESS_SITE.key === 'carepharm' ? '만성질환관리 약국 협업체' : '약국 정보 · 업무 연결',
  primaryColor: PHARMACY_ACCENT,
} as const;

/** 공개 홈 Hero 문구 (WO §Hero 확정 문구) */
export const PHARMACY_HERO = {
  title: ['약국의 정보와 업무를', '하나로 연결합니다'],
  description: ['제품 정보와 콘텐츠를 활용하고,', '매장 운영과 고객 서비스를 더 편리하게 시작하시기 바랍니다.'],
} as const;

/**
 * 승인된 서비스별 벡터 및 파비콘. 협업체별 경로는 동일 번들 안에 함께 제공한다.
 */
export const PHARMACY_BRAND_ASSET_SLOTS = {
  logoHorizontal: `/brand/${PHARMACY_BRAND_KEY}/logo-horizontal.svg`,
  logoMark: `/brand/${PHARMACY_BRAND_KEY}/logo-mark.svg`,
  faviconSvg: `/brand/${PHARMACY_BRAND_KEY}/favicon.svg`,
  faviconIco: `/brand/${PHARMACY_BRAND_KEY}/favicon.ico`,
  appleTouchIcon: `/brand/${PHARMACY_BRAND_KEY}/apple-touch-icon.png`,
  manifestIcon192: `/brand/${PHARMACY_BRAND_KEY}/icon-192.png`,
  manifestIcon512: `/brand/${PHARMACY_BRAND_KEY}/icon-512.png`,
} as const;

export const PHARMACY_BRAND_ASSETS_READY = true;

/** 현재 쓰는 legacy asset (KPA-Society 시절 — 즉시 삭제하지 않는다) */
export const PHARMACY_LEGACY_ASSETS = {
  favicon: '/favicon.png',
  appleTouchIcon: '/icons/apple-touch-icon.png',
  manifestIcon192: '/icons/icon-192.png',
  manifestIcon512: '/icons/icon-512.png',
} as const;
