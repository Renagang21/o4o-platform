/**
 * storeAccent — Store Hub 공통 View 의 서비스 accent 토큰 (단일 출처)
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * 공통 View 안에서 `service === 'kpa'` 같은 서비스 분기를 쓰지 않기 위한 토큰 맵이다.
 * 서비스는 accent 이름 하나만 넘기고, 공통 View 는 여기서 class 를 읽는다.
 *
 * Tailwind 제약: **동적 class 문자열을 조립하지 않는다.** 모든 조합을 정적으로 나열한다.
 * (`bg-${accent}-600` 같은 표현은 Tailwind JIT 가 수집하지 못한다.)
 *
 * 서비스별 현행 accent:
 *   KPA-Society  blue
 *   K-Cosmetics  pink
 *   GlycoPharm   blue   (Store HUB 화면 기준. SupplyCatalogHub 만 teal 을 쓴다)
 *   PharmacyHub  blue
 */

export type StoreAccent = 'blue' | 'pink' | 'teal';

export interface StoreAccentTokens {
  /** 하단 border 형 탭의 active 상태 */
  tabActive: string;
  /** pill/chip 형 필터의 active 상태 */
  pillActive: string;
  /** 연한 배지 */
  badge: string;
  /** 채워진 기본 버튼 */
  solidBtn: string;
  /** 외곽선 버튼 (재시도 · 보조 액션) */
  outlineBtn: string;
  /** 안내 박스 */
  noticeBox: string;
  /** 본문 링크 */
  link: string;
  /** 강조 텍스트 */
  text: string;
  /** 사이드바 nav active (배경 + 글자) */
  navActive: string;
  /** 사이드바 nav active 우측 표시기 배경 */
  navIndicator: string;
  /** 사이드바 nav active 아이콘 */
  navIconActive: string;
}

export const STORE_ACCENT_CLASSES: Record<StoreAccent, StoreAccentTokens> = {
  blue: {
    tabActive: 'text-blue-600 border-blue-600 font-semibold',
    pillActive: 'bg-blue-600 text-white',
    badge: 'bg-blue-50 border-blue-200 text-blue-700',
    solidBtn: 'bg-blue-600 text-white hover:bg-blue-700',
    outlineBtn: 'text-blue-600 border-blue-400 hover:bg-blue-50',
    noticeBox: 'bg-blue-50/60 border-blue-100',
    link: 'text-blue-600 underline underline-offset-2',
    text: 'text-blue-600',
    navActive: 'bg-blue-50 text-blue-700',
    navIndicator: 'bg-blue-500',
    navIconActive: 'text-blue-600',
  },
  pink: {
    tabActive: 'text-pink-600 border-pink-600 font-semibold',
    pillActive: 'bg-pink-600 text-white',
    badge: 'bg-pink-50 border-pink-200 text-pink-700',
    solidBtn: 'bg-pink-600 text-white hover:bg-pink-700',
    outlineBtn: 'text-pink-600 border-pink-400 hover:bg-pink-50',
    noticeBox: 'bg-pink-50/60 border-pink-100',
    link: 'text-pink-600 underline underline-offset-2',
    text: 'text-pink-600',
    navActive: 'bg-pink-50 text-pink-700',
    navIndicator: 'bg-pink-500',
    navIconActive: 'text-pink-600',
  },
  teal: {
    tabActive: 'text-teal-600 border-teal-600 font-semibold',
    pillActive: 'bg-teal-600 text-white',
    badge: 'bg-teal-50 border-teal-200 text-teal-700',
    solidBtn: 'bg-teal-600 text-white hover:bg-teal-700',
    outlineBtn: 'text-teal-600 border-teal-400 hover:bg-teal-50',
    noticeBox: 'bg-teal-50/60 border-teal-100',
    link: 'text-teal-600 underline underline-offset-2',
    text: 'text-teal-600',
    navActive: 'bg-teal-50 text-teal-700',
    navIndicator: 'bg-teal-500',
    navIconActive: 'text-teal-600',
  },
};

export function storeAccentTokens(accent: StoreAccent): StoreAccentTokens {
  return STORE_ACCENT_CLASSES[accent];
}
