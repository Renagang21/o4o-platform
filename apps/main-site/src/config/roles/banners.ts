/**
 * 역할별 배너 설정 레지스트리
 *
 * 각 역할별로 표시할 배너 콘텐츠를 정의합니다.
 */

import { UserRole } from '../../types/user';

export interface BannerConfig {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  priority?: number; // 높을수록 우선 표시
}

/**
 * 역할별 배너 설정
 */
export const ROLE_BANNERS: Record<string, BannerConfig[]> = {
  user: [
    {
      id: 'welcome-customer',
      title: '환영합니다! 🎉',
      description: '특별한 할인과 신제품을 만나보세요',
      ctaText: '쇼핑 시작하기',
      ctaUrl: '/shop',
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      priority: 10
    },
    {
      id: 'new-arrivals',
      title: '신상품 입고',
      description: '이번 주 새로 입고된 제품들을 확인하세요',
      ctaText: '둘러보기',
      ctaUrl: '/shop/new',
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      priority: 5
    }
  ],

  seller: [
    {
      id: 'seller-onboarding',
      title: '판매자 대시보드 🛒',
      description: '매출을 늘리고 고객을 관리하세요',
      ctaText: '대시보드 보기',
      ctaUrl: '/seller',
      backgroundColor: '#8b5cf6',
      textColor: '#ffffff',
      priority: 10
    },
    {
      id: 'seller-tips',
      title: '판매 팁',
      description: '상품 등록부터 주문 처리까지, 완벽 가이드',
      ctaText: '가이드 보기',
      ctaUrl: '/seller/guide',
      backgroundColor: '#f59e0b',
      textColor: '#ffffff',
      priority: 5
    }
  ],

  supplier: [
    {
      id: 'supplier-dashboard',
      title: '공급자 허브 🏭',
      description: '재고와 주문을 효율적으로 관리하세요',
      ctaText: '대시보드 열기',
      ctaUrl: '/supplier',
      backgroundColor: '#0ea5e9',
      textColor: '#ffffff',
      priority: 10
    },
    {
      id: 'supplier-integration',
      title: 'API 통합',
      description: '자동화된 재고 관리 시스템을 연결하세요',
      ctaText: 'API 문서 보기',
      ctaUrl: '/supplier/api-docs',
      backgroundColor: '#14b8a6',
      textColor: '#ffffff',
      priority: 5
    }
  ],

  affiliate: [
    {
      id: 'affiliate-welcome',
      title: '제휴 마케팅 🤝',
      description: '추천으로 수익을 창출하세요',
      ctaText: '시작하기',
      ctaUrl: '/affiliate',
      backgroundColor: '#ec4899',
      textColor: '#ffffff',
      priority: 10
    },
    {
      id: 'affiliate-tools',
      title: '마케팅 도구',
      description: '캠페인 링크와 배너를 쉽게 생성하세요',
      ctaText: '도구 사용하기',
      ctaUrl: '/affiliate/tools',
      backgroundColor: '#f97316',
      textColor: '#ffffff',
      priority: 5
    }
  ]
};

/**
 * 역할에 따른 배너 가져오기 (우선순위 정렬)
 */
export function getBannersForRole(role: UserRole | string | null | undefined): BannerConfig[] {
  if (!role) {
    return ROLE_BANNERS.user;
  }

  const banners = ROLE_BANNERS[role] || ROLE_BANNERS.user;
  return banners.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * 최상위 배너 하나만 가져오기
 */
export function getTopBannerForRole(role: UserRole | string | null | undefined): BannerConfig | null {
  const banners = getBannersForRole(role);
  return banners.length > 0 ? banners[0] : null;
}
