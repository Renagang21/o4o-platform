/**
 * KpaOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   "콘텐츠 흐름형" — Activity Log + Quick Actions 강조.
 *
 * Block 구조:
 *  [1] KPI Grid       — 콘텐츠, 포럼, 사이니지, 가입대기
 *  [2] AI Summary     — 상태 기반 인사이트 (LLM 미호출)
 *  [3] Action Queue   — 즉시 처리 항목
 *  [4] Activity Log   — 최근 콘텐츠/포럼/사이니지 활동 (핵심)
 *  [5] Quick Actions  — Hub 기능 흡수 (핵심)
 *
 * API 재사용: operatorApi.getSummary() + apiClient (members, groupbuy)
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
import { operatorApi, type OperatorSummary } from '../../api/operator';
import { apiClient } from '../../api/client';

// ─── Extended Data (Hub에서 가져오던 추가 데이터) ───

interface KpaExtendedData {
  summary: OperatorSummary | null;
  pendingMembers: number;
}

// ─── Data Transformer ───

function buildDashboardConfig(data: KpaExtendedData): OperatorDashboardConfig {
  const { summary, pendingMembers } = data;

  if (!summary) {
    return { kpis: [], actionQueue: [], activityLog: [], quickActions: [] };
  }

  const contentCount = summary.content?.totalPublished ?? 0;
  const forumCount = summary.forum?.totalPosts ?? 0;
  const signageCount = (summary.signage?.totalMedia ?? 0) + (summary.signage?.totalPlaylists ?? 0);

  // Block 1: KPI Grid
  const kpis: KpiItem[] = [
    {
      key: 'content',
      label: '콘텐츠 발행',
      value: contentCount,
      status: contentCount === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'forum',
      label: '포럼 게시글',
      value: forumCount,
      status: forumCount === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'signage',
      label: '사이니지',
      value: signageCount,
      status: signageCount === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'pending',
      label: '승인 대기',
      value: pendingMembers,
      status: pendingMembers > 0 ? 'warning' : 'neutral',
    },
  ];

  // Block 2: AI Summary (상태 기반 규칙형)
  const aiSummary: AiSummaryItem[] = [];
  if (contentCount === 0) {
    aiSummary.push({
      id: 'ai-no-content',
      message: '발행된 콘텐츠가 없습니다. 공지사항 또는 뉴스를 등록하세요.',
      level: 'warning',
      link: '/operator/content',
    });
  }
  if (forumCount === 0) {
    aiSummary.push({
      id: 'ai-no-forum',
      message: '포럼 게시글이 없습니다. 커뮤니티 활동을 시작하세요.',
      level: 'warning',
      link: '/operator/forum-management',
    });
  }
  if (signageCount === 0) {
    aiSummary.push({
      id: 'ai-no-signage',
      message: '사이니지 콘텐츠가 비어 있습니다.',
      level: 'info',
      link: '/operator/signage/content',
    });
  }
  if (pendingMembers > 0) {
    aiSummary.push({
      id: 'ai-pending-members',
      message: `회원 승인 대기 ${pendingMembers}건이 있습니다. 신속한 처리를 권장합니다.`,
      level: pendingMembers > 5 ? 'warning' : 'info',
      link: '/operator/organization-requests',
    });
  }

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [];
  if (pendingMembers > 0) {
    actionQueue.push({
      id: 'aq-members',
      label: '가입 요청 검토',
      count: pendingMembers,
      link: '/operator/organization-requests',
    });
  }
  if (contentCount === 0) {
    actionQueue.push({
      id: 'aq-content',
      label: '콘텐츠 등록 필요',
      count: 0,
      link: '/operator/content',
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
    { id: 'qa-forum', label: '포럼 관리', link: '/operator/forum-management', icon: '💬' },
    { id: 'qa-content', label: '콘텐츠 관리', link: '/operator/content', icon: '📝' },
    { id: 'qa-news', label: '공지사항', link: '/operator/news', icon: '📢' },
    { id: 'qa-docs', label: '자료실', link: '/operator/docs', icon: '📁' },
    { id: 'qa-requests', label: '가입 요청', link: '/operator/organization-requests', icon: '👥' },
    { id: 'qa-enrollments', label: '서비스 신청', link: '/operator/service-enrollments', icon: '📋' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage/content', icon: '🖥️' },
    { id: 'qa-ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: '📊' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog: validLog, quickActions };
}

// ─── Component ───

export default function KpaOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Promise.allSettled: 개별 실패로 전체가 중단되지 않음
      const results = await Promise.allSettled([
        operatorApi.getSummary(),
        apiClient.get('/members', { status: 'pending', pageSize: 1 }),
      ]);

      const summaryRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const membersRes = results[1].status === 'fulfilled' ? results[1].value : null;

      // Log individual failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[KPA-a Dashboard] fetch[${i}] failed:`, r.reason);
        }
      });

      const extData: KpaExtendedData = {
        summary: summaryRes?.data ?? null,
        pendingMembers: membersRes?.total ?? membersRes?.data?.total ?? 0,
      };

      setConfig(buildDashboardConfig(extData));
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
