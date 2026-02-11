/**
 * Neture Operator Config
 *
 * AdminDashboardSummary → OperatorDashboardConfig 변환.
 * 기존 NetureOperatorDashboard의 signal derivation 로직을 통합.
 */

import { Monitor, Building2, MessageSquarePlus } from 'lucide-react';
import type {
  SignalStatus,
  OperatorSignal,
  OperatorHeroConfig,
  OperatorSignalCardConfig,
  OperatorActivityItem,
  OperatorDashboardConfig,
} from '@o4o/operator-core';
import type { AdminDashboardSummary } from '../../lib/api';

// ─── Signal derivation (pure functions) ───

function getOverallStatus(data: AdminDashboardSummary): SignalStatus {
  const areas = [
    (data.content?.totalPublished || 0) > 0 ||
      (data.signage?.totalMedia || 0) > 0,
    data.stats.activeSuppliers > 0,
    (data.forum?.totalPosts || 0) > 0,
  ];
  const active = areas.filter(Boolean).length;
  if (active === 3) return 'good';
  if (active >= 1) return 'warning';
  return 'alert';
}

function getContentSignal(data: AdminDashboardSummary): OperatorSignal {
  const totalContent = data.content?.totalPublished || 0;
  const totalMedia = data.signage?.totalMedia || 0;
  const totalPlaylists = data.signage?.totalPlaylists || 0;

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

function getForumSignal(data: AdminDashboardSummary): OperatorSignal {
  const totalPosts = data.forum?.totalPosts || 0;
  const recentPosts = data.forum?.recentPosts || [];

  if (totalPosts === 0) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (recentPosts.length === 0) {
    return { status: 'warning', message: `게시글 ${totalPosts}개 · 최근 활동 없음` };
  }
  return { status: 'good', message: `게시글 ${totalPosts}개 활성` };
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

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 5);
}

// ─── Config builder ───

/** Neture Operator 대시보드 Config */
export function buildNetureOperatorConfig(
  summary: AdminDashboardSummary | null,
): OperatorDashboardConfig | null {
  if (!summary) return null;

  const contentSignal = getContentSignal(summary);
  const partnerSignal = getPartnerSignal(summary);
  const forumSignal = getForumSignal(summary);
  const overall = getOverallStatus(summary);

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
