/**
 * KPA Operator Config
 *
 * WO-O4O-OPERATOR-KPA-MIGRATION-V1:
 *   operatorConfig 표준 패턴 적용.
 *   @o4o/operator-ux-core 5-Block 타입 기반 config builder.
 *
 * WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1:
 *   Admin/Operator 역할별 KPI·ActionQueue·QuickActions 차등.
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1:
 *   KPA-a 운영 업무 중심 5-Block 재정비.
 *   상품 신청 KPI/AQ 추가, 무관 항목 제거, Quick Actions 축소.
 */

import type {
  OperatorDashboardConfig,
  KpiItem,
  AiSummaryItem,
  ActionItem,
  ActivityItem,
  QuickActionItem,
} from '@o4o/operator-ux-core';
import type { OperatorSummary } from '../../api/operator';

// ─── Extended Data (Dashboard에서 fetch한 복합 데이터) ───

export interface KpaExtendedData {
  summary: OperatorSummary | null;
  pendingMembers: number;
  totalMembers: number;
  serviceApplicationCount: number;
  pharmacyRequestCount: number;
  // WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1
  storeStats: { totalStores: number; activeStores: number } | null;
  // WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1: 상품 신청 대기
  productApplicationPendingCount: number;
}

// ─── Config Builder ───

