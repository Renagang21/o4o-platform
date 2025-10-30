/**
 * 역할별 대시보드 카드 설정 레지스트리
 *
 * 각 역할별 허브 대시보드에 표시할 카드들을 정의합니다.
 */

import { UserRole } from '../../types/user';

export interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
  url?: string;
  badge?: string;
  stat?: {
    value: string | number;
    label: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  };
  actions?: {
    label: string;
    url: string;
    variant?: 'primary' | 'secondary' | 'outline';
  }[];
  order?: number; // 표시 순서
}

export interface DashboardConfig {
  title: string;
  subtitle?: string;
  cards: DashboardCard[];
}

/**
 * 역할별 대시보드 설정
 */
export const ROLE_DASHBOARDS: Record<string, DashboardConfig> = {
  customer: {
    title: '마이페이지',
    subtitle: '주문 내역과 관심 상품을 확인하세요',
    cards: [
      {
        id: 'recent-orders',
        title: '최근 주문',
        description: '주문하신 상품의 배송 현황을 확인하세요',
        icon: 'Package',
        url: '/orders',
        stat: {
          value: 0,
          label: '진행 중인 주문'
        },
        order: 1
      },
      {
        id: 'wishlist',
        title: '위시리스트',
        description: '관심 있는 상품들을 모아보세요',
        icon: 'Heart',
        url: '/wishlist',
        stat: {
          value: 0,
          label: '저장된 상품'
        },
        order: 2
      },
      {
        id: 'loyalty-points',
        title: '적립금',
        description: '쇼핑할 때 사용하실 수 있습니다',
        icon: 'Gift',
        url: '/points',
        stat: {
          value: '0원',
          label: '사용 가능 적립금'
        },
        order: 3
      }
    ]
  },

  seller: {
    title: '판매자 대시보드',
    subtitle: '매출과 주문을 한눈에 확인하세요',
    cards: [
      {
        id: 'today-sales',
        title: '오늘의 매출',
        description: '실시간 매출 현황',
        icon: 'DollarSign',
        url: '/seller/sales',
        stat: {
          value: '0원',
          label: '오늘 매출',
          trend: 'up',
          trendValue: '+0%'
        },
        order: 1
      },
      {
        id: 'pending-orders',
        title: '처리 대기 주문',
        description: '확인이 필요한 주문이 있습니다',
        icon: 'ShoppingBag',
        url: '/seller/orders',
        stat: {
          value: 0,
          label: '대기 중',
          trend: 'neutral'
        },
        badge: 'urgent',
        order: 2
      },
      {
        id: 'products',
        title: '상품 관리',
        description: '등록된 상품을 관리하세요',
        icon: 'Package',
        url: '/seller/products',
        stat: {
          value: 0,
          label: '등록 상품'
        },
        actions: [
          { label: '상품 추가', url: '/seller/products/new', variant: 'primary' }
        ],
        order: 3
      },
      {
        id: 'customers',
        title: '고객 관리',
        description: '고객 문의와 리뷰를 확인하세요',
        icon: 'Users',
        url: '/seller/customers',
        stat: {
          value: 0,
          label: '신규 문의'
        },
        order: 4
      }
    ]
  },

  supplier: {
    title: '공급자 대시보드',
    subtitle: '재고와 파트너 주문을 관리하세요',
    cards: [
      {
        id: 'inventory-status',
        title: '재고 현황',
        description: '전체 재고 상태를 확인하세요',
        icon: 'Package',
        url: '/supplier/inventory',
        stat: {
          value: 0,
          label: '품목',
          trend: 'neutral'
        },
        order: 1
      },
      {
        id: 'pending-orders',
        title: '처리 대기 주문',
        description: '파트너사 주문을 확인하세요',
        icon: 'ClipboardList',
        url: '/supplier/orders',
        stat: {
          value: 0,
          label: '신규 주문',
          trend: 'up'
        },
        badge: 'new',
        order: 2
      },
      {
        id: 'low-stock',
        title: '재고 부족 알림',
        description: '발주가 필요한 품목들',
        icon: 'AlertTriangle',
        url: '/supplier/inventory?filter=low',
        stat: {
          value: 0,
          label: '경고 품목'
        },
        badge: 'warning',
        order: 3
      },
      {
        id: 'partners',
        title: '파트너 관리',
        description: '파트너사와의 거래 내역',
        icon: 'Handshake',
        url: '/supplier/partners',
        stat: {
          value: 0,
          label: '활성 파트너'
        },
        order: 4
      }
    ]
  },

  affiliate: {
    title: '제휴자 대시보드',
    subtitle: '캠페인 성과와 수익을 확인하세요',
    cards: [
      {
        id: 'earnings-month',
        title: '이번 달 수익',
        description: '현재까지의 누적 수익',
        icon: 'DollarSign',
        url: '/affiliate/earnings',
        stat: {
          value: '0원',
          label: '이번 달',
          trend: 'up',
          trendValue: '+0%'
        },
        order: 1
      },
      {
        id: 'active-campaigns',
        title: '활성 캠페인',
        description: '진행 중인 마케팅 캠페인',
        icon: 'Megaphone',
        url: '/affiliate/campaigns',
        stat: {
          value: 0,
          label: '진행 중'
        },
        actions: [
          { label: '캠페인 생성', url: '/affiliate/campaigns/new', variant: 'primary' }
        ],
        order: 2
      },
      {
        id: 'clicks',
        title: '클릭 수',
        description: '생성한 링크의 클릭 현황',
        icon: 'MousePointer',
        url: '/affiliate/analytics',
        stat: {
          value: 0,
          label: '이번 주 클릭',
          trend: 'up',
          trendValue: '+0%'
        },
        order: 3
      },
      {
        id: 'conversions',
        title: '전환율',
        description: '클릭 대비 구매 전환율',
        icon: 'PieChart',
        url: '/affiliate/analytics',
        stat: {
          value: '0%',
          label: '전환율',
          trend: 'neutral'
        },
        order: 4
      }
    ]
  }
};

/**
 * 역할에 따른 대시보드 설정 가져오기
 */
export function getDashboardForRole(role: UserRole | string | null | undefined): DashboardConfig {
  if (!role) {
    return ROLE_DASHBOARDS.customer;
  }

  return ROLE_DASHBOARDS[role] || ROLE_DASHBOARDS.customer;
}

/**
 * 카드를 순서대로 정렬
 */
export function sortDashboardCards(cards: DashboardCard[]): DashboardCard[] {
  return [...cards].sort((a, b) => (a.order || 999) - (b.order || 999));
}
