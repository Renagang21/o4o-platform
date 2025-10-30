/**
 * 역할별 메뉴 설정 레지스트리
 *
 * 각 역할(customer, seller, supplier, affiliate)별로 표시할 메뉴 항목을 정의합니다.
 */

import { UserRole } from '../../types/user';

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  badge?: string;
  children?: MenuItem[];
}

export interface RoleMenuConfig {
  primary: MenuItem[];
  secondary?: MenuItem[];
}

/**
 * 역할별 메뉴 설정
 */
export const ROLE_MENUS: Record<string, RoleMenuConfig> = {
  customer: {
    primary: [
      { id: 'home', title: '홈', url: '/', icon: 'Home' },
      { id: 'shop', title: '쇼핑', url: '/shop', icon: 'ShoppingCart' },
      { id: 'orders', title: '주문내역', url: '/orders', icon: 'Package' },
      { id: 'wishlist', title: '위시리스트', url: '/wishlist', icon: 'Heart' },
      { id: 'support', title: '고객지원', url: '/support', icon: 'MessageCircle' }
    ],
    secondary: [
      { id: 'profile', title: '프로필', url: '/profile' },
      { id: 'settings', title: '설정', url: '/settings' }
    ]
  },

  seller: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/seller', icon: 'LayoutDashboard' },
      { id: 'products', title: '상품관리', url: '/seller/products', icon: 'Package' },
      { id: 'orders', title: '주문관리', url: '/seller/orders', icon: 'ShoppingBag' },
      { id: 'sales', title: '매출분석', url: '/seller/sales', icon: 'TrendingUp' },
      { id: 'customers', title: '고객관리', url: '/seller/customers', icon: 'Users' },
      { id: 'support', title: '지원', url: '/seller/support', icon: 'HelpCircle' }
    ],
    secondary: [
      { id: 'settings', title: '판매자 설정', url: '/seller/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  },

  supplier: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/supplier', icon: 'LayoutDashboard' },
      { id: 'inventory', title: '재고관리', url: '/supplier/inventory', icon: 'Package' },
      { id: 'orders', title: '주문처리', url: '/supplier/orders', icon: 'ClipboardList' },
      { id: 'products', title: '제품관리', url: '/supplier/products', icon: 'Box' },
      { id: 'partners', title: '파트너관리', url: '/supplier/partners', icon: 'Handshake' },
      { id: 'reports', title: '리포트', url: '/supplier/reports', icon: 'BarChart' }
    ],
    secondary: [
      { id: 'settings', title: '공급자 설정', url: '/supplier/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  },

  affiliate: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/affiliate', icon: 'LayoutDashboard' },
      { id: 'campaigns', title: '캠페인', url: '/affiliate/campaigns', icon: 'Megaphone' },
      { id: 'products', title: '추천상품', url: '/affiliate/products', icon: 'Tag' },
      { id: 'earnings', title: '수익현황', url: '/affiliate/earnings', icon: 'DollarSign' },
      { id: 'links', title: '링크관리', url: '/affiliate/links', icon: 'Link' },
      { id: 'analytics', title: '분석', url: '/affiliate/analytics', icon: 'PieChart' }
    ],
    secondary: [
      { id: 'settings', title: '제휴자 설정', url: '/affiliate/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  }
};

/**
 * 역할에 따른 메뉴 가져오기
 */
export function getMenuForRole(role: UserRole | string | null | undefined): RoleMenuConfig {
  if (!role) {
    return ROLE_MENUS.customer; // 기본값: customer 메뉴
  }

  return ROLE_MENUS[role] || ROLE_MENUS.customer;
}

/**
 * 현재 경로가 활성 메뉴인지 확인
 */
export function isMenuActive(menuUrl: string, currentPath: string): boolean {
  if (menuUrl === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(menuUrl);
}
