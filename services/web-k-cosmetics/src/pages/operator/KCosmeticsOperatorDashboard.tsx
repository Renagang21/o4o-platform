/**
 * KCosmeticsOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-K-COSMETICS-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   기존 API 데이터(OperatorDashboardSummary)를 OperatorDashboardConfig로 변환.
 *
 * Block 구조:
 *  [1] KPI Grid       — 핵심 수치 (매장, 주문, 매출, 신규가입)
 *  [2] AI Summary     — 운영 인사이트 (상태 기반)
 *  [3] Action Queue   — 즉시 처리 항목
 *  [4] Activity Log   — 최근 주문/입점신청
 *  [5] Quick Actions  — 빠른 작업 카드
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
import { operatorApi, type OperatorDashboardSummary } from '@/services/operatorApi';

// ─── Data Transformer ───

function buildDashboardConfig(
  data: OperatorDashboardSummary,
): OperatorDashboardConfig {
  const { stats, recentOrders, recentApplications } = data;

  // Block 1: KPI Grid
  const kpis: KpiItem[] = [
    {
      key: 'stores',
      label: '총 매장',
      value: stats.totalStores,
      status: stats.totalStores === 0 ? 'critical' : 'neutral',
    },
    {
      key: 'orders',
      label: '활성 주문',
      value: stats.activeOrders,
      status: stats.activeOrders === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'revenue',
      label: '월간 매출',
      value: stats.monthlyRevenue,
    },
    {
      key: 'signups',
      label: '신규 가입',
      value: stats.newSignups,
      status: stats.newSignups > 10 ? 'warning' : 'neutral',
    },
  ];

  // Block 2: AI Summary (상태 기반 인사이트)
  const aiSummary: AiSummaryItem[] = [];
  if (stats.totalStores === 0) {
    aiSummary.push({
      id: 'ai-no-stores',
      message: '등록된 매장이 없습니다. 입점 신청을 확인하세요.',
      level: 'critical',
      link: '/operator/applications',
    });
  }
  if (stats.activeOrders === 0) {
    aiSummary.push({
      id: 'ai-no-orders',
      message: '활성 주문이 없습니다. 매장 운영 상태를 확인하세요.',
      level: 'warning',
    });
  }
  const pendingApps = recentApplications.filter((a) => a.status === 'pending');
  if (pendingApps.length > 0) {
    aiSummary.push({
      id: 'ai-pending-apps',
      message: `입점 신청 ${pendingApps.length}건이 검토 대기 중입니다.`,
      level: pendingApps.length > 3 ? 'warning' : 'info',
      link: '/operator/applications',
    });
  }

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [];
  if (pendingApps.length > 0) {
    actionQueue.push({
      id: 'aq-applications',
      label: '입점 신청 검토',
      count: pendingApps.length,
      link: '/operator/applications',
    });
  }
  const processingOrders = recentOrders.filter(
    (o) => o.status === 'processing' || o.status === 'pending',
  );
  if (processingOrders.length > 0) {
    actionQueue.push({
      id: 'aq-orders',
      label: '처리 중 주문',
      count: processingOrders.length,
      link: '/operator/orders',
    });
  }

  // Block 4: Activity Log
  const activityLog: ActivityItem[] = [];
  for (const o of recentOrders) {
    activityLog.push({
      id: `o-${o.id}`,
      message: `주문 ${o.store} · ${o.amount} (${o.status})`,
      timestamp: o.time,
    });
  }
  for (const a of recentApplications) {
    activityLog.push({
      id: `app-${a.name}-${a.date}`,
      message: `입점신청: ${a.name} (${a.type}) — ${a.status}`,
      timestamp: a.date,
    });
  }
  activityLog.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  activityLog.splice(10);

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'qa-applications', label: '입점 신청', link: '/operator/applications', icon: '📋' },
    { id: 'qa-products', label: '상품 관리', link: '/operator/products', icon: '🛍️' },
    { id: 'qa-orders', label: '주문 관리', link: '/operator/orders', icon: '📦' },
    { id: 'qa-analytics', label: '매출 분석', link: '/operator/analytics', icon: '📊' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage', icon: '🖥️' },
    { id: 'qa-support', label: '고객 지원', link: '/operator/support', icon: '💬' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}

// ─── Component ───

export default function KCosmeticsOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatorApi.getDashboardSummary();
      if (data) {
        setConfig(buildDashboardConfig(data));
      } else {
        setError('데이터를 불러올 수 없습니다.');
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
