/**
 * K-Cosmetics Operator Config
 *
 * WO-O4O-OPERATOR-COSMETICS-MIGRATION-V1:
 *   operatorConfig 표준 패턴 적용.
 *   @o4o/operator-ux-core 5-Block 타입 기반 config builder.
 *   기존 inline buildDashboardConfig를 분리.
 */

import type {
  OperatorDashboardConfig,
  KpiItem,
  AiSummaryItem,
  ActionItem,
  ActivityItem,
  QuickActionItem,
} from '@o4o/operator-ux-core';
import type { OperatorDashboardSummary } from '@/services/operatorApi';

// ─── Config Builder ───

export function buildKCosmeticsOperatorConfig(
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
  // WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: deprecated items removed (analytics, support)
  const quickActions: QuickActionItem[] = [
    { id: 'qa-stores', label: '매장 관리', link: '/operator/stores', icon: '🏪' },
    { id: 'qa-applications', label: '입점 신청', link: '/operator/applications', icon: '📋' },
    { id: 'qa-products', label: '상품 관리', link: '/operator/products', icon: '🛍️' },
    { id: 'qa-orders', label: '주문 관리', link: '/operator/orders', icon: '📦' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage/content', icon: '🖥️' },
    { id: 'qa-ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: '🤖' },
    { id: 'qa-community', label: '커뮤니티', link: '/operator/community', icon: '💬' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}
