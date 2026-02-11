/**
 * Store Main Page Types
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1 + PHASE2-A
 * Product Policy 기반 매장 메인 페이지 타입 정의
 */

/** Product Policy - 상품 판매/진열 정책 */
export type ProductPolicy = 'OPEN' | 'REQUEST_REQUIRED' | 'DISPLAY_ONLY' | 'LIMITED';

/** 승인 상태 (Phase 2-A) */
export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Product Policy 설정 */
export interface ProductPolicyConfig {
  policy: ProductPolicy;
  label: string;
  description: string;
  badgeColor: string;
  textColor: string;
}

/** LIMITED 정책 조건 (Phase 2-A) */
export interface LimitedCondition {
  type: 'channel' | 'region' | 'period' | 'quantity';
  label: string;
  description: string;
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
  /** Phase 2-A: 승인 상태 */
  approvalStatus?: ApprovalStatus;
  /** Phase 2-A: 반려 사유 */
  rejectionReason?: string;
  /** Phase 2-A: LIMITED 조건 목록 */
  limitedConditions?: LimitedCondition[];
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
