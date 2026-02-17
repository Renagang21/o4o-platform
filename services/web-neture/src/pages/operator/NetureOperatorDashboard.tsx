/**
 * NetureOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-NETURE-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   기존 API 데이터(AdminDashboardSummary)를 OperatorDashboardConfig로 변환.
 *
 * Block 구조:
 *  [1] KPI Grid       — 핵심 수치 (공급자, 요청, 콘텐츠, 포럼)
 *  [2] AI Summary     — AI 운영 인사이트 (선택적)
 *  [3] Action Queue   — 즉시 처리 항목
 *  [4] Activity Log   — 최근 운영 활동
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
import { dashboardApi, type AdminDashboardSummary } from '../../lib/api';

// ─── Data Transformer ───

function buildDashboardConfig(
  data: AdminDashboardSummary,
): OperatorDashboardConfig {
  const { stats } = data;

  // Block 1: KPI Grid
  const kpis: KpiItem[] = [
    {
      key: 'suppliers',
      label: '활성 공급자',
      value: stats.activeSuppliers,
      status: stats.activeSuppliers === 0 ? 'critical' : 'neutral',
    },
    {
      key: 'pending',
      label: '승인 대기',
      value: stats.pendingRequests,
      status: stats.pendingRequests > 5 ? 'warning' : 'neutral',
    },
    {
      key: 'content',
      label: '콘텐츠 발행',
      value: data.content?.totalPublished ?? 0,
    },
    {
      key: 'forum',
      label: '포럼 게시글',
      value: data.forum?.totalPosts ?? 0,
    },
  ];

  // Block 2: AI Summary (기존 signal 데이터로 생성)
  const aiSummary: AiSummaryItem[] = [];
  if (stats.pendingRequests > 0) {
    aiSummary.push({
      id: 'ai-pending',
      message: `가입 승인 대기 ${stats.pendingRequests}건이 있습니다. 신속한 처리를 권장합니다.`,
      level: stats.pendingRequests > 5 ? 'warning' : 'info',
      link: '/workspace/operator/registrations',
    });
  }
  if (stats.openPartnershipRequests > 0) {
    aiSummary.push({
      id: 'ai-partnership',
      message: `파트너십 요청 ${stats.openPartnershipRequests}건이 검토 대기 중입니다.`,
      level: 'info',
      link: '/workspace/partners/requests',
    });
  }
  if ((data.content?.totalPublished ?? 0) === 0 && (data.signage?.totalMedia ?? 0) === 0) {
    aiSummary.push({
      id: 'ai-content',
      message: '발행된 콘텐츠가 없습니다. 콘텐츠 등록을 시작하세요.',
      level: 'warning',
      link: '/workspace/content',
    });
  }

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [];
  if (stats.pendingRequests > 0) {
    actionQueue.push({
      id: 'aq-registrations',
      label: '가입 승인 대기',
      count: stats.pendingRequests,
      link: '/workspace/operator/registrations',
    });
  }
  if (stats.openPartnershipRequests > 0) {
    actionQueue.push({
      id: 'aq-partnership',
      label: '파트너십 요청',
      count: stats.openPartnershipRequests,
      link: '/workspace/partners/requests',
    });
  }

  // Block 4: Activity Log
  const activityLog: ActivityItem[] = [];
  for (const c of data.content?.recentItems ?? []) {
    activityLog.push({
      id: `c-${c.id}`,
      message: `콘텐츠 등록: ${c.title}`,
      timestamp: c.publishedAt || c.createdAt,
    });
  }
  for (const p of data.forum?.recentPosts ?? []) {
    activityLog.push({
      id: `f-${p.id}`,
      message: `포럼 게시: ${p.title}`,
      timestamp: p.createdAt,
    });
  }
  for (const a of data.recentActivities ?? []) {
    activityLog.push({
      id: `a-${a.id}`,
      message: a.text,
      timestamp: a.time,
    });
  }
  // Sort by timestamp descending, limit 10
  activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  activityLog.splice(10);

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'qa-registrations', label: '가입 승인', link: '/workspace/operator/registrations', icon: '✅' },
    { id: 'qa-forum', label: '포럼 관리', link: '/workspace/operator/forum-management', icon: '💬' },
    { id: 'qa-ai-report', label: 'AI 리포트', link: '/workspace/operator/ai-report', icon: '📊' },
    { id: 'qa-content', label: '콘텐츠 관리', link: '/workspace/content', icon: '📝' },
    { id: 'qa-suppliers', label: '공급자 관리', link: '/workspace/suppliers', icon: '🏢' },
    { id: 'qa-supply', label: '공급 현황', link: '/workspace/operator/supply', icon: '📦' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}

// ─── Component ───

export default function NetureOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getAdminDashboardSummary();
      if (data) setConfig(buildDashboardConfig(data));
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
