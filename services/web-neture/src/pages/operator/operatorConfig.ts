/**
 * Neture Operator Config
 *
 * AdminDashboardSummary → OperatorDashboardConfig 변환.
 * WO-OPERATOR-SIGNAL-CORE-V1: 공통 signal 엔진 사용.
 * WO-OPERATOR-SIGNAL-THRESHOLD-CONFIG-V1: Threshold 기반 판정.
 */

import { Monitor, Building2, MessageSquarePlus } from 'lucide-react';
import type {
  OperatorSignal,
  OperatorHeroConfig,
  OperatorSignalCardConfig,
  OperatorActivityItem,
  OperatorDashboardConfig,
  OperatorThresholdConfig,
} from '@o4o/operator-core';
import {
  computeOverallSignal,
  computeForumSignal,
  computeContentSignageSignal,
  sortAndLimitActivity,
} from '@o4o/operator-core';
import type { AdminDashboardSummary } from '../../lib/api';

// ─── Neture Threshold Config ───

const NETURE_THRESHOLDS: OperatorThresholdConfig = {
  forum: { warning: 0, alert: 0 },
  content: { warning: 0, alert: 0 },
};

// ─── Neture-specific signal (파트너) ───

function getPartnerSignal(data: AdminDashboardSummary): OperatorSignal {
  const { stats } = data;

  if (stats.activeSuppliers === 0) {
    return { status: 'alert', message: '활성 공급자 없음 — 초기 상태' };
  }
  if (stats.pendingRequests > 0 || stats.openPartnershipRequests > 0) {
    const pending = stats.pendingRequests + stats.openPartnershipRequests;
    return {
      status: 'warning',
      message: `공급자 ${stats.activeSuppliers}개 · 대기 요청 ${pending}건`,
    };
  }
  return {
    status: 'good',
    message: `공급자 ${stats.activeSuppliers}개 활성`,
  };
}

// ─── Activity feed builder ───

function buildActivityFeed(data: AdminDashboardSummary): OperatorActivityItem[] {
  const items: OperatorActivityItem[] = [];

  for (const c of data.content?.recentItems || []) {
    items.push({
      id: `c-${c.id}`,
      type: 'content',
      title: c.title,
      detail: c.type || '콘텐츠',
      date: c.publishedAt || c.createdAt,
    });
  }
  for (const p of data.forum?.recentPosts || []) {
    items.push({
      id: `f-${p.id}`,
      type: 'forum',
      title: p.title,
      detail: p.authorName || '익명',
      date: p.createdAt,
    });
  }
  for (const a of data.recentActivities || []) {
    items.push({
      id: `a-${a.id}`,
      type: 'activity',
      title: a.text,
      detail: a.type,
      date: a.time,
    });
  }

  return sortAndLimitActivity(items);
}

// ─── Config builder ───

/** Neture Operator 대시보드 Config */
export function buildNetureOperatorConfig(
  summary: AdminDashboardSummary | null,
): OperatorDashboardConfig | null {
  if (!summary) return null;

  const contentSignal = computeContentSignageSignal(
    summary.content?.totalPublished || 0,
    summary.signage?.totalMedia || 0,
    summary.signage?.totalPlaylists || 0,
    NETURE_THRESHOLDS.content,
  );
  const partnerSignal = getPartnerSignal(summary);
  const forumSignal = computeForumSignal(
    summary.forum?.totalPosts || 0,
    summary.forum?.recentPosts?.length || 0,
    NETURE_THRESHOLDS.forum,
  );
  const overall = computeOverallSignal([
    (summary.content?.totalPublished || 0) > 0 ||
      (summary.signage?.totalMedia || 0) > 0,
    summary.stats.activeSuppliers > 0,
    (summary.forum?.totalPosts || 0) > 0,
  ]);

  const hero: OperatorHeroConfig = {
    status: overall,
    title: '플랫폼 운영 상태',
    subtitle: undefined,
    statusDots: [
      { label: '콘텐츠', status: contentSignal.status },
      { label: '파트너', status: partnerSignal.status },
      { label: '포럼', status: forumSignal.status },
    ],
  };

  const signalCards: OperatorSignalCardConfig[] = [
    {
      icon: Monitor,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: '콘텐츠 상태',
      signal: contentSignal,
      actionLabel: '콘텐츠 관리',
      actionLink: '/workspace/content',
    },
    {
      icon: Building2,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: '파트너 상태',
      signal: partnerSignal,
      actionLabel: '공급자 관리',
      actionLink: '/workspace/suppliers',
    },
    {
      icon: MessageSquarePlus,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: '포럼 상태',
      signal: forumSignal,
      actionLabel: '포럼 관리',
      actionLink: '/workspace/operator/forum-management',
    },
  ];

  return {
    pageTitle: '운영자 대시보드',
    pageSubtitle: '플랫폼 운영 현황을 한눈에 확인하세요',
    hero,
    signalCards,
    activityFeed: buildActivityFeed(summary),
  };
}
