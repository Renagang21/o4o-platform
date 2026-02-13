/**
 * KPA Operator Config
 *
 * OperatorSummary → OperatorDashboardConfig 변환.
 * WO-OPERATOR-SIGNAL-CORE-V1: 공통 signal 엔진 사용.
 * WO-OPERATOR-SIGNAL-THRESHOLD-CONFIG-V1: Threshold 기반 판정.
 */

import { MessageSquarePlus, Monitor, Users } from 'lucide-react';
import type {
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
import type { OperatorSummary } from '../../api/operator';

// ─── KPA Threshold Config ───

const KPA_THRESHOLDS: OperatorThresholdConfig = {
  forum: { warning: 0, alert: 0 },
  content: { warning: 0, alert: 0 },
};

// ─── Activity feed builder ───

function buildActivityFeed(s: OperatorSummary): OperatorActivityItem[] {
  const items: OperatorActivityItem[] = [];

  for (const c of s.content?.recentItems || []) {
    items.push({
      id: `c-${c.id}`,
      type: 'content',
      title: c.title,
      detail: c.type || '콘텐츠',
      date: c.publishedAt || c.createdAt,
    });
  }
  for (const p of s.forum?.recentPosts || []) {
    items.push({
      id: `f-${p.id}`,
      type: 'forum',
      title: p.title,
      detail: p.authorName || '익명',
      date: p.createdAt,
    });
  }

  return sortAndLimitActivity(items);
}

// ─── Config builders ───

/** KPA-a 커뮤니티 Operator 대시보드 Config */
export function buildKpaOperatorConfig(summary: OperatorSummary | null): OperatorDashboardConfig | null {
  if (!summary) return null;

  const { content, signage, forum } = summary;

  const forumSignal = computeForumSignal(
    forum?.totalPosts || 0,
    forum?.recentPosts?.length || 0,
    KPA_THRESHOLDS.forum,
  );
  const contentSignal = computeContentSignageSignal(
    content?.totalPublished || 0,
    signage?.totalMedia || 0,
    signage?.totalPlaylists || 0,
    KPA_THRESHOLDS.content,
  );
  const overall = computeOverallSignal([
    (content?.totalPublished || 0) > 0,
    (signage?.totalMedia || 0) > 0 || (signage?.totalPlaylists || 0) > 0,
    (forum?.totalPosts || 0) > 0,
  ]);

  const hero: OperatorHeroConfig = {
    status: overall,
    title: '커뮤니티 운영 상태',
    subtitle: undefined,
    statusDots: [
      { label: '콘텐츠', status: contentSignal.status },
      { label: '포럼', status: forumSignal.status },
      { label: '사이니지', status: (signage?.totalMedia || 0) > 0 ? 'good' : 'alert' },
    ],
  };

  const signalCards: OperatorSignalCardConfig[] = [
    {
      icon: MessageSquarePlus,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: '포럼 상태',
      signal: forumSignal,
      actionLabel: '포럼 관리',
      actionLink: 'forum-management',
    },
    {
      icon: Monitor,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: '콘텐츠 상태',
      signal: contentSignal,
      actionLabel: '콘텐츠 허브',
      actionLink: 'signage/content',
    },
    {
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: '운영자 상태',
      signal: { status: 'good', message: '운영자 계정 관리' },
      actionLabel: '운영자 관리',
      actionLink: 'operators',
    },
  ];

  return {
    pageTitle: '운영자 대시보드',
    pageSubtitle: '커뮤니티 운영 현황을 한눈에 확인하세요',
    hero,
    signalCards,
    activityFeed: buildActivityFeed(summary),
  };
}

/** KPA-c 분회 Operator 대시보드 Config */
export function buildBranchOperatorConfig(summary: OperatorSummary | null): OperatorDashboardConfig | null {
  if (!summary) return null;

  const { content, signage, forum } = summary;

  const forumSignal = computeForumSignal(
    forum?.totalPosts || 0,
    forum?.recentPosts?.length || 0,
    KPA_THRESHOLDS.forum,
  );
  const contentSignal = computeContentSignageSignal(
    content?.totalPublished || 0,
    signage?.totalMedia || 0,
    signage?.totalPlaylists || 0,
    KPA_THRESHOLDS.content,
  );
  const overall = computeOverallSignal([
    (content?.totalPublished || 0) > 0,
    (signage?.totalMedia || 0) > 0 || (signage?.totalPlaylists || 0) > 0,
    (forum?.totalPosts || 0) > 0,
  ]);

  const hero: OperatorHeroConfig = {
    status: overall,
    title: '분회 운영 상태',
    subtitle: undefined,
    statusDots: [
      { label: '콘텐츠', status: contentSignal.status },
      { label: '포럼', status: forumSignal.status },
      { label: '사이니지', status: (signage?.totalMedia || 0) > 0 ? 'good' : 'alert' },
    ],
  };

  const signalCards: OperatorSignalCardConfig[] = [
    {
      icon: MessageSquarePlus,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: '포럼 상태',
      signal: forumSignal,
      actionLabel: '포럼 관리',
      actionLink: 'forum-management',
    },
    {
      icon: Monitor,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: '콘텐츠 상태',
      signal: contentSignal,
      actionLabel: '콘텐츠 허브',
      actionLink: 'signage/content',
    },
    {
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: '운영자 상태',
      signal: { status: 'good', message: '운영자 계정 관리' },
      actionLabel: '운영자 관리',
      actionLink: 'operators',
    },
  ];

  return {
    pageTitle: '운영자 대시보드',
    pageSubtitle: '분회 운영 현황을 한눈에 확인하세요',
    hero,
    signalCards,
    activityFeed: buildActivityFeed(summary),
  };
}
