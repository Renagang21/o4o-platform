/**
 * Copilot Engine — Enhanced Rule-Based Insight Analysis
 *
 * WO-O4O-COPILOT-ENGINE-INTEGRATION-V1
 *
 * 5 analysis patterns applied to service metrics:
 *   1. Approval Backlog — pending items requiring action
 *   2. Growth Trend — positive/negative delta detection
 *   3. Activity Drop — unusually low activity
 *   4. Order Spike — sudden increase detection
 *   5. Inactivity — zero-activity warning
 *
 * Returns AiSummaryItem[] (max 3, prioritized by severity).
 */

import type { AIServiceId } from '@o4o/ai-core';
import type { AiSummaryItem } from '../types/operator-dashboard.types.js';

// ─────────────────────────────────────────────────────
// Metric Helpers
// ─────────────────────────────────────────────────────

/** Safely extract a nested numeric value from metrics */
function getNum(metrics: Record<string, unknown>, path: string): number {
  const parts = path.split('.');
  let current: unknown = metrics;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return 0;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'number' ? current : 0;
}

// ─────────────────────────────────────────────────────
// Service-Specific Link Maps
// ─────────────────────────────────────────────────────

const SERVICE_LINKS: Record<AIServiceId, Record<string, string>> = {
  neture: {
    suppliers: '/workspace/operator/suppliers?status=PENDING',
    registrations: '/workspace/operator/registrations',
    products: '/workspace/operator/products?status=PENDING',
    orders: '/workspace/operator/orders',
  },
  glycopharm: {
    applications: '/operator/applications',
    products: '/operator/products?status=draft',
    pharmacies: '/operator/stores',
  },
  cosmetics: {
    products: '/operator/products?status=PENDING',
    orders: '/operator/orders',
  },
  glucoseview: {
    applications: '/operator/applications',
    pharmacists: '/operator/users',
    pharmacies: '/operator/stores',
  },
  kpa: {
    members: '/operator/members',
    content: '/operator/content?status=pending',
    signage: '/operator/signage',
    forum: '/operator/forum',
    storeAssets: '/operator/store-assets',
  },
};

function getLink(service: AIServiceId, key: string): string | undefined {
  return SERVICE_LINKS[service]?.[key];
}

// ─────────────────────────────────────────────────────
// Rule 1: Approval Backlog
// ─────────────────────────────────────────────────────

