/**
 * KPA Operator Config
 *
 * WO-O4O-OPERATOR-KPA-MIGRATION-V1:
 *   operatorConfig 표준 패턴 적용.
 *   @o4o/operator-ux-core 5-Block 타입 기반 config builder.
 *
 * WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1:
 *   Admin/Operator 역할별 KPI·ActionQueue·QuickActions 차등.
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
}

// ─── Config Builder ───

export function buildKpaOperatorConfig(
  data: KpaExtendedData,
  isAdmin: boolean,
): OperatorDashboardConfig {
  const { summary, pendingMembers, totalMembers, serviceApplicationCount, pharmacyRequestCount, storeStats } = data;

  if (!summary) {
    return { kpis: [], actionQueue: [], activityLog: [], quickActions: [] };
  }

  // WO-KPA-OPERATOR-KPI-REALIGN-V1: Action Required 중심 KPI
  const contentDraftCount = summary.content?.pendingDraft ?? 0;
  const forumPendingCount = summary.forum?.pendingRequests ?? 0;
  const signagePendingCount = (summary.signage?.pendingMedia ?? 0) + (summary.signage?.pendingPlaylists ?? 0);

  // Block 1: KPI Grid — Action Required Only
  const kpis: KpiItem[] = [
    {
      key: 'pending',
      label: '회원 승인 대기',
      value: pendingMembers,
      status: pendingMembers > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'forum',
      label: '포럼 요청 대기',
      value: forumPendingCount,
      status: forumPendingCount > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'content',
      label: '콘텐츠 발행 대기',
      value: contentDraftCount,
      status: contentDraftCount > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'signage',
      label: '사이니지 검수 대기',
      value: signagePendingCount,
      status: signagePendingCount > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'pharmacy-requests',
      label: '약국 서비스 신청',
      value: pharmacyRequestCount,
      status: pharmacyRequestCount > 0 ? 'warning' : 'neutral',
    },
    // WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1: Store KPI
    ...(storeStats ? [{
      key: 'stores',
      label: '매장 현황',
      value: `${storeStats.activeStores}/${storeStats.totalStores}`,
      status: 'neutral' as const,
    }] : []),
    // WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1: Admin 추가 KPI
    ...(isAdmin ? [
      {
        key: 'total-members',
        label: '전체 회원',
        value: totalMembers,
        status: 'neutral' as const,
      },
      {
        key: 'service-apps',
        label: '서비스 신청',
        value: serviceApplicationCount,
        status: serviceApplicationCount > 0 ? 'warning' as const : 'neutral' as const,
      },
    ] : []),
  ];

  // Block 2: AI Summary (상태 기반 규칙형) — Action Required 중심
  const aiSummary: AiSummaryItem[] = [];
  if (pendingMembers > 0) {
    aiSummary.push({
      id: 'ai-pending-members',
      message: `회원 승인 대기 ${pendingMembers}건이 있습니다. 신속한 처리를 권장합니다.`,
      level: pendingMembers > 5 ? 'warning' : 'info',
      link: '/operator/members',
    });
  }
  if (forumPendingCount > 0) {
    aiSummary.push({
      id: 'ai-forum-requests',
      message: `포럼 카테고리 요청 ${forumPendingCount}건이 대기 중입니다.`,
      level: 'warning',
      link: '/operator/forum-management',
    });
  }
  if (contentDraftCount > 0) {
    aiSummary.push({
      id: 'ai-content-draft',
      message: `콘텐츠 ${contentDraftCount}건이 발행 대기(draft) 상태입니다.`,
      level: 'info',
      link: '/operator/content',
    });
  }
  if (signagePendingCount > 0) {
    aiSummary.push({
      id: 'ai-signage-pending',
      message: `사이니지 ${signagePendingCount}건이 검수 대기 상태입니다.`,
      level: 'info',
      link: '/operator/signage/content',
    });
  }
  if (pharmacyRequestCount > 0) {
    aiSummary.push({
      id: 'ai-pharmacy-requests',
      message: `약국 서비스 신청 ${pharmacyRequestCount}건이 대기 중입니다. 승인 처리가 필요합니다.`,
      level: pharmacyRequestCount > 3 ? 'warning' : 'info',
      link: '/operator/pharmacy-requests',
    });
  }
  // WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1: Admin 추가 인사이트
  if (isAdmin && serviceApplicationCount > 0) {
    aiSummary.push({
      id: 'ai-service-apps',
      message: `서비스 신청 ${serviceApplicationCount}건이 대기 중입니다.`,
      level: serviceApplicationCount > 3 ? 'warning' : 'info',
      link: '/operator/organization-requests',
    });
  }

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
  // WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1: Admin 추가 Action Queue
  if (isAdmin) {
    if (serviceApplicationCount > 0) {
      actionQueue.push({
        id: 'aq-service-apps',
        label: '서비스 신청 검토',
        count: serviceApplicationCount,
        link: '/operator/organization-requests',
      });
    }
    actionQueue.push({
      id: 'aq-policy-check',
      label: '서비스 정책 점검',
      count: 0,
      link: '/operator/operators',
    });
  }

  // Block 4: Activity Log (핵심 — 콘텐츠 흐름)
  const activityLog: ActivityItem[] = [];
  for (const c of summary.content?.recentItems ?? []) {
    activityLog.push({
      id: `c-${c.id}`,
      message: `콘텐츠: ${c.title}`,
      timestamp: c.publishedAt || c.createdAt,
    });
  }
  for (const p of summary.forum?.recentPosts ?? []) {
    activityLog.push({
      id: `f-${p.id}`,
      message: `포럼: ${p.title}${p.authorName ? ` (${p.authorName})` : ''}`,
      timestamp: p.createdAt,
    });
  }
  for (const m of summary.signage?.recentMedia ?? []) {
    activityLog.push({
      id: `m-${m.id}`,
      message: `사이니지: ${m.name}`,
      timestamp: '', // MediaItem has no timestamp, will sort to end
    });
  }
  // Filter out items with no timestamp, sort descending, limit 15
  const validLog = activityLog.filter((a) => a.timestamp);
  validLog.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  validLog.splice(15);

  // Block 5: Quick Actions (핵심 — Hub 기능 흡수)
  const quickActions: QuickActionItem[] = [
    { id: 'qa-community', label: '커뮤니티 관리', link: '/operator/community-management', icon: '🏠' },
    { id: 'qa-forum', label: '포럼 관리', link: '/operator/forum-management', icon: '💬' },
    { id: 'qa-content', label: '콘텐츠 관리', link: '/operator/content', icon: '📝' },
    { id: 'qa-news', label: '공지사항', link: '/operator/news', icon: '📢' },
    { id: 'qa-docs', label: '자료실', link: '/operator/docs', icon: '📁' },
    { id: 'qa-requests', label: '조직 가입 요청', link: '/operator/organization-requests', icon: '👥' },
    { id: 'qa-pharmacy-requests', label: '약국 서비스 신청', link: '/operator/pharmacy-requests', icon: '💊' },
    { id: 'qa-product-apps', label: '상품 신청 관리', link: '/operator/product-applications', icon: '🛒' },
    { id: 'qa-members', label: '회원 관리', link: '/operator/members', icon: '🧑‍💼' },
    { id: 'qa-stores', label: '매장 관리', link: '/operator/stores', icon: '🏪' },
    { id: 'qa-store-channels', label: '채널 관리', link: '/operator/store-channels', icon: '📡' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage/content', icon: '🖥️' },
    { id: 'qa-ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: '📊' },
    // WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1: Admin 추가 Quick Actions
    ...(isAdmin ? [
      { id: 'qa-operators', label: '운영자 관리', link: '/operator/operators', icon: '⚙️' },
    ] : []),
  ];

  return { kpis, aiSummary, actionQueue, activityLog: validLog, quickActions };
}
