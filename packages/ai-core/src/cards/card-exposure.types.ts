/**
 * AI Core - Card Exposure Types
 *
 * AI 응답에 노출되는 카드의 규칙과 설명 가능성(Explainability)을 정의합니다.
 *
 * @package @o4o/ai-core
 * @workorder WO-AI-CONTEXT-CARD-RULES-V1
 */

import type { AiExplainability } from '../ai-logs/ai-log.types.js';

// ============================================================
// 카드 노출 사유 (Card Exposure Reason)
// ============================================================

/**
 * 카드 노출 사유
 *
 * 허용된 reason 값 (고정):
 * - same_store: 같은 매장
 * - same_product: 같은 상품
 * - same_category: 같은 카테고리
 * - service_fallback: 서비스 대표 카드
 */
export type CardExposureReason =
  | 'same_store'
  | 'same_product'
  | 'same_category'
  | 'service_fallback';

/**
 * 카드 노출 우선순위 (숫자가 낮을수록 높은 우선순위)
 */
export const CARD_EXPOSURE_PRIORITY: Record<CardExposureReason, number> = {
  same_store: 1,
  same_product: 2,
  same_category: 3,
  service_fallback: 4,
};

// ============================================================
// 카드 노출 규칙 상수
// ============================================================

/**
 * 카드 노출 규칙 상수
 */
export const CARD_EXPOSURE_RULES = {
  /** 최대 카드 개수 */
  MAX_CARDS: 3,

  /** 최소 카드 개수 */
  MIN_CARDS: 0,
} as const;

// ============================================================
// 카드 타입 및 인터페이스
// ============================================================

/**
 * 카드 타입
 */
export type AiCardType = 'product' | 'store' | 'content';

/**
 * AI 카드 (노출용)
 */
export interface AiCard {
  /** 카드 ID */
  id: string;

  /** 카드 타입 */
  type: AiCardType;

  /** 카드 데이터 */
  data: AiCardData;

  /** 설명 가능성 메타데이터 */
  explainability: AiCardExplainability;
}

/**
 * 카드 데이터
 */
export interface AiCardData {
  /** 제목 */
  title: string;

  /** 설명 */
  description?: string;

  /** 이미지 URL */
  imageUrl?: string;

  /** 링크 URL */
  linkUrl?: string;

  /** 가격 (상품인 경우) */
  price?: number;

  /** 추가 메타데이터 */
  meta?: Record<string, unknown>;
}

/**
 * 카드 설명 가능성 메타데이터
 *
 * AiExplainability를 확장하여 카드 전용 필드 추가
 */
export interface AiCardExplainability extends AiExplainability {
  /** 노출 사유 */
  reason: CardExposureReason;

  /** 연관 컨텍스트 ID */
  contextIds?: {
    storeId?: string;
    productId?: string;
    categoryId?: string;
  };
}

// ============================================================
// 카드 노출 컨텍스트
// ============================================================

/**
 * 카드 노출 결정을 위한 컨텍스트
 */
export interface CardExposureContext {
  /** 서비스 ID */
  serviceId: string;

  /** 현재 매장 ID (있는 경우) */
  storeId?: string;

  /** 현재 상품 ID (있는 경우) */
  productId?: string;

  /** 현재 카테고리 ID (있는 경우) */
  categoryId?: string;

  /** 사용자 질문 키워드 */
  keywords?: string[];
}

// ============================================================
// 카드 노출 로그
// ============================================================

/**
 * 카드 노출 로그 엔트리
 */
export interface CardExposureLogEntry {
  /** 로그 ID */
  id: string;

  /** 요청 ID */
  requestId: string;

  /** 노출된 카드 ID */
  cardId: string;

  /** 노출 사유 */
  reason: CardExposureReason;

  /** 노출 순서 (1, 2, 3) */
  position: number;

  /** 노출 시간 */
  timestamp: Date;

  /** 컨텍스트 정보 */
  context: CardExposureContext;
}
