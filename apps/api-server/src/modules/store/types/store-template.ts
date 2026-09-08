/**
 * Store Template / Block 공통 타입
 *
 * WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1:
 *   이 타입들은 GlycoPharm 전용 자산이 아니라 공통 Store 도메인 타입인데,
 *   `routes/glycopharm/entities/glycopharm-pharmacy.entity.ts` 안에 정의돼 있었다.
 *   KPA store template · store layout · store-public 이 모두 소비한다.
 *   GlycoPharm 삭제에 앞서 공통 위치로 꺼낸다 (값·의미 변경 없음).
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
