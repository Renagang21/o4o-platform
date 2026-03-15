/**
 * GlycoPharm Operator Config
 *
 * OperatorDashboardData → OperatorDashboardConfig 변환.
 * WO-OPERATOR-SIGNAL-CORE-V1: 공통 signal 엔진 사용.
 *
 * 특이사항:
 *  - activityFeed 미사용 (GlycoPharm은 Status Feed = KPI 지표 목록 사용)
 *  - Status Feed는 Dashboard 컴포넌트의 children으로 직접 렌더링
 */

import { ShoppingBag, MessageSquare, Monitor } from 'lucide-react';
import type {
  OperatorSignal,
  OperatorHeroConfig,
  OperatorSignalCardConfig,
  OperatorDashboardConfig,
} from '@o4o/operator-core';
import { computeOverallSignal } from '@o4o/operator-core';
import type { OperatorDashboardData } from '@/api/glycopharm';

// ─── GlycoPharm-specific signals ───

function getStoreSignal(data: OperatorDashboardData): OperatorSignal {
  const { storeStatus, serviceStatus } = data;

  if (storeStatus.pendingApprovals > 0) {
    return {
      status: 'warning',
      message: `승인 대기 ${storeStatus.pendingApprovals}건 · 활성 스토어 ${storeStatus.activeStores}개`,
    };
  }
  if (storeStatus.activeStores === 0 && serviceStatus.activePharmacies === 0) {
    return { status: 'alert', message: '등록된 약국/스토어 없음' };
  }
  return {
    status: 'good',
    message: `약국 ${serviceStatus.activePharmacies}개 · 스토어 ${storeStatus.activeStores}개 활성`,
  };
}

function getForumSignal(data: OperatorDashboardData): OperatorSignal {
  const { forumStatus } = data;
  if (forumStatus.totalPosts === 0 && forumStatus.open === 0) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (forumStatus.open === 0) {
    return { status: 'warning', message: `게시글 ${forumStatus.totalPosts}개 · 공개 포럼 없음` };
  }
  return {
    status: 'good',
    message: `공개 ${forumStatus.open}개 · 게시글 ${forumStatus.totalPosts}개 활성`,
  };
}

function getContentSignal(data: OperatorDashboardData): OperatorSignal {
  const { contentStatus } = data;
  const totalContent = contentStatus.hero.total + contentStatus.featured.total + contentStatus.eventNotice.total;

  if (totalContent === 0) {
    return { status: 'alert', message: '등록된 콘텐츠 없음' };
  }
  if (contentStatus.hero.active === 0) {
    return { status: 'warning', message: `콘텐츠 ${totalContent}개 · Hero 미설정` };
  }
  return {
    status: 'good',
    message: `Hero ${contentStatus.hero.active}개 · Featured ${contentStatus.featured.total}개 · 이벤트 ${contentStatus.eventNotice.active}개`,
  };
}

// ─── Config builder ───

/** GlycoPharm Operator 대시보드 Config (activityFeed 없음) */
export function buildGlycoPharmOperatorConfig(
  data: OperatorDashboardData | null,
): OperatorDashboardConfig | null {
  if (!data) return null;

  const storeSignal = getStoreSignal(data);
  const forumSignal = getForumSignal(data);
  const contentSignal = getContentSignal(data);
  const overall = computeOverallSignal([
    data.serviceStatus.activePharmacies > 0,
    data.forumStatus.totalPosts > 0,
    data.contentStatus.hero.total > 0 || data.contentStatus.featured.total > 0,
  ]);

  const hero: OperatorHeroConfig = {
    status: overall,
    title: '서비스 운영 상태',
    subtitle: undefined,
    statusDots: [
      { label: '스토어', status: storeSignal.status },
      { label: '포럼', status: forumSignal.status },
      { label: '콘텐츠', status: contentSignal.status },
    ],
  };

  const signalCards: OperatorSignalCardConfig[] = [
    {
      icon: ShoppingBag,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      title: '스토어 상태',
      signal: storeSignal,
      actionLabel: '스토어 관리',
      actionLink: '/operator/store-approvals',
    },
    {
      icon: MessageSquare,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: '포럼 상태',
      signal: forumSignal,
      actionLabel: '포럼 관리',
      actionLink: '/operator/forum-management',
    },
    {
      icon: Monitor,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: '콘텐츠 상태',
      signal: contentSignal,
      actionLabel: '콘텐츠 관리',
      actionLink: '/operator/store-template',
    },
  ];

  return {
    pageTitle: '운영자 대시보드',
    pageSubtitle: '약국 네트워크 운영 현황을 한눈에 확인하세요',
    hero,
    signalCards,
    // activityFeed 생략 → OperatorLayout이 ActivityFeed 섹션 렌더링 안 함
  };
}
