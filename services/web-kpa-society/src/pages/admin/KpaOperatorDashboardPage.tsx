/**
 * KpaOperatorDashboardPage — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-KPA-C-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   기존 WordPress 스타일 커스텀 UI를 교체.
 *   기존 API(adminApi, joinRequestApi)를 그대로 활용.
 *
 * Block 구조:
 *  [1] KPI Grid       — 분회, 회원, 승인 대기, 공동구매, 게시글
 *  [2] AI Summary     — 조직 상태 기반 인사이트
 *  [3] Action Queue   — 승인 대기 요청
 *  [4] Activity Log   — 대기 요청 상세
 *  [5] Quick Actions  — 관리 페이지 바로가기
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
import { adminApi } from '../../api/admin';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../types/joinRequest';
import { JOIN_REQUEST_TYPE_LABELS } from '../../types/joinRequest';

// ─── Types ───

interface DashboardStats {
  totalBranches: number;
  totalMembers: number;
  pendingApprovals: number;
  activeGroupbuys: number;
  recentPosts: number;
}

// ─── Data Transformer ───

function buildDashboardConfig(
  stats: DashboardStats,
  pendingRequests: OrganizationJoinRequest[],
  pendingTotal: number,
): OperatorDashboardConfig {
  // Block 1: KPI Grid
  const kpis: KpiItem[] = [
    {
      key: 'branches',
      label: '등록 분회',
      value: stats.totalBranches,
      status: stats.totalBranches === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'members',
      label: '전체 회원',
      value: stats.totalMembers,
      status: stats.totalMembers === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'pending',
      label: '승인 대기',
      value: stats.pendingApprovals,
      status: stats.pendingApprovals > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'groupbuys',
      label: '진행 공동구매',
      value: stats.activeGroupbuys,
    },
    {
      key: 'posts',
      label: '최근 게시글',
      value: stats.recentPosts,
    },
  ];

  // Block 2: AI Summary
  const aiSummary: AiSummaryItem[] = [];
  if (stats.pendingApprovals > 0) {
    aiSummary.push({
      id: 'ai-pending',
      message: `승인 대기 ${stats.pendingApprovals}건이 있습니다. 검토가 필요합니다.`,
      level: stats.pendingApprovals > 5 ? 'warning' : 'info',
      link: '/admin/organization-requests',
    });
  }
  if (stats.totalMembers === 0) {
    aiSummary.push({
      id: 'ai-no-members',
      message: '등록된 회원이 없습니다. 조직 활동을 확인하세요.',
      level: 'warning',
    });
  }
  if (stats.totalBranches === 0) {
    aiSummary.push({
      id: 'ai-no-branches',
      message: '등록된 분회가 없습니다. 조직 구조를 설정하세요.',
      level: 'warning',
      link: '/admin/divisions',
    });
  }
  if (aiSummary.length === 0) {
    aiSummary.push({
      id: 'ai-ok',
      message: '조직 운영 상태가 양호합니다.',
      level: 'info',
    });
  }

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [];
  if (pendingTotal > 0) {
    actionQueue.push({
      id: 'aq-pending',
      label: '조직 가입/역할 요청',
      count: pendingTotal,
      link: '/admin/organization-requests',
    });
  }
  if (stats.pendingApprovals > 0 && stats.pendingApprovals !== pendingTotal) {
    actionQueue.push({
      id: 'aq-approvals',
      label: '승인 대기 건',
      count: stats.pendingApprovals,
      link: '/admin/members',
    });
  }

  // Block 4: Activity Log (from pending requests)
  const activityLog: ActivityItem[] = pendingRequests.slice(0, 10).map((req) => ({
    id: `al-${req.id}`,
    message: `${JOIN_REQUEST_TYPE_LABELS[req.request_type] || req.request_type} 요청${req.requested_role ? ` (${req.requested_role})` : ''}`,
    timestamp: req.created_at,
  }));
  if (activityLog.length === 0) {
    activityLog.push({
      id: 'al-empty',
      message: '최근 요청이 없습니다.',
      timestamp: new Date().toISOString(),
    });
  }

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'qa-members', label: '회원 관리', link: '/admin/members', icon: '👥' },
    { id: 'qa-divisions', label: '분회 관리', link: '/admin/divisions', icon: '🏢' },
    { id: 'qa-requests', label: '조직 요청', link: '/admin/organization-requests', icon: '📋' },
    { id: 'qa-committee', label: '위원회 관리', link: '/admin/committee-requests', icon: '👔' },
    { id: 'qa-enrollments', label: '서비스 신청', link: '/admin/service-enrollments', icon: '📝' },
    { id: 'qa-settings', label: '설정', link: '/admin/settings', icon: '⚙️' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}

// ─── Component ───

export function KpaOperatorDashboardPage() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, pendingRes] = await Promise.allSettled([
        adminApi.getDashboardStats(),
        joinRequestApi.getPending({ limit: 10 }),
      ]);

      const stats: DashboardStats = statsRes.status === 'fulfilled'
        ? statsRes.value.data
        : { totalBranches: 0, totalMembers: 0, pendingApprovals: 0, activeGroupbuys: 0, recentPosts: 0 };

      const pendingRequests = pendingRes.status === 'fulfilled'
        ? pendingRes.value.data.items
        : [];
      const pendingTotal = pendingRes.status === 'fulfilled'
        ? pendingRes.value.data.pagination.total
        : 0;

      setConfig(buildDashboardConfig(stats, pendingRequests, pendingTotal));
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
