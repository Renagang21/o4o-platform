export const SERVICE_KEY = 'hospital-pharmacy' as const;

/** unified AI 요청 표면 식별자 — web-neture 병동 흐름과 동일 계약(surface='hospital-drug'). */
export const AI_SURFACE = 'hospital-drug' as const;

/** 계정 · 약관 · 개인정보처리방침의 정본 origin — 병원약국은 O4O 공통 Identity/정책을 소비만 한다. */
export const PLATFORM_ORIGIN = 'https://neture.co.kr';

export const BRAND = {
  name: '병원약국',
  nameEn: 'Hospital Pharmacy',
  /** 정본 진입 — 서브디렉토리(neture.co.kr/hospital). 임시 서비스라 전용 도메인을 만들지 않는다. */
  domain: 'neture.co.kr/hospital',
  tagline: '원내 보유·동일성분·대체약·성분 조사를 한곳에서',
} as const;
