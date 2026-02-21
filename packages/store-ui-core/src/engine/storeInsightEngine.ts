/**
 * Store Insight Engine — Rule-based 경영 인사이트
 * WO-STORE-AI-INSIGHT-LAYER-V1
 * WO-STORE-INSIGHT-ACTION-BRIDGE-V1: Action 연결
 *
 * Phase 1: 4개 Rule 기반 판단
 * Phase 2+: LLM 자연어 요약, 자동 Action (별도 WO)
 */

export type InsightLevel = 'info' | 'warning' | 'critical';

export interface StoreInsightAction {
  label: string;
  target: string;
}

export interface StoreInsight {
  level: InsightLevel;
  code: string;
  message: string;
  recommendation?: string;
  action?: StoreInsightAction;
}

export interface StoreInsightInput {
  monthlyRevenue: number;
  totalOrders: number;
  inProgressOrders: number;
  activeChannels: number;
  totalChannels: number;
  visibleProducts: number;
}

/**
 * Rule-based insight 생성 (최대 3개 반환, 우선순위: critical > warning > info)
 */
export function computeStoreInsights(input: StoreInsightInput): StoreInsight[] {
  const insights: StoreInsight[] = [];

  // Rule 1 — 매출 저조
  if (input.monthlyRevenue === 0) {
    insights.push({
      level: 'critical',
      code: 'REVENUE_ZERO',
      message: '이번 달 매출이 없습니다.',
      recommendation: '상품 진열 상태와 채널 활성화를 확인하세요.',
      action: { label: '상품 관리로 이동', target: '/store/products' },
    });
  }

  // Rule 2 — 주문 정체
  if (input.inProgressOrders > 20) {
    insights.push({
      level: 'warning',
      code: 'ORDERS_BACKLOG',
      message: `진행 중 주문이 ${input.inProgressOrders}건으로 많습니다.`,
      recommendation: '미처리 주문을 확인하고 배송 처리를 진행하세요.',
      action: { label: '주문 관리로 이동', target: '/store/orders' },
    });
  }

  // Rule 3 — 채널 미활성
  if (input.totalChannels > 0 && input.activeChannels < input.totalChannels) {
    const inactive = input.totalChannels - input.activeChannels;
    insights.push({
      level: 'info',
      code: 'CHANNELS_INACTIVE',
      message: `비활성 채널이 ${inactive}개 존재합니다.`,
      recommendation: '채널 관리에서 활성화를 검토하세요.',
      action: { label: '채널 관리로 이동', target: '/store/channels' },
    });
  }

  // Rule 4 — 상품 부족
  if (input.visibleProducts < 5) {
    insights.push({
      level: 'info',
      code: 'PRODUCTS_LOW',
      message: `진열 상품이 ${input.visibleProducts}개로 적습니다.`,
      recommendation: '상품 관리에서 진열 상품을 추가하세요.',
      action: { label: '상품 관리로 이동', target: '/store/products' },
    });
  }

  // 우선순위 정렬 + 최대 3개
  const priority: Record<InsightLevel, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => priority[a.level] - priority[b.level]);

  return insights.slice(0, 3);
}
