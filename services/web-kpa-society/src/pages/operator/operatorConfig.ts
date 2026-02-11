/**
 * KPA Operator Config
 *
 * OperatorSummary → OperatorDashboardConfig 변환.
 * 기존 KpaOperatorDashboard / BranchOperatorDashboard의
 * signal derivation 로직을 통합.
 */

import { MessageSquarePlus, Monitor, Users } from 'lucide-react';
import type {
  SignalStatus,
  OperatorSignal,
  OperatorHeroConfig,
  OperatorSignalCardConfig,
  OperatorActivityItem,
  OperatorDashboardConfig,
} from '@o4o/operator-core';
import type { OperatorSummary } from '../../api/operator';

// ─── Signal derivation (pure functions) ───

function getOverallStatus(
  content: OperatorSummary['content'] | undefined,
  signage: OperatorSummary['signage'] | undefined,
  forum: OperatorSummary['forum'] | undefined,
): SignalStatus {
  const areas = [
    (content?.totalPublished || 0) > 0,
    (signage?.totalMedia || 0) > 0 || (signage?.totalPlaylists || 0) > 0,
    (forum?.totalPosts || 0) > 0,
  ];
  const active = areas.filter(Boolean).length;
  if (active === 3) return 'good';
  if (active >= 1) return 'warning';
  return 'alert';
}

function getForumSignal(forum: OperatorSummary['forum'] | undefined): OperatorSignal {
  if (!forum || forum.totalPosts === 0) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (!forum.recentPosts || forum.recentPosts.length === 0) {
    return { status: 'warning', message: `게시글 ${forum.totalPosts}개 · 최근 활동 없음` };
  }
  return { status: 'good', message: `게시글 ${forum.totalPosts}개 활성` };
}

function getContentSignal(
  content: OperatorSummary['content'] | undefined,
  signage: OperatorSummary['signage'] | undefined,
): OperatorSignal {
  const totalContent = content?.totalPublished || 0;
  const totalMedia = signage?.totalMedia || 0;
  const totalPlaylists = signage?.totalPlaylists || 0;

  if (totalContent === 0 && totalMedia === 0) {
    return { status: 'alert', message: '등록된 콘텐츠 없음' };
  }
  if (totalContent === 0) {
    return { status: 'warning', message: `미디어 ${totalMedia}개 · 공지/뉴스 없음` };
  }
  if (totalPlaylists === 0 && totalMedia > 0) {
    return { status: 'warning', message: `콘텐츠 ${totalContent}개 · 플레이리스트 미설정` };
  }
  return {
    status: 'good',
    message: `콘텐츠 ${totalContent}개 · 미디어 ${totalMedia}개 · 재생목록 ${totalPlaylists}개`,
  };
}

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

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 5);
}

// ─── Config builders ───

/** KPA-a 커뮤니티 Operator 대시보드 Config */
export function buildKpaOperatorConfig(summary: OperatorSummary | null): OperatorDashboardConfig | null {
  if (!summary) return null;

  const { content, signage, forum } = summary;
  const forumSignal = getForumSignal(forum);
  const contentSignal = getContentSignal(content, signage);
  const overall = getOverallStatus(content, signage, forum);

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
  const forumSignal = getForumSignal(forum);
  const contentSignal = getContentSignal(content, signage);
  const overall = getOverallStatus(content, signage, forum);

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
