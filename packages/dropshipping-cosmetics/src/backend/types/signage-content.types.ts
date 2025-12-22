/**
 * Signage Content Types for Cosmetics Store MVP
 *
 * Phase 1: 축소 범위 - 3가지 콘텐츠 타입만 지원
 * - SAMPLE_PROMO: 샘플 체험 유도
 * - DISPLAY_HIGHLIGHT: 진열 강조
 * - OPERATION_ALERT: 운영 경고 (보충 필요, 미인증 등)
 */

// ============================================
// Content Types
// ============================================

export type SignageContentType = 'SAMPLE_PROMO' | 'DISPLAY_HIGHLIGHT' | 'OPERATION_ALERT';

export interface SignageContent {
  type: SignageContentType;
  title: string;
  message: string;
  imageUrl?: string;
  priority: number; // 높을수록 우선 표시 (OPERATION_ALERT > SAMPLE_PROMO > DISPLAY_HIGHLIGHT)
  metadata?: Record<string, unknown>;
}

// ============================================
// Sample Promo Content
// ============================================

export interface SamplePromoContent extends SignageContent {
  type: 'SAMPLE_PROMO';
  productId: string;
  productName: string;
  usageCount?: number; // 오늘 체험 횟수
  conversionRate?: number; // 구매 전환율
}

// ============================================
// Display Highlight Content
// ============================================

export interface DisplayHighlightContent extends SignageContent {
  type: 'DISPLAY_HIGHLIGHT';
  displayId?: string;
  displayName?: string;
  category?: string;
  featured?: boolean;
}

// ============================================
// Operation Alert Content
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface OperationAlertContent extends SignageContent {
  type: 'OPERATION_ALERT';
  alertType: 'low_stock' | 'out_of_stock' | 'unverified_display' | 'refill_needed';
  severity: AlertSeverity;
  targetId?: string; // productId or displayId
  targetName?: string;
}

// ============================================
// Store Signage Response
// ============================================

export interface StoreSignageResponse {
  success: boolean;
  storeId: string;
  contents: SignageContent[];
  displaySettings: {
    autoRotate: boolean;
    rotateInterval: number; // milliseconds
    alertPriority: boolean; // OPERATION_ALERT 우선 표시 여부
  };
  generatedAt: string;
}

// ============================================
// Content Generation Options
// ============================================

export interface ContentGenerationOptions {
  storeId: string;
  maxItems?: number;
  includeAlerts?: boolean;
  includeSamplePromo?: boolean;
  includeDisplayHighlight?: boolean;
}
