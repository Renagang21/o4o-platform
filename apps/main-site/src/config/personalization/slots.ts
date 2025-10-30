/**
 * 개인화 슬롯 정의
 *
 * - 각 슬롯의 최대 개수, 대체 규칙, 디폴트 구성
 */

/**
 * 슬롯 설정
 */
export const SLOT_CONFIG = {
  // 상단 공지 (Top Notice)
  topNotice: {
    maxCount: 1,
    showWhen: 'always', // 'always' | 'hasContent'
    fallback: null
  },

  // 메인 피드 (Main Feed Cards)
  mainFeed: {
    minCount: 3, // 최소 표시 개수
    maxCount: 12, // 최대 표시 개수
    defaultCount: 6, // 기본 표시 개수
    showWhen: 'always',
    fallback: 'default-cards' // 콘텐츠 없을 때 기본 카드
  },

  // 사이드 추천 (Side Suggestions)
  sideSuggestions: {
    minCount: 2,
    maxCount: 4,
    defaultCount: 3,
    showWhen: 'desktop-only', // 데스크톱만 표시
    fallback: 'common-suggestions'
  },

  // 하단 배너 (Bottom Banners)
  bottomBanners: {
    minCount: 0,
    maxCount: 2,
    defaultCount: 1,
    showWhen: 'hasContent',
    fallback: null
  }
};

/**
 * 모바일/데스크톱별 슬롯 조정
 */
export function getSlotConfigForDevice(isMobile: boolean) {
  if (isMobile) {
    return {
      ...SLOT_CONFIG,
      mainFeed: {
        ...SLOT_CONFIG.mainFeed,
        defaultCount: 4 // 모바일은 적게 표시
      },
      sideSuggestions: {
        ...SLOT_CONFIG.sideSuggestions,
        showWhen: 'never' // 모바일에서는 사이드 숨김
      }
    };
  }

  return SLOT_CONFIG;
}

/**
 * 역할별 슬롯 우선순위
 */
export const ROLE_SLOT_PRIORITY: Record<string, string[]> = {
  seller: ['topNotice', 'mainFeed', 'sideSuggestions', 'bottomBanners'],
  supplier: ['topNotice', 'mainFeed', 'sideSuggestions', 'bottomBanners'],
  affiliate: ['topNotice', 'mainFeed', 'sideSuggestions', 'bottomBanners'],
  customer: ['mainFeed', 'topNotice', 'bottomBanners', 'sideSuggestions']
};

/**
 * 디폴트 카드 ID (폴백용)
 */
export const DEFAULT_CARD_IDS: Record<string, string[]> = {
  seller: ['seller-add-product', 'seller-sales-report', 'seller-onboarding-guide'],
  supplier: ['supplier-add-product', 'supplier-partners', 'supplier-api-integration'],
  affiliate: ['affiliate-earnings', 'affiliate-create-campaign', 'affiliate-tracking-guide'],
  customer: ['customer-recent-orders', 'customer-new-arrivals', 'customer-wishlist']
};