function checkApprovalBacklog(
  service: AIServiceId,
  metrics: Record<string, unknown>,
): AiSummaryItem[] {
  const items: AiSummaryItem[] = [];

  // Check all "pending" fields across metrics
  const pendingPaths: Array<{ path: string; label: string; linkKey: string }> = [];

  switch (service) {
    case 'neture':
      pendingPaths.push(
        { path: 'suppliers.pending', label: '공급사 승인 대기', linkKey: 'suppliers' },
        { path: 'registrations.pending', label: '가입 승인 대기', linkKey: 'registrations' },
        { path: 'products.pending', label: '상품 승인 대기', linkKey: 'products' },
      );
      break;
    case 'glycopharm':
      pendingPaths.push(
        { path: 'applications.pending', label: '입점 신청 대기', linkKey: 'applications' },
        { path: 'products.draft', label: '임시저장 상품', linkKey: 'products' },
      );
      break;
    case 'cosmetics':
      pendingPaths.push(
        { path: 'products.pending', label: '상품 승인 대기', linkKey: 'products' },
      );
      break;
    case 'glucoseview':
      pendingPaths.push(
        { path: 'applications.pending', label: '참여 신청 대기', linkKey: 'applications' },
        { path: 'pharmacists.pending', label: '약사 승인 대기', linkKey: 'pharmacists' },
      );
      break;
    case 'kpa':
      pendingPaths.push(
        { path: 'members.pending', label: '가입 승인 대기', linkKey: 'members' },
        { path: 'content.pending', label: '콘텐츠 승인 대기', linkKey: 'content' },
        { path: 'signage.pending', label: '사이니지 승인 대기', linkKey: 'signage' },
        { path: 'forum.pending', label: '포럼 요청 대기', linkKey: 'forum' },
      );
      break;
  }

  for (const { path, label, linkKey } of pendingPaths) {
    const count = getNum(metrics, path);
    if (count > 0) {
      items.push({
        id: `backlog-${path.replace(/\./g, '-')}`,
        message: `${label} ${count}건이 있습니다.`,
        level: count >= 10 ? 'critical' : 'warning',
        link: getLink(service, linkKey),
      });
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────
// Rule 2: Growth Trend
// ─────────────────────────────────────────────────────

function checkGrowthTrend(
  service: AIServiceId,
  metrics: Record<string, unknown>,
): AiSummaryItem[] {
  const items: AiSummaryItem[] = [];

  // Check delta/growth fields
  const growth = getNum(metrics, 'orders.growth');
  if (growth !== 0) {
    const direction = growth > 0 ? '증가' : '감소';
    const level = growth < -20 ? 'warning' : 'info';
    items.push({
      id: 'trend-orders',
      message: `주문이 전주 대비 ${Math.abs(growth)}% ${direction}했습니다.`,
      level,
      link: getLink(service, 'orders'),
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────
// Rule 3: Activity Drop
// ─────────────────────────────────────────────────────

function checkActivityDrop(
  service: AIServiceId,
  metrics: Record<string, unknown>,
): AiSummaryItem[] {
  const items: AiSummaryItem[] = [];

  // Check for inactive stores/pharmacies
  const inactive = getNum(metrics, 'stores.inactive') || getNum(metrics, 'pharmacies.inactive');
  const active = getNum(metrics, 'stores.active') || getNum(metrics, 'pharmacies.active');

  if (inactive > 0 && active > 0) {
    const ratio = inactive / (active + inactive);
    if (ratio > 0.3) {
      items.push({
        id: 'activity-drop',
        message: `비활성 매장이 ${inactive}곳으로, 전체의 ${Math.round(ratio * 100)}%입니다.`,
        level: ratio > 0.5 ? 'critical' : 'warning',
        link: getLink(service, 'pharmacies') || getLink(service, 'stores'),
      });
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────
// Rule 4: Order Spike
// ─────────────────────────────────────────────────────

function checkOrderSpike(
  service: AIServiceId,
  metrics: Record<string, unknown>,
): AiSummaryItem[] {
  const items: AiSummaryItem[] = [];

  const growth = getNum(metrics, 'orders.growth');
  if (growth > 50) {
    items.push({
      id: 'order-spike',
      message: `주문이 전주 대비 ${growth}% 급증했습니다. 재고 및 운영 상태를 점검하세요.`,
      level: 'warning',
      link: getLink(service, 'orders'),
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────
// Rule 5: Inactivity
// ─────────────────────────────────────────────────────

function checkInactivity(
  service: AIServiceId,
  metrics: Record<string, unknown>,
): AiSummaryItem[] {
  const items: AiSummaryItem[] = [];

  // KPA: expiring store assets
  const expiring = getNum(metrics, 'storeAssets.expiringSoon');
  if (expiring > 0) {
    items.push({
      id: 'expiry-soon',
      message: `강제노출 만료 임박 ${expiring}건이 있습니다.`,
      level: 'critical',
      link: getLink(service, 'storeAssets'),
    });
  }

  // Zero orders for commerce services
  if (['neture', 'cosmetics'].includes(service)) {
    const monthlyOrders = getNum(metrics, 'orders.monthly') || getNum(metrics, 'orders.active');
    if (monthlyOrders === 0) {
      items.push({
        id: 'no-orders',
        message: '최근 주문이 없습니다. 플랫폼 활동을 점검하세요.',
        level: 'warning',
      });
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────

/**
 * Generate rule-based insights from service metrics.
 * Returns up to 3 AiSummaryItem, prioritized: critical > warning > info.
 */
export function generateRuleBasedInsights(
  service: AIServiceId,
  metrics: Record<string, unknown>,
): AiSummaryItem[] {
  const allItems: AiSummaryItem[] = [
    ...checkApprovalBacklog(service, metrics),
    ...checkGrowthTrend(service, metrics),
    ...checkActivityDrop(service, metrics),
    ...checkOrderSpike(service, metrics),
    ...checkInactivity(service, metrics),
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = allItems.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Sort by severity: critical > warning > info
  const levelOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  unique.sort((a, b) => (levelOrder[a.level] ?? 2) - (levelOrder[b.level] ?? 2));

  // Return max 3 items
  const result = unique.slice(0, 3);

  // If no insights, return all-clear
  if (result.length === 0) {
    return [{
      id: 'all-clear',
      message: '현재 긴급한 처리 항목이 없습니다.',
      level: 'info',
    }];
  }

  return result;
}
