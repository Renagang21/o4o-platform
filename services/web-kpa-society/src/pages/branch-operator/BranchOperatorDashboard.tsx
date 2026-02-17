/**
 * BranchOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-KPA-B-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   기존 operator-core OperatorLayout(Signal 패턴)을 교체.
 *   기존 API(operatorApi.getSummary())를 그대로 활용.
 *
 * Block 구조:
 *  [1] KPI Grid       — 콘텐츠, 사이니지, 포럼 수치
 *  [2] AI Summary     — 운영 상태 기반 인사이트
 *  [3] Action Queue   — 콘텐츠/포럼/사이니지 필요 작업
 *  [4] Activity Log   — 최근 콘텐츠/포럼 활동
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
import { operatorApi, type OperatorSummary } from '../../api/operator';

// ─── Data Transformer ───

function buildDashboardConfig(data: OperatorSummary): OperatorDashboardConfig {
  const { content, signage, forum } = data;

  // Block 1: KPI Grid
  const kpis: KpiItem[] = [
    {
      key: 'published-content',
      label: '발행 콘텐츠',
      value: content.totalPublished,
      status: content.totalPublished === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'signage-media',
      label: '사이니지 미디어',
      value: signage.totalMedia,
      status: signage.totalMedia === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'signage-playlists',
      label: '재생목록',
      value: signage.totalPlaylists,
    },
    {
      key: 'forum-posts',
      label: '포럼 게시글',
      value: forum.totalPosts,
      status: forum.totalPosts === 0 ? 'warning' : 'neutral',
    },
  ];

  // Block 2: AI Summary
  const aiSummary: AiSummaryItem[] = [];
  if (content.totalPublished === 0) {
    aiSummary.push({
      id: 'ai-no-content',
      message: '발행된 콘텐츠가 없습니다. 콘텐츠를 등록하세요.',
      level: 'warning',
      link: 'signage/content',
    });
  }
  if (signage.totalMedia === 0 && signage.totalPlaylists === 0) {
    aiSummary.push({
      id: 'ai-no-signage',
      message: '사이니지 미디어가 없습니다. 미디어를 업로드하세요.',
      level: 'warning',
    });
  }
  if (forum.totalPosts === 0) {
    aiSummary.push({
      id: 'ai-no-forum',
      message: '포럼 게시글이 없습니다. 커뮤니티 활성화가 필요합니다.',
      level: 'info',
      link: 'forum-management',
    });
  }
  if (aiSummary.length === 0) {
    aiSummary.push({
      id: 'ai-ok',
      message: '분회 운영 상태가 양호합니다.',
      level: 'info',
    });
  }

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [];
  if (content.totalPublished === 0) {
    actionQueue.push({
      id: 'aq-content',
      label: '콘텐츠 등록 필요',
      count: 1,
      link: 'signage/content',
    });
  }
  if (signage.totalMedia === 0) {
    actionQueue.push({
      id: 'aq-media',
      label: '미디어 업로드 필요',
      count: 1,
      link: 'signage/content',
    });
  }
  if (forum.totalPosts === 0) {
    actionQueue.push({
      id: 'aq-forum',
      label: '포럼 활성화 필요',
      count: 1,
      link: 'forum-management',
    });
  }

  // Block 4: Activity Log
  const activityLog: ActivityItem[] = [];
  for (const c of content.recentItems.slice(0, 5)) {
    activityLog.push({
      id: `al-c-${c.id}`,
      message: `콘텐츠 발행: ${c.title}`,
      timestamp: c.publishedAt || c.createdAt,
    });
  }
  for (const p of forum.recentPosts.slice(0, 5)) {
    activityLog.push({
      id: `al-f-${p.id}`,
      message: `포럼 게시: ${p.title}`,
      timestamp: p.createdAt,
    });
  }
  activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (activityLog.length === 0) {
    activityLog.push({
      id: 'al-empty',
      message: '최근 활동이 없습니다.',
      timestamp: new Date().toISOString(),
    });
  }

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'qa-forum', label: '포럼 관리', link: 'forum-management', icon: '💬' },
    { id: 'qa-content', label: '콘텐츠 관리', link: 'signage/content', icon: '📄' },
    { id: 'qa-operators', label: '운영자 관리', link: 'operators', icon: '👥' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}

// ─── Component ───

export function BranchOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.getSummary();
      setConfig(buildDashboardConfig(res.data));
    } catch (err) {
      console.error('Failed to fetch branch operator dashboard:', err);
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
