// Role-based menu permissions configuration
// Defines which roles have access to which menu items and features

export type UserRole = 'admin' | 'business' | 'affiliate' | 'customer' | 'seller' | 'supplier' | 'manager' | 'retailer';

export interface MenuPermission {
  menuId: string;
  roles: UserRole[];
  permissions?: string[];
}

// Complete menu permission mapping
export const menuPermissions: MenuPermission[] = [
  // Dashboard - All roles can access
  {
    menuId: 'dashboard',
    roles: ['admin', 'business', 'affiliate', 'customer', 'seller', 'supplier', 'manager', 'retailer'],
  },
  {
    menuId: 'dashboard-home',
    roles: ['admin', 'business', 'affiliate', 'customer', 'seller', 'supplier', 'manager', 'retailer'],
  },
  {
    menuId: 'dashboard-updates',
    roles: ['admin', 'manager'],
    permissions: ['updates:read']
  },

  // Content Management - Admin, Manager, Business
  {
    menuId: 'posts',
    roles: ['admin', 'manager', 'business'],
    permissions: ['content:read']
  },
  {
    menuId: 'posts-all',
    roles: ['admin', 'manager', 'business'],
    permissions: ['content:read']
  },
  {
    menuId: 'posts-new',
    roles: ['admin', 'manager', 'business'],
    permissions: ['content:write']
  },
  {
    menuId: 'posts-categories',
    roles: ['admin', 'manager'],
    permissions: ['categories:read']
  },
  {
    menuId: 'posts-tags',
    roles: ['admin', 'manager'],
    permissions: ['categories:read']
  },

  // Media - Admin, Manager, Business, Seller
  {
    menuId: 'media',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier'],
    permissions: ['media:read']
  },
  {
    menuId: 'media-library',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier'],
    permissions: ['media:read']
  },
  {
    menuId: 'media-new',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier'],
    permissions: ['media:write']
  },

  // Pages - Admin, Manager
  {
    menuId: 'pages',
    roles: ['admin', 'manager'],
    permissions: ['pages:read']
  },
  {
    menuId: 'pages-all',
    roles: ['admin', 'manager'],
    permissions: ['pages:read']
  },
  {
    menuId: 'pages-new',
    roles: ['admin', 'manager'],
    permissions: ['pages:write']
  },

  // E-commerce - Admin, Manager, Business, Seller, Supplier
  {
    menuId: 'ecommerce',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier', 'retailer'],
    permissions: ['ecommerce:read']
  },
  {
    menuId: 'products',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier', 'retailer'],
    permissions: ['products:read']
  },
  {
    menuId: 'orders',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier', 'retailer'],
    permissions: ['orders:read']
  },
  {
    menuId: 'customers',
    roles: ['admin', 'manager', 'business'],
    permissions: ['customers:read']
  },
  {
    menuId: 'coupons',
    roles: ['admin', 'manager', 'business'],
    permissions: ['coupons:read']
  },
  {
    menuId: 'reports',
    roles: ['admin', 'manager', 'business', 'seller', 'supplier'],
    permissions: ['analytics:read']
  },
  {
    menuId: 'ecommerce-settings',
    roles: ['admin', 'manager'],
    permissions: ['settings:write']
  },

  // Vendor Management - Admin, Manager
  {
    menuId: 'vendors',
    roles: ['admin', 'manager'],
    permissions: ['vendors:read']
  },
  {
    menuId: 'vendors-all',
    roles: ['admin', 'manager'],
    permissions: ['vendors:read']
  },
  {
    menuId: 'vendors-pending',
    roles: ['admin', 'manager'],
    permissions: ['vendors:write']
  },
  {
    menuId: 'vendors-commission',
    roles: ['admin', 'manager'],
    permissions: ['vendors:write']
  },
  {
    menuId: 'vendors-reports',
    roles: ['admin', 'manager'],
    permissions: ['vendors:read']
  },

  // Affiliate Marketing - Admin, Manager, Affiliate
  {
    menuId: 'affiliate',
    roles: ['admin', 'manager', 'affiliate'],
    permissions: ['affiliate:read']
  },
  {
    menuId: 'affiliates-manage',
    roles: ['admin', 'manager'],
    permissions: ['affiliate:write']
  },
  {
    menuId: 'affiliate-links',
    roles: ['admin', 'manager', 'affiliate'],
    permissions: ['affiliate:read']
  },
  {
    menuId: 'affiliate-commission',
    roles: ['admin', 'manager', 'affiliate'],
    permissions: ['affiliate:read']
  },
  {
    menuId: 'affiliate-analytics',
    roles: ['admin', 'manager', 'affiliate'],
    permissions: ['affiliate:read']
  },

  // Forum - All roles except customer
  {
    menuId: 'forum',
    roles: ['admin', 'manager', 'business', 'affiliate', 'seller', 'supplier', 'retailer'],
    permissions: ['forum:read']
  },

  // Digital Signage - Admin, Manager, Business
  {
    menuId: 'signage',
    roles: ['admin', 'manager', 'business'],
    permissions: ['signage:read']
  },

  // Crowdfunding - Admin, Manager, Business
  {
    menuId: 'crowdfunding',
    roles: ['admin', 'manager', 'business'],
    permissions: ['crowdfunding:read']
  },

  // Mail Management - Admin, Manager
  {
    menuId: 'mail',
    roles: ['admin', 'manager'],
    permissions: ['mail:read']
  },
  {
    menuId: 'mail-templates',
    roles: ['admin', 'manager'],
    permissions: ['mail:write']
  },
  {
    menuId: 'mail-smtp',
    roles: ['admin'],
    permissions: ['settings:write']
  },
  {
    menuId: 'mail-logs',
    roles: ['admin', 'manager'],
    permissions: ['mail:read']
  },

  // CPT & ACF - Admin only
  {
    menuId: 'cpt-acf',
    roles: ['admin'],
    permissions: ['content:write']
  },
  {
    menuId: 'cpt-types',
    roles: ['admin'],
    permissions: ['content:write']
  },
  {
    menuId: 'acf-fields',
    roles: ['admin'],
    permissions: ['custom_fields:write']
  },
  {
    menuId: 'acf-groups',
    roles: ['admin'],
    permissions: ['custom_fields:write']
  },

  // Theme - Admin, Manager
  {
    menuId: 'theme',
    roles: ['admin', 'manager'],
    permissions: ['templates:read']
  },
  {
    menuId: 'themes',
    roles: ['admin', 'manager'],
    permissions: ['templates:read']
  },
  {
    menuId: 'customize',
    roles: ['admin', 'manager'],
    permissions: ['templates:write']
  },
  {
    menuId: 'menus',
    roles: ['admin', 'manager'],
    permissions: ['menus:write']
  },

  // Users - Admin, Manager (limited)
  {
    menuId: 'users',
    roles: ['admin', 'manager'],
    permissions: ['users:read']
  },
  {
    menuId: 'users-all',
    roles: ['admin', 'manager'],
    permissions: ['users:read']
  },
  {
    menuId: 'users-new',
    roles: ['admin'],
    permissions: ['users:create']
  },
  {
    menuId: 'users-profile',
    roles: ['admin', 'manager', 'business', 'affiliate', 'seller', 'supplier', 'retailer'],
    permissions: ['users:read']
  },
  {
    menuId: 'users-roles',
    roles: ['admin'],
    permissions: ['users:update']
  },

  // Tools - Admin, Manager
  {
    menuId: 'tools',
    roles: ['admin', 'manager'],
    permissions: ['tools:read']
  },

  // Settings - Admin only
  {
    menuId: 'settings',
    roles: ['admin'],
    permissions: ['settings:read']
  },

  // Collapse menu - All roles
  {
    menuId: 'collapse',
    roles: ['admin', 'business', 'affiliate', 'customer', 'seller', 'supplier', 'manager', 'retailer'],
  }
];

