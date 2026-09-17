/**
 * Store Template / Block 공통 타입
 *
 *   공통 Store 도메인 타입. KPA store template · store layout · store-public 이 모두 소비한다.
 *
 * WO-STORE-BLOCK-ENGINE-V1 (StoreBlockType / StoreBlock 원출처)
 */

export type TemplateProfile = 'BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL';

export type StoreBlockType =
  | 'HERO'
  | 'PRODUCT_GRID'
  | 'BLOG_LIST'
  | 'TABLET_PROMO'
  | 'SIGNAGE_PROMO'
  | 'INFO_SECTION';

export interface StoreBlock {
  type: StoreBlockType;
  enabled: boolean;
  config?: Record<string, any>;
}