export function buildKpaOperatorConfig(
  data: KpaExtendedData,
  isAdmin: boolean,
): OperatorDashboardConfig {
  const { summary, pendingMembers, totalMembers, serviceApplicationCount, pharmacyRequestCount, storeStats, productApplicationPendingCount } = data;

  if (!summary) {
    return { kpis: [], actionQueue: [], activityLog: [], quickActions: [] };
  }

  // WO-KPA-OPERATOR-KPI-REALIGN-V1: Action Required 중심 KPI
  const contentDraftCount = summary.content?.pendingDraft ?? 0;
  const forumPendingCount = summary.forum?.pendingRequests ?? 0;
  const signagePendingCount = (summary.signage?.pendingMedia ?? 0) + (summary.signage?.pendingPlaylists ?? 0);

  // Block 1: KPI Grid — Action Required Only + link connectivity
  const kpis: KpiItem[] = [
    {
      key: 'pending',
      label: '회원 승인 대기',
      value: pendingMembers,
      status: pendingMembers > 0 ? 'warning' : 'neutral',
      link: '/operator/members',
    },
    {
      key: 'forum',
      label: '포럼 요청 대기',
      value: forumPendingCount,
      status: forumPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/forum-management',
    },
    {
      key: 'content',
      label: '콘텐츠 발행 대기',
      value: contentDraftCount,
      status: contentDraftCount > 0 ? 'warning' : 'neutral',
      link: '/operator/content',
    },
    {
      key: 'signage',
      label: '사이니지 검수 대기',
      value: signagePendingCount,
      status: signagePendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/signage/content',
    },
    {
      key: 'pharmacy-requests',
      label: '약국 서비스 신청',
      value: pharmacyRequestCount,
      status: pharmacyRequestCount > 0 ? 'warning' : 'neutral',
      link: '/operator/pharmacy-requests',
    },
    {
      key: 'product-applications',
      label: '상품 신청 대기',
      value: productApplicationPendingCount,
      status: productApplicationPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/product-applications',
    },
    ...(storeStats ? [{
      key: 'stores',
      label: '매장 현황',
      value: `${storeStats.activeStores}/${storeStats.totalStores}`,
      status: 'neutral' as const,
      link: '/operator/stores',
    }] : []),
    ...(isAdmin ? [
      {
        key: 'total-members',
        label: '전체 회원',
        value: totalMembers,
        status: 'neutral' as const,
        link: '/operator/members',
      },
      {
        key: 'service-apps',
        label: '서비스 신청',
        value: serviceApplicationCount,
        status: serviceApplicationCount > 0 ? 'warning' as const : 'neutral' as const,
        link: '/operator/organization-requests',
      },
    ] : []),
  ];

  // Block 2: AI Summary — WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2
  // Action-oriented phrasing + severity escalation + sort by priority
  const levelOrder = { critical: 0, warning: 1, info: 2 };
  const aiSummary: AiSummaryItem[] = [];
  if (pendingMembers > 0) {
    const level = pendingMembers > 10 ? 'critical' : pendingMembers > 3 ? 'warning' : 'info';
    aiSummary.push({
      id: 'ai-pending-members',
      message: pendingMembers > 5
        ? `회원 승인 ${pendingMembers}건 긴급 — 즉시 처리가 필요합니다.`
        : `회원 승인 ${pendingMembers}건 대기 — 검토해 주세요.`,
      level,
      link: '/operator/members',
    });
  }
  if (forumPendingCount > 0) {
    aiSummary.push({
      id: 'ai-forum-requests',
      message: `포럼 요청 ${forumPendingCount}건 대기 — 카테고리 검토가 필요합니다.`,
      level: forumPendingCount > 5 ? 'warning' : 'info',
      link: '/operator/forum-management',
    });
  }
  if (pharmacyRequestCount > 0) {
    const level = pharmacyRequestCount > 5 ? 'critical' : pharmacyRequestCount > 2 ? 'warning' : 'info';
    aiSummary.push({
      id: 'ai-pharmacy-requests',
      message: pharmacyRequestCount > 3
        ? `약국 서비스 신청 ${pharmacyRequestCount}건 긴급 — 승인 처리가 필요합니다.`
        : `약국 서비스 신청 ${pharmacyRequestCount}건 대기 — 검토해 주세요.`,
      level,
      link: '/operator/pharmacy-requests',
    });
  }
  if (productApplicationPendingCount > 0) {
    aiSummary.push({
      id: 'ai-product-applications',
      message: productApplicationPendingCount > 3
        ? `상품 신청 ${productApplicationPendingCount}건 긴급 — 승인 처리가 필요합니다.`
        : `상품 신청 ${productApplicationPendingCount}건 대기 — 검토해 주세요.`,
      level: productApplicationPendingCount > 3 ? 'warning' : 'info',
      link: '/operator/product-applications',
    });
  }
  if (contentDraftCount > 0) {
    aiSummary.push({
      id: 'ai-content-draft',
      message: `콘텐츠 ${contentDraftCount}건 발행 대기 — 검토 후 발행해 주세요.`,
      level: contentDraftCount > 5 ? 'warning' : 'info',
      link: '/operator/content',
    });
  }
  if (signagePendingCount > 0) {
    aiSummary.push({
      id: 'ai-signage-pending',
      message: `사이니지 ${signagePendingCount}건 검수 대기 — 확인이 필요합니다.`,
      level: signagePendingCount > 3 ? 'warning' : 'info',
      link: '/operator/signage/content',
    });
  }
  if (isAdmin && serviceApplicationCount > 0) {
    aiSummary.push({
      id: 'ai-service-apps',
      message: serviceApplicationCount > 3
        ? `서비스 신청 ${serviceApplicationCount}건 긴급 — 승인 처리가 필요합니다.`
        : `서비스 신청 ${serviceApplicationCount}건 대기 — 검토해 주세요.`,
      level: serviceApplicationCount > 3 ? 'warning' : 'info',
      link: '/operator/organization-requests',
    });
  }
  // Sort by severity (critical → warning → info), then limit to top 3 — builder decides final output
  aiSummary.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  aiSummary.splice(3);

  // Block 3: Action Queue — Action Required Only
  const actionQueue: ActionItem[] = [];
  if (pendingMembers > 0) {
    actionQueue.push({
      id: 'aq-members',
      label: '회원 승인 검토',
      count: pendingMembers,
      link: '/operator/members',
    });
  }
  if (forumPendingCount > 0) {
    actionQueue.push({
      id: 'aq-forum',
      label: '포럼 요청 검토',
      count: forumPendingCount,
      link: '/operator/forum-management',
    });
  }
  if (contentDraftCount > 0) {
    actionQueue.push({
      id: 'aq-content',
      label: '콘텐츠 발행 대기',
      count: contentDraftCount,
      link: '/operator/content',
    });
  }
  if (signagePendingCount > 0) {
    actionQueue.push({
      id: 'aq-signage',
      label: '사이니지 검수 대기',
      count: signagePendingCount,
      link: '/operator/signage/content',
    });
  }
  if (pharmacyRequestCount > 0) {
    actionQueue.push({
      id: 'aq-pharmacy-requests',
      label: '약국 서비스 신청 검토',
      count: pharmacyRequestCount,
      link: '/operator/pharmacy-requests',
    });
  }
  // WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1: 상품 신청 Action Queue
  if (productApplicationPendingCount > 0) {
    actionQueue.push({
      id: 'aq-product-applications',
      label: '상품 신청 검토',
      count: productApplicationPendingCount,
      link: '/operator/product-applications',
    });
  }
  // WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1: Admin 추가 Action Queue
  if (isAdmin && serviceApplicationCount > 0) {
    actionQueue.push({
      id: 'aq-service-apps',
      label: '서비스 신청 검토',
      count: serviceApplicationCount,
      link: '/operator/organization-requests',
    });
  }

  // Block 4: Activity Log — WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2: source expansion + links
  const activityLog: ActivityItem[] = [];
  for (const c of summary.content?.recentItems ?? []) {
    activityLog.push({
      id: `c-${c.id}`,
      message: `콘텐츠: ${c.title}`,
      timestamp: c.publishedAt || c.createdAt,
      link: '/operator/content',
    });
  }
  for (const p of summary.forum?.recentPosts ?? []) {
    activityLog.push({
      id: `f-${p.id}`,
      message: `포럼: ${p.title}${p.authorName ? ` (${p.authorName})` : ''}`,
      timestamp: p.createdAt,
      link: '/operator/forum',
    });
  }
  for (const m of summary.signage?.recentMedia ?? []) {
    activityLog.push({
      id: `m-${m.id}`,
      message: `사이니지: ${m.name}`,
      timestamp: '',
      link: '/operator/signage/content',
    });
  }
  // Operational events from recentActivity
  const activityLinkMap: Record<string, string> = {
    member_join: '/operator/members',
    pharmacy_request: '/operator/pharmacy-requests',
    application: '/operator/members',
    org_join: '/operator/organization-requests',
  };
  for (const evt of summary.recentActivity ?? []) {
    activityLog.push({
      id: `ra-${evt.type}-${evt.timestamp}`,
      message: `${evt.label}`,
      timestamp: evt.timestamp,
      link: activityLinkMap[evt.type] || undefined,
    });
  }
  // Filter out items with no timestamp, sort descending, limit 15
  const validLog = activityLog.filter((a) => a.timestamp);
  validLog.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  validLog.splice(15);

  // Block 5: Quick Actions — WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2: role-based split
  const quickActions: QuickActionItem[] = [
    // Operator 기본 8개
    { id: 'qa-members', label: '회원 관리', link: '/operator/members', icon: '🧑‍💼' },
    { id: 'qa-pharmacy-requests', label: '약국 서비스 신청', link: '/operator/pharmacy-requests', icon: '💊' },
    { id: 'qa-product-apps', label: '상품 신청 관리', link: '/operator/product-applications', icon: '🛒' },
    { id: 'qa-content', label: '콘텐츠 관리', link: '/operator/content', icon: '📝' },
    { id: 'qa-news', label: '공지사항', link: '/operator/news', icon: '📢' },
    { id: 'qa-forum', label: '포럼 관리', link: '/operator/forum-management', icon: '💬' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage/content', icon: '🖥️' },
    { id: 'qa-stores', label: '매장 관리', link: '/operator/stores', icon: '🏪' },
    // Admin 추가 4개
    ...(isAdmin ? [
      { id: 'qa-requests', label: '조직 가입 요청', link: '/operator/organization-requests', icon: '👥' },
      { id: 'qa-community', label: 'Home 편집', link: '/operator/community', icon: '🏠' },
      { id: 'qa-roles', label: '역할 관리', link: '/operator/roles', icon: '🔑' },
      { id: 'qa-audit', label: '감사 로그', link: '/operator/audit-logs', icon: '📋' },
    ] : []),
  ];

  return { kpis, aiSummary, actionQueue, activityLog: validLog, quickActions };
}
