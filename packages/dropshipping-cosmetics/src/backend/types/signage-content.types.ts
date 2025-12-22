/**
 * Signage Content Types for Cosmetics Store
 *
 * Phase 1: 3가지 콘텐츠 타입 지원
 * Phase 2: 메시지 템플릿 고정 + 디바이스 안정성
 *
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

// ============================================
// Phase 2: Message Templates
// ============================================

export const MESSAGE_TEMPLATES = {
  DISPLAY_HIGHLIGHT: [
    '이 진열대의 추천 제품을 확인해보세요',
    '지금 가장 눈에 띄는 진열입니다',
    '매장에서 가장 주목받는 제품',
    '오늘의 추천 진열을 만나보세요',
  ],
  SAMPLE_PROMO: [
    '지금 체험 가능한 샘플이 준비되어 있습니다',
    '직접 사용해보고 선택해보세요',
    '인기 샘플을 무료로 체험하세요',
    '고객님들이 가장 많이 체험하고 있어요',
  ],
  OPERATION_ALERT: {
    low_stock: [
      '샘플 보충이 필요합니다',
      '재고가 부족합니다. 확인해주세요',
    ],
    out_of_stock: [
      '샘플이 소진되었습니다',
      '재고가 모두 소진되었습니다',
    ],
    unverified_display: [
      '진열 상태를 확인해주세요',
      '진열 인증이 필요합니다',
    ],
    refill_needed: [
      '보충이 필요합니다',
      '재입고가 필요합니다',
    ],
  },
} as const;

// ============================================
// Phase 2: Device Stability
// ============================================

export type DeviceStatus = 'online' | 'offline' | 'reconnecting';

export interface DeviceState {
  status: DeviceStatus;
  lastSuccessfulFetch: string | null;
  lastContents: SignageContent[] | null;
  retryCount: number;
  maxRetries: number;
}

export interface FallbackConfig {
  enabled: boolean;
  fallbackImageUrl?: string;
  fallbackMessage: string;
  retryIntervalMs: number;
  maxRetryIntervalMs: number;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enabled: true,
  fallbackMessage: '잠시 후 다시 시도합니다',
  retryIntervalMs: 5000,
  maxRetryIntervalMs: 60000,
};

export interface StoreSignageResponseWithFallback extends StoreSignageResponse {
  fallback?: {
    isUsingFallback: boolean;
    reason?: string;
    lastSuccessAt?: string;
  };
}