// Helper function to check if a role has access to a menu item
export function hasMenuAccess(menuId: string, userRole: UserRole, userPermissions?: string[]): boolean {
  const menuPermission = menuPermissions.find(mp => mp.menuId === menuId);
  
  if (!menuPermission) {
    return false; // Menu item not found
  }

  // Check if user has the required role
  if (!menuPermission.roles.includes(userRole)) {
    return false;
  }

  // If menu requires specific permissions, check if user has them
  if (menuPermission.permissions && menuPermission.permissions.length > 0) {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }
    
    // User must have at least one of the required permissions
    return menuPermission.permissions.some(permission => 
      userPermissions.includes(permission)
    );
  }

  return true;
}

// Helper function to filter menu items based on user role and permissions
export function filterMenuByRole(menuItems: any[], userRole: UserRole, userPermissions?: string[]): any[] {
  return menuItems
    .filter(item => hasMenuAccess(item.id, userRole, userPermissions))
    .map(item => {
      if (item.children) {
        const filteredChildren = filterMenuByRole(item.children, userRole, userPermissions);
        
        // Only include parent if it has accessible children
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }
      return item;
    })
    .filter(Boolean);
}

// Role display names (Korean)
export const roleDisplayNames: Record<UserRole, string> = {
  admin: '관리자',
  business: '비즈니스',
  affiliate: '제휴사',
  customer: '고객',
  seller: '판매자',
  supplier: '공급자',
  manager: '매니저',
  retailer: '소매업자'
};

// Role capabilities summary
export const roleCapabilities: Record<UserRole, string[]> = {
  admin: [
    '전체 시스템 관리',
    '사용자 관리',
    '설정 변경',
    '모든 기능 접근'
  ],
  manager: [
    '콘텐츠 관리',
    '주문 관리',
    '제휴사 관리',
    '보고서 확인'
  ],
  business: [
    '상품 관리',
    '주문 확인',
    '콘텐츠 작성',
    '디지털 사이니지'
  ],
  seller: [
    '상품 등록',
    '주문 관리',
    '매출 확인',
    '미디어 업로드'
  ],
  supplier: [
    '상품 공급',
    '재고 관리',
    '주문 처리',
    '보고서 확인'
  ],
  affiliate: [
    '제휴 링크 관리',
    '수수료 확인',
    '성과 분석',
    '프로필 관리'
  ],
  retailer: [
    '상품 판매',
    '주문 관리',
    '재고 확인',
    '매출 분석'
  ],
  customer: [
    '대시보드 확인',
    '프로필 관리'
  ]
};