/**
 * 역할별 메뉴 설정 레지스트리
 *
 * 각 역할(customer, seller, supplier, partner)별로 표시할 메뉴 항목을 정의합니다.
 *
 * H2-3-1: URL 패턴 정리
 * - Dashboard 진입: /workspace/{role} (역할 검증 및 리다이렉트)
 * - Dashboard 하위: /dashboard/{role}/{page} (직접 라우팅)
 *
 * H2-3-2: Partner/Affiliate 통합
 * - 실제 역할: 'partner'
 * - 'affiliate'는 호환성을 위한 별칭으로 유지
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
  user: {
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
      { id: 'dashboard', title: '대시보드', url: '/workspace/seller', icon: 'LayoutDashboard' },
      { id: 'products', title: '상품관리', url: '/dashboard/seller/products', icon: 'Package' },
      { id: 'orders', title: '주문관리', url: '/dashboard/seller/orders', icon: 'ShoppingBag' },
      { id: 'sales', title: '매출분석', url: '/dashboard/seller/sales', icon: 'TrendingUp' },
      { id: 'customers', title: '고객관리', url: '/dashboard/seller/customers', icon: 'Users' },
      { id: 'support', title: '지원', url: '/dashboard/seller/support', icon: 'HelpCircle' }
    ],
    secondary: [
      { id: 'settings', title: '판매자 설정', url: '/dashboard/seller/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  },

  supplier: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/workspace/supplier', icon: 'LayoutDashboard' },
      { id: 'inventory', title: '재고관리', url: '/dashboard/supplier/inventory', icon: 'Package' },
      { id: 'orders', title: '주문처리', url: '/dashboard/supplier/orders', icon: 'ClipboardList' },
      { id: 'products', title: '제품관리', url: '/dashboard/supplier/products', icon: 'Box' },
      { id: 'partners', title: '파트너관리', url: '/dashboard/supplier/partners', icon: 'Handshake' },
      { id: 'reports', title: '리포트', url: '/dashboard/supplier/reports', icon: 'BarChart' }
    ],
    secondary: [
      { id: 'settings', title: '공급자 설정', url: '/dashboard/supplier/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  },

  // H2-3-2: Changed from 'affiliate' to 'partner' to match actual implementation
  partner: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/workspace/partner', icon: 'LayoutDashboard' },
      { id: 'links', title: '링크관리', url: '/dashboard/partner/links', icon: 'Link' },
      { id: 'analytics', title: '분석', url: '/dashboard/partner/analytics', icon: 'PieChart' },
      { id: 'settlements', title: '정산', url: '/dashboard/partner/settlements', icon: 'DollarSign' }
    ],
    secondary: [
      { id: 'settings', title: '파트너 설정', url: '/dashboard/partner/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  },
  // H2-3-2: Keep 'affiliate' as alias for future compatibility
  affiliate: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/workspace/partner', icon: 'LayoutDashboard' },
      { id: 'links', title: '링크관리', url: '/dashboard/partner/links', icon: 'Link' },
      { id: 'analytics', title: '분석', url: '/dashboard/partner/analytics', icon: 'PieChart' },
      { id: 'settlements', title: '정산', url: '/dashboard/partner/settlements', icon: 'DollarSign' }
    ],
    secondary: [
      { id: 'settings', title: '제휴자 설정', url: '/dashboard/partner/settings' },
      { id: 'profile', title: '프로필', url: '/profile' }
    ]
  }
};

/**
 * 역할에 따른 메뉴 가져오기
 */
export function getMenuForRole(role: UserRole | string | null | undefined): RoleMenuConfig {
  if (!role) {
    return ROLE_MENUS.user; // 기본값: user 메뉴
  }

  return ROLE_MENUS[role] || ROLE_MENUS.user;
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
