/**
 * Unified Dashboard v1
 *
 * 목적: 역할별 대시보드를 단일 사용자 중심 대시보드로 통합
 * - 컨텍스트 기반 카드 시스템
 * - 우선순위 기반 정렬
 * - 조건부 카드 표시
 *
 * Status: Production (v1)
 */

import React, { useMemo } from 'react';
import { useUserContext } from './useUserContext';
import type { UnifiedCardConfig, CardSize } from './types';

// Card Components
import {
  OverviewCard,
  MyAccountCard,
  SellerCard,
  SupplierCard,
  PartnerCard,
  OperatorCard,
  KakaoConnectCard,
} from './cards';

/**
 * Card Registry
 * 모든 카드 설정 정의
 */
const CARD_REGISTRY: UnifiedCardConfig[] = [
  {
    id: 'overview',
    title: '오늘의 요약',
    size: 'large',
    priority: 'critical',
    showCondition: 'always',
    component: OverviewCard,
  },
  {
    id: 'my-account',
    title: '내 계정',
    size: 'medium',
    priority: 'high',
    showCondition: 'always',
    component: MyAccountCard,
  },
  {
    id: 'seller',
    title: '판매자 현황',
    size: 'medium',
    priority: 'high',
    showCondition: ['seller'],
    component: SellerCard,
  },
  {
    id: 'supplier',
    title: '공급자 현황',
    size: 'medium',
    priority: 'high',
    showCondition: ['supplier'],
    component: SupplierCard,
  },
  {
    id: 'partner',
    title: '파트너 현황',
    size: 'medium',
    priority: 'high',
    showCondition: ['partner'],
    component: PartnerCard,
  },
  {
    id: 'operator',
    title: '운영 현황',
    size: 'medium',
    priority: 'high',
    showCondition: ['operator', 'admin'],
    component: OperatorCard,
  },
  {
    id: 'kakao-connect',
    title: '카카오톡 연결',
    size: 'small',
    priority: 'low',
    showCondition: 'always',
    component: KakaoConnectCard,
  },
];

/**
 * Priority order for sorting
 */
const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Card size to grid span mapping
 */
const SIZE_TO_SPAN: Record<CardSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
  full: 'col-span-1 md:col-span-2 lg:col-span-3',
};

/**
 * Card Wrapper Component
 */
const CardWrapper: React.FC<{
  config: UnifiedCardConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  return (
    <div
      className={`${SIZE_TO_SPAN[config.size]} bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden`}
    >
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">{config.title}</h3>
      </div>
      {/* Card Content */}
      <div className="p-4">{children}</div>
    </div>
  );
};

/**
 * Unified Dashboard Component
 */
export const UnifiedDashboard: React.FC = () => {
  const { contexts, shouldShowCard, isLoading } = useUserContext();

  // Filter and sort cards based on user context
  const visibleCards = useMemo(() => {
    return CARD_REGISTRY.filter((card) => shouldShowCard(card.showCondition)).sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );
  }, [shouldShowCard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">
          활성 컨텍스트:{' '}
          {contexts.length > 0 ? (
            contexts.map((ctx) => (
              <span
                key={ctx}
                className="inline-block px-2 py-0.5 mx-1 text-xs font-medium bg-blue-100 text-blue-700 rounded"
              >
                {ctx}
              </span>
            ))
          ) : (
            <span className="text-gray-400">없음</span>
          )}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((cardConfig) => {
          const CardComponent = cardConfig.component;
          return (
            <CardWrapper key={cardConfig.id} config={cardConfig}>
              <CardComponent config={cardConfig} />
            </CardWrapper>
          );
        })}
      </div>

      {/* Version Info */}
      <div className="mt-8 p-3 bg-gray-100 rounded-lg">
        <p className="text-xs text-gray-500 text-center">
          통합 대시보드 v1 - Context-based Dashboard
        </p>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
