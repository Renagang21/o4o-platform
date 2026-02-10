/**
 * Store Main Page Types
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1
 * Product Policy 기반 매장 메인 페이지 타입 정의
 */

/** Product Policy - 상품 판매/진열 정책 */
export type ProductPolicy = 'OPEN' | 'REQUEST_REQUIRED' | 'DISPLAY_ONLY' | 'LIMITED';

/** Product Policy 설정 */
export interface ProductPolicyConfig {
  policy: ProductPolicy;
  label: string;
  description: string;
  badgeColor: string;
  textColor: string;
}

/** 매장 현황 요약 */
export interface StoreMainSummary {
  activeServices: number;
  orderableProducts: number;
  pendingApprovals: number;
  activeChannels: number;
}

/** 카탈로그 상품 항목 */
export interface StoreCatalogItem {
  id: string;
  name: string;
  categoryName: string;
  policy: ProductPolicy;
  price?: number;
  thumbnailUrl?: string;
  status: 'available' | 'request_needed' | 'display_only' | 'limited';
}

/** 매장 메인 데이터 (API 응답) */
export interface StoreMainData {
  summary: StoreMainSummary;
  readyToUse: StoreCatalogItem[];
  expandable: StoreCatalogItem[];
}

/** AI 요약 결과 (rule-based stub) */
export interface AiSummaryResult {
  message: string;
  suggestions: string[];
  generatedAt: string;
}
