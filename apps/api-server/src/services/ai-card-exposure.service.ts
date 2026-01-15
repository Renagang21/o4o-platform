/**
 * AI Card Exposure Service
 * WO-AI-CONTEXT-CARD-RULES-V1
 *
 * AI 응답에 노출되는 카드의 규칙과 설명 가능성(Explainability)을 처리합니다.
 *
 * 핵심 원칙:
 * - 최대 3개 카드
 * - 우선순위: same_store > same_product > same_category > service_fallback
 * - 모든 카드에는 노출 사유(reason)가 기록됨
 * - 점수 계산, 가중치, ML 없음 - 말로 설명 가능한 규칙만
 */

import type {
  AiCard,
  AiCardData,
  AiCardExplainability,
  CardExposureContext,
  CardExposureReason,
  CardExposureLogEntry,
} from '@o4o/ai-core';

import { CARD_EXPOSURE_RULES, CARD_EXPOSURE_PRIORITY } from '@o4o/ai-core';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * 카드 후보 (내부 처리용)
 */
interface CardCandidate {
  card: AiCardData;
  type: 'product' | 'store' | 'content';
  reason: CardExposureReason;
  contextIds?: {
    storeId?: string;
    productId?: string;
    categoryId?: string;
  };
}

/**
 * 카드 노출 로그 저장소 (메모리 - 추후 DB 전환)
 */
const cardExposureLogs: CardExposureLogEntry[] = [];

class AiCardExposureService {
  private static instance: AiCardExposureService;

  private constructor() {}

  static getInstance(): AiCardExposureService {
    if (!AiCardExposureService.instance) {
      AiCardExposureService.instance = new AiCardExposureService();
    }
    return AiCardExposureService.instance;
  }

  /**
   * 컨텍스트 기반 카드 선택
   *
   * 우선순위 규칙:
   * 1. same_store: 같은 매장의 다른 상품/컨텐츠
   * 2. same_product: 같은 상품 관련 정보
   * 3. same_category: 같은 카테고리의 상품
   * 4. service_fallback: 서비스 대표 카드
   */
  selectCards(
    context: CardExposureContext,
    availableData: {
      storeProducts?: AiCardData[];
      relatedProducts?: AiCardData[];
      categoryProducts?: AiCardData[];
      serviceDefaults?: AiCardData[];
    }
  ): AiCard[] {
    const candidates: CardCandidate[] = [];

    // 1. same_store: 같은 매장 상품
    if (context.storeId && availableData.storeProducts?.length) {
      availableData.storeProducts.forEach(card => {
        candidates.push({
          card,
          type: 'product',
          reason: 'same_store',
          contextIds: { storeId: context.storeId },
        });
      });
    }

    // 2. same_product: 같은 상품 관련
    if (context.productId && availableData.relatedProducts?.length) {
      availableData.relatedProducts.forEach(card => {
        candidates.push({
          card,
          type: 'product',
          reason: 'same_product',
          contextIds: { productId: context.productId },
        });
      });
    }

    // 3. same_category: 같은 카테고리
    if (context.categoryId && availableData.categoryProducts?.length) {
      availableData.categoryProducts.forEach(card => {
        candidates.push({
          card,
          type: 'product',
          reason: 'same_category',
          contextIds: { categoryId: context.categoryId },
        });
      });
    }

    // 4. service_fallback: 서비스 대표 카드
    if (availableData.serviceDefaults?.length) {
      availableData.serviceDefaults.forEach(card => {
        candidates.push({
          card,
          type: 'content',
          reason: 'service_fallback',
        });
      });
    }

    // 우선순위로 정렬
    candidates.sort((a, b) => {
      return CARD_EXPOSURE_PRIORITY[a.reason] - CARD_EXPOSURE_PRIORITY[b.reason];
    });

    // 최대 3개 선택
    const selected = candidates.slice(0, CARD_EXPOSURE_RULES.MAX_CARDS);

    // AiCard 형식으로 변환
    return selected.map((candidate, index) => this.toAiCard(candidate, index + 1));
  }

  /**
   * CardCandidate를 AiCard로 변환
   */
  private toAiCard(candidate: CardCandidate, position: number): AiCard {
    const explainability: AiCardExplainability = {
      explainable: true,
      reason: candidate.reason,
      reasoning: [this.getReasonDescription(candidate.reason)],
      contextIds: candidate.contextIds,
    };

    return {
      id: candidate.card.linkUrl || uuidv4(),
      type: candidate.type,
      data: candidate.card,
      explainability,
    };
  }

  /**
   * 노출 사유 설명 (한글)
   */
  private getReasonDescription(reason: CardExposureReason): string {
    const descriptions: Record<CardExposureReason, string> = {
      same_store: '같은 매장의 상품입니다',
      same_product: '관련 상품입니다',
      same_category: '같은 카테고리의 상품입니다',
      service_fallback: '서비스 대표 정보입니다',
    };
    return descriptions[reason];
  }

  /**
   * 카드 노출 로그 기록
   */
  logCardExposure(
    requestId: string,
    cards: AiCard[],
    context: CardExposureContext
  ): void {
    cards.forEach((card, index) => {
      const logEntry: CardExposureLogEntry = {
        id: uuidv4(),
        requestId,
        cardId: card.id,
        reason: card.explainability.reason,
        position: index + 1,
        timestamp: new Date(),
        context,
      };

      cardExposureLogs.push(logEntry);

      // 메모리 관리: 최근 10000개만 유지
      if (cardExposureLogs.length > 10000) {
        cardExposureLogs.shift();
      }

      logger.debug('Card exposure logged:', {
        cardId: card.id,
        reason: card.explainability.reason,
        position: index + 1,
      });
    });
  }

  /**
   * 카드 노출 로그 조회 (관리자용)
   */
  getExposureLogs(
    options: {
      requestId?: string;
      reason?: CardExposureReason;
      limit?: number;
    } = {}
  ): CardExposureLogEntry[] {
    let logs = [...cardExposureLogs];

    if (options.requestId) {
      logs = logs.filter(log => log.requestId === options.requestId);
    }

    if (options.reason) {
      logs = logs.filter(log => log.reason === options.reason);
    }

    // 최신순 정렬
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs.slice(0, options.limit || 100);
  }

  /**
   * 카드 노출 통계 (관리자용)
   */
  getExposureStats(): {
    total: number;
    byReason: Record<CardExposureReason, number>;
    avgCardsPerRequest: number;
  } {
    const total = cardExposureLogs.length;

    const byReason: Record<CardExposureReason, number> = {
      same_store: 0,
      same_product: 0,
      same_category: 0,
      service_fallback: 0,
    };

    const requestIds = new Set<string>();

    cardExposureLogs.forEach(log => {
      byReason[log.reason]++;
      requestIds.add(log.requestId);
    });

    const avgCardsPerRequest = requestIds.size > 0
      ? total / requestIds.size
      : 0;

    return {
      total,
      byReason,
      avgCardsPerRequest: Math.round(avgCardsPerRequest * 100) / 100,
    };
  }
}

export const aiCardExposureService = AiCardExposureService.getInstance();
export default AiCardExposureService;
