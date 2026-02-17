/**
 * GlycoPharmOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-GLYCOPHARM-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   기존 API(glycopharmApi.getOperatorDashboard())를 그대로 활용.
 *
 * Block 구조:
 *  [1] KPI Grid       — 약국, 스토어, 상품, 주문, 매출, 포럼
 *  [2] AI Summary     — 운영 상태 기반 인사이트 (AI 의존도 낮음)
 *  [3] Action Queue   — 승인 대기, 보완 요청, 상품 발행 대기
 *  [4] Activity Log   — 운영 현황 요약
 *  [5] Quick Actions  — 주요 업무 바로가기
 */

import { useState, useEffect, useCallback } from 'react';
import {
  OperatorDashboardLayout,
  type OperatorDashboardConfig,
  type KpiItem,
  type AiSummaryItem,
  type ActionItem,
  type ActivityItem,
  type QuickActionItem,
} from '@o4o/operator-ux-core';
import { glycopharmApi, type OperatorDashboardData } from '@/api/glycopharm';

// ─── Data Transformer ───

function buildDashboardConfig(
  data: OperatorDashboardData,
): OperatorDashboardConfig {
  const { serviceStatus, storeStatus, productStats, orderStats, forumStatus, contentStatus } = data;

  // Block 1: KPI Grid
  const kpis: KpiItem[] = [
    {
      key: 'pharmacies',
      label: '활성 약국',
      value: serviceStatus.activePharmacies,
      status: serviceStatus.activePharmacies === 0 ? 'critical' : 'neutral',
    },
    {
      key: 'stores',
      label: '운영 스토어',
      value: storeStatus.activeStores,
      status: storeStatus.activeStores === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'products',
      label: '활성 상품',
      value: `${productStats.active}/${productStats.total}`,
    },
    {
      key: 'orders',
      label: '총 주문',
      value: orderStats.totalOrders,
    },
    {
      key: 'revenue',
      label: '총 매출',
      value: `₩${orderStats.totalRevenue.toLocaleString()}`,
    },
    {
      key: 'forum',
      label: '포럼 게시글',
      value: forumStatus.totalPosts,
    },
  ];

  // Block 2: AI Summary (운영 상태 기반 — AI 의존도 낮음)
  const aiSummary: AiSummaryItem[] = [];
  if (storeStatus.pendingApprovals > 0) {
    aiSummary.push({
      id: 'ai-pending',
      message: `스토어 승인 대기 ${storeStatus.pendingApprovals}건이 있습니다. 빠른 처리를 권장합니다.`,
      level: 'warning',
      link: '/operator/applications',
    });
  }
  if (storeStatus.supplementRequests > 0) {
    aiSummary.push({
      id: 'ai-supplement',
      message: `보완 요청 ${storeStatus.supplementRequests}건이 미처리 상태입니다.`,
      level: 'warning',
    });
  }
  if (productStats.draft > 0) {
    aiSummary.push({
      id: 'ai-draft',
      message: `임시저장 상품 ${productStats.draft}건이 발행 대기 중입니다.`,
      level: 'info',
      link: '/operator/products',
    });
  }
  const totalContent = contentStatus.hero.total + contentStatus.featured.total + contentStatus.eventNotice.total;
  if (totalContent === 0) {
    aiSummary.push({
      id: 'ai-content',
      message: '등록된 콘텐츠가 없습니다. 스토어 콘텐츠를 구성하세요.',
      level: 'warning',
    });
  }

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [];
  if (storeStatus.pendingApprovals > 0) {
    actionQueue.push({
      id: 'aq-approvals',
      label: '스토어 승인 대기',
      count: storeStatus.pendingApprovals,
      link: '/operator/applications',
    });
  }
  if (storeStatus.supplementRequests > 0) {
    actionQueue.push({
      id: 'aq-supplement',
      label: '보완 요청 처리',
      count: storeStatus.supplementRequests,
      link: '/operator/applications',
    });
  }
  if (productStats.draft > 0) {
    actionQueue.push({
      id: 'aq-draft',
      label: '상품 발행 대기',
      count: productStats.draft,
      link: '/operator/products',
    });
  }

  // Block 4: Activity Log (운영 현황 요약 — 실시간 활동 API 없음)
  const now = new Date().toISOString();
  const activityLog: ActivityItem[] = [
    {
      id: 'al-pharmacies',
      message: `활성 약국 ${serviceStatus.activePharmacies}개 운영 중`,
      timestamp: serviceStatus.lastUpdated || now,
    },
    {
      id: 'al-stores',
      message: `스토어 ${storeStatus.activeStores}개 활성, ${storeStatus.inactiveStores}개 비활성`,
      timestamp: now,
    },
    {
      id: 'al-products',
      message: `상품 ${productStats.total}개 등록 (활성 ${productStats.active}개)`,
      timestamp: now,
    },
    {
      id: 'al-orders',
      message: `주문 ${orderStats.totalOrders}건, 결제완료 ${orderStats.paidOrders}건`,
      timestamp: now,
    },
    {
      id: 'al-forum',
      message: `포럼 ${forumStatus.open}개 공개, 게시글 ${forumStatus.totalPosts}개`,
      timestamp: now,
    },
  ];

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'qa-applications', label: '신청 관리', link: '/operator/applications', icon: '📋' },
    { id: 'qa-products', label: '상품 관리', link: '/operator/products', icon: '📦' },
    { id: 'qa-orders', label: '주문 관리', link: '/operator/orders', icon: '🛒' },
    { id: 'qa-analytics', label: '분석 보기', link: '/operator/analytics', icon: '📊' },
    { id: 'qa-settlements', label: '정산 관리', link: '/operator/settlements', icon: '💰' },
    { id: 'qa-marketing', label: '마케팅', link: '/operator/marketing', icon: '📢' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}

// ─── Component ───

export default function GlycoPharmOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycopharmApi.getOperatorDashboard();
      if (res.success && res.data) {
        setConfig(buildDashboardConfig(res.data));
      }
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <OperatorDashboardLayout config={config} />;
}
