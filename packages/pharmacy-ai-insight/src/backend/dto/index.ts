/**
 * pharmacy-ai-insight DTOs
 *
 * AI 인사이트 입출력 인터페이스 (최소 계약)
 *
 * 원칙:
 * - 확정 결론 ❌
 * - 행동 지시 ❌
 * - 설명 보조 ⭕
 * - 모든 필드 optional (없으면 AI가 추정하거나 무시)
 *
 * @package @o4o/pharmacy-ai-insight
 */

// ========================================
// AI 입력 계약 (Input Contract)
// ========================================

/**
 * 혈당 요약 신호 (CGM/BGM)
 * - 변동성, 시간대 패턴 등
 * - 핵심 서비스가 아닌 참고 정보
 */
export interface GlucoseSummary {
  avgGlucose?: number;
  minGlucose?: number;
  maxGlucose?: number;
  timeInRange?: number;
  variability?: number;
  timeBelowRange?: number;
  timeAboveRange?: number;
  dataSource?: 'cgm' | 'bgm' | 'manual';
  periodDays?: number;
  timePatterns?: Array<{
    timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
    avgGlucose: number;
    trend: 'stable' | 'rising' | 'falling' | 'variable';
  }>;
  lastUpdated?: string;
}

/**
 * 식단 관련 신호
 * - 있으면 사용, 없으면 무시
 */
export interface DietSignals {
  mealFrequency?: 'regular' | 'irregular' | 'unknown';
  mealTimings?: string[];
  dietaryPatterns?: string[];
  snackingTendency?: 'low' | 'medium' | 'high';
}

/**
 * 조제 이력 신호
 * - 카테고리/빈도 수준
 */
export interface DispenseSignals {
  medicationCategories?: string[];
  dispenseFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasional';
  recentDispenseCount?: number;
}

/**
 * 제품 구매 이력
 */
export interface PurchaseHistory {
  recentProducts?: string[];
  productCategories?: string[];
  purchaseFrequency?: 'frequent' | 'occasional' | 'rare';
  preferredBrands?: string[];
  lastPurchaseDate?: string;
}

/**
 * 맥락 정보 (약국/시즌/캠페인)
 */
export interface ContextSignals {
  pharmacyId: string;
  pharmacyName?: string;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  activeCampaigns?: string[];
  customerSegment?: string;
  visitCount?: number;
}

/**
 * AI 인사이트 요청 (최소 계약)
 *
 * 모든 필드 optional - AI가 알아서 읽고 요약
 */
export interface AiInsightInput {
  context: ContextSignals;
  glucoseSummary?: GlucoseSummary;
  dietSignals?: DietSignals;
  dispenseSignals?: DispenseSignals;
  purchaseHistory?: PurchaseHistory;
}

// ========================================
// AI 출력 계약 (Output Contract)
// ========================================

/**
 * 인사이트 카드 (요약 문장)
 * - 3~5개 요약 문장
 * - 확정 결론 없음
 */
export interface InsightCard {
  id: string;
  category: 'glucose' | 'pattern' | 'product' | 'general';
  title: string;
  content: string;
  tone: 'neutral' | 'positive' | 'cautious';
  confidence: 'low' | 'medium' | 'high';
}

/**
 * 패턴 관찰 결과
 * - "이런 경향이 관찰됩니다"
 * - 확정 결론 아님
 */
export interface PatternObservation {
  patternType: string;
  description: string;
  frequency: 'occasional' | 'frequent' | 'consistent';
  possibleFactors: string[];
  isConclusion: false;
}

/**
 * 제품 유형 힌트
 * - "이런 경우 선택되는 제품 유형"
 * - 특정 제품 아닌 유형만
 */
export interface ProductHint {
  productType: string;
  relevanceReason: string;
  priority: number;
  isRecommendation: false;
}

/**
 * CTA 제안
 * - 선택형 문구만
 * - 정보/참고/의사 상담
 */
export interface CtaSuggestion {
  id: string;
  label: string;
  type: 'info' | 'reference' | 'consult';
  action?: string;
}

/**
 * AI 인사이트 응답 (최소 계약)
 */
export interface AiInsightOutput {
  pharmacyId: string;
  summaryCards: InsightCard[];
  patterns?: PatternObservation[];
  productHints?: ProductHint[];
  ctaSuggestions?: CtaSuggestion[];
  generatedAt: string;
  disclaimer: string;
}

// ========================================
// 레거시 호환 타입 (기존 코드 호환용)
// ========================================

/** @deprecated Use AiInsightInput */
export type AiInsightRequestDto = {
  pharmacyId: string;
  cgmSummary?: GlucoseSummary;
  productMeta?: PurchaseHistory;
  medicationMeta?: DispenseSignals;
  requestType: 'summary' | 'pattern' | 'product-hint';
};

/** @deprecated Use InsightCard */
export type AiSummaryCardDto = InsightCard;

/** @deprecated Use PatternObservation */
export type PatternExplanationDto = {
  patternType: string;
  explanation: string;
  possibleFactors: string[];
  noConclusion: true;
};

/** @deprecated Use ProductHint */
export type ProductTypeHintDto = ProductHint;

/** @deprecated Use CtaSuggestion */
export type SelectiveCtaDto = {
  id: string;
  label: string;
  action: 'view-products' | 'view-display' | 'dismiss';
  targetPath?: string;
};

/** @deprecated Use AiInsightOutput */
export type AiInsightResponseDto = AiInsightOutput;

// ========================================
// 상수 & 헬퍼
// ========================================

export const AI_DISCLAIMER = '이 정보는 AI가 생성한 참고 자료입니다. 의료적 판단이나 처방을 대체하지 않습니다. 필요시 의료 전문가와 상담하세요.';

export const PRODUCT_TYPES = [
  'blood-glucose-monitor',
  'test-strips',
  'lancets',
  'health-supplements',
  'low-sugar-foods',
  'diabetes-care-sets',
  'cgm-sensors',
  'insulin-supplies',
] as const;

export type ProductType = typeof PRODUCT_TYPES[number];

/**
 * 안전한 표현 헬퍼
 * - 확정 결론을 피하는 문장 생성
 */
export const SAFE_EXPRESSIONS = {
  observation: [
    '~하는 경향이 관찰됩니다',
    '~할 수 있습니다',
    '~로 보입니다',
    '~일 가능성이 있습니다',
  ],
  suggestion: [
    '참고하실 수 있습니다',
    '확인해 보실 수 있습니다',
    '고려해 보실 수 있습니다',
  ],
  disclaimer: [
    '이는 참고 정보입니다',
    '전문가 상담을 권장합니다',
    '개인 상황에 따라 다를 수 있습니다',
  ],
} as const;
