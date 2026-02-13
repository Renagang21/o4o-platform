/**
 * K-Cosmetics Operator Config
 *
 * OperatorDashboardSummary → OperatorDashboardConfig 변환.
 * WO-OPERATOR-SIGNAL-CORE-V1: 공통 signal 엔진 사용.
 *
 * WO-OPERATOR-CORE-PHASE4-KCOSMETICS
 */

import { Store, ShoppingCart, Users } from 'lucide-react';
import type {
  OperatorSignal,
  OperatorHeroConfig,
  OperatorSignalCardConfig,
  OperatorActivityItem,
  OperatorDashboardConfig,
} from '@o4o/operator-core';
import { computeOverallSignal, sortAndLimitActivity } from '@o4o/operator-core';
import type { OperatorDashboardSummary } from '@/services/operatorApi';

// ─── K-Cosmetics-specific signals ───

function getStoreSignal(data: OperatorDashboardSummary): OperatorSignal {
  const { totalStores } = data.stats;
  const pendingApps = data.recentApplications?.filter(a =>
    a.status === '승인대기' || a.status === '검토중' || a.status === '서류심사'
  ).length || 0;

  if (totalStores === 0) {
    return { status: 'alert', message: '등록된 매장 없음 — 초기 상태' };
  }
  if (pendingApps > 0) {
    return { status: 'warning', message: `매장 ${totalStores}개 · 승인 대기 ${pendingApps}건` };
  }
  return { status: 'good', message: `매장 ${totalStores}개 활성` };
}

function getOrderSignal(data: OperatorDashboardSummary): OperatorSignal {
  const { activeOrders } = data.stats;
  const hasOrders = (data.recentOrders?.length || 0) > 0;

  if (activeOrders === 0 && !hasOrders) {
    return { status: 'alert', message: '주문 내역 없음' };
  }
  if (activeOrders > 5) {
    return { status: 'warning', message: `처리 대기 주문 ${activeOrders}건` };
  }
  return { status: 'good', message: `활성 주문 ${activeOrders}건 정상` };
}

function getOperatorSignal(): OperatorSignal {
  return { status: 'good', message: '운영자 계정 관리' };
}

// ─── Activity feed builder ───

function buildActivityFeed(data: OperatorDashboardSummary): OperatorActivityItem[] {
  const items: OperatorActivityItem[] = [];

  for (const order of data.recentOrders || []) {
    items.push({
      id: `o-${order.id}`,
      type: 'order',
      title: `${order.store} — ${order.amount}`,
      detail: order.status,
      date: order.time,
    });
  }
  for (const app of data.recentApplications || []) {
    items.push({
      id: `a-${app.name}-${app.date}`,
      type: 'application',
      title: app.name,
      detail: `${app.type} · ${app.status}`,
      date: app.date,
    });
  }

  return sortAndLimitActivity(items);
}

// ─── Config builder ───

/** K-Cosmetics Operator 대시보드 Config */
export function buildKCosmeticsOperatorConfig(
  summary: OperatorDashboardSummary | null,
): OperatorDashboardConfig | null {
  if (!summary) return null;

  const storeSignal = getStoreSignal(summary);
  const orderSignal = getOrderSignal(summary);
  const operatorSignal = getOperatorSignal();
  const overall = computeOverallSignal([
    summary.stats.totalStores > 0,
    summary.stats.activeOrders > 0 || (summary.recentOrders?.length || 0) > 0,
    summary.stats.newSignups > 0 || summary.stats.totalStores > 0,
  ]);

  const hero: OperatorHeroConfig = {
    status: overall,
    title: '매장 운영 상태',
    statusDots: [
      { label: '매장', status: storeSignal.status },
      { label: '주문', status: orderSignal.status },
      { label: '운영', status: operatorSignal.status },
    ],
  };

  const signalCards: OperatorSignalCardConfig[] = [
    {
      icon: Store,
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      title: '매장 상태',
      signal: storeSignal,
      actionLabel: '매장 관리',
      actionLink: '/operator/stores',
    },
    {
      icon: ShoppingCart,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: '주문 상태',
      signal: orderSignal,
      actionLabel: '주문 관리',
      actionLink: '/operator/orders',
    },
    {
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: '운영자 상태',
      signal: operatorSignal,
      actionLabel: '회원 관리',
      actionLink: '/operator/users',
    },
  ];

  return {
    pageTitle: '운영자 대시보드',
    pageSubtitle: '매장 운영 현황을 한눈에 확인하세요',
    hero,
    signalCards,
    activityFeed: buildActivityFeed(summary),
  };
}
