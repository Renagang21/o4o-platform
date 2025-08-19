import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Truck,
  Link,
  BarChart3,
  Settings,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Shield,
  Database,
  Cloud
} from 'lucide-react';

/**
 * 드롭쉬핑 메뉴를 기존 전자상거래 관리자 메뉴에 통합
 * 각 메뉴 섹션에 드롭쉬핑 관련 하위 메뉴를 추가
 */

export const dropshippingMenuExtensions = {
  // 제품 관리 메뉴 확장
  products: {
    title: '드롭쉬핑',
    icon: <Package className="h-4 w-4" />,
    submenu: [
      {
        title: '공급자 제품',
        path: '/admin/products/dropshipping/supplier',
        icon: <Package className="h-4 w-4" />,
        description: '공급자가 등록한 제품 관리',
        permissions: ['manage_dropshipping_products']
      },
      {
        title: '제품 승인',
        path: '/admin/products/dropshipping/approval',
        icon: <CheckCircle className="h-4 w-4" />,
        description: '신규 드롭쉬핑 제품 승인',
        badge: 'pending_count',
        permissions: ['approve_products']
      },
      {
        title: '제품 매핑',
        path: '/admin/products/dropshipping/mapping',
        icon: <Link className="h-4 w-4" />,
        description: '드롭쉬핑-전자상거래 제품 연결',
        permissions: ['manage_product_mapping']
      },
      {
        title: '재고 동기화',
        path: '/admin/products/dropshipping/inventory-sync',
        icon: <Database className="h-4 w-4" />,
        description: '실시간 재고 동기화 관리',
        permissions: ['manage_inventory']
      }
    ]
  },

  // 주문 관리 메뉴 확장
  orders: {
    title: '드롭쉬핑 주문',
    icon: <ShoppingCart className="h-4 w-4" />,
    submenu: [
      {
        title: '드롭쉬핑 주문',
        path: '/admin/orders/dropshipping',
        icon: <ShoppingCart className="h-4 w-4" />,
        description: '드롭쉬핑 주문 목록',
        permissions: ['view_dropshipping_orders']
      },
      {
        title: '공급자별 주문',
        path: '/admin/orders/by-supplier',
        icon: <Users className="h-4 w-4" />,
        description: '공급자별 주문 현황',
        permissions: ['view_supplier_orders']
      },
      {
        title: '주문 라우팅',
        path: '/admin/orders/routing',
        icon: <Truck className="h-4 w-4" />,
        description: '자동 주문 분배 설정',
        permissions: ['manage_order_routing']
      },
      {
        title: '배송 추적',
        path: '/admin/orders/tracking',
        icon: <Truck className="h-4 w-4" />,
        description: '통합 배송 추적',
        permissions: ['view_shipping_tracking']
      }
    ]
  },

  // 사용자 관리 메뉴 확장
  users: {
    title: '드롭쉬핑 사용자',
    icon: <Users className="h-4 w-4" />,
    submenu: [
      {
        title: '공급자 관리',
        path: '/admin/users/suppliers',
        icon: <Package className="h-4 w-4" />,
        description: '공급자 목록 및 승인',
        badge: 'pending_suppliers',
        permissions: ['manage_suppliers']
      },
      {
        title: '판매자 관리',
        path: '/admin/users/sellers',
        icon: <ShoppingCart className="h-4 w-4" />,
        description: '판매자 목록 및 실적',
        permissions: ['manage_sellers']
      },
      {
        title: '제휴자 관리',
        path: '/admin/users/affiliates',
        icon: <Link className="h-4 w-4" />,
        description: '제휴자 및 수수료 관리',
        permissions: ['manage_affiliates']
      },
      {
        title: '역할 승인',
        path: '/admin/users/role-approvals',
        icon: <Shield className="h-4 w-4" />,
        description: '역할 신청 검토 및 승인',
        badge: 'pending_approvals',
        permissions: ['approve_roles']
      }
    ]
  },

  // 재무 관리 메뉴 확장
  finance: {
    title: '드롭쉬핑 정산',
    icon: <DollarSign className="h-4 w-4" />,
    submenu: [
      {
        title: '수수료 정산',
        path: '/admin/finance/dropshipping/settlements',
        icon: <DollarSign className="h-4 w-4" />,
        description: '공급자/판매자 정산',
        permissions: ['manage_settlements']
      },
      {
        title: '제휴 수수료',
        path: '/admin/finance/affiliate-commissions',
        icon: <TrendingUp className="h-4 w-4" />,
        description: '제휴 수수료 관리',
        permissions: ['manage_commissions']
      },
      {
        title: '지급 관리',
        path: '/admin/finance/payouts',
        icon: <DollarSign className="h-4 w-4" />,
        description: '지급 요청 및 처리',
        badge: 'pending_payouts',
        permissions: ['process_payouts']
      },
      {
        title: '수수료 정책',
        path: '/admin/finance/commission-policies',
        icon: <Settings className="h-4 w-4" />,
        description: '수수료율 설정',
        permissions: ['manage_commission_rates']
      }
    ]
  },

  // 보고서 메뉴 확장
  reports: {
    title: '드롭쉬핑 분석',
    icon: <BarChart3 className="h-4 w-4" />,
    submenu: [
      {
        title: '드롭쉬핑 대시보드',
        path: '/admin/reports/dropshipping-dashboard',
        icon: <BarChart3 className="h-4 w-4" />,
        description: '통합 실적 대시보드',
        permissions: ['view_analytics']
      },
      {
        title: '공급자 실적',
        path: '/admin/reports/supplier-performance',
        icon: <TrendingUp className="h-4 w-4" />,
        description: '공급자별 판매 실적',
        permissions: ['view_supplier_reports']
      },
      {
        title: '판매자 실적',
        path: '/admin/reports/seller-performance',
        icon: <TrendingUp className="h-4 w-4" />,
        description: '판매자별 수익 분석',
        permissions: ['view_seller_reports']
      },
      {
        title: '제품 성과',
        path: '/admin/reports/product-performance',
        icon: <Package className="h-4 w-4" />,
        description: '제품별 판매 분석',
        permissions: ['view_product_reports']
      }
    ]
  },

  // 설정 메뉴 확장
  settings: {
    title: '드롭쉬핑 설정',
    icon: <Settings className="h-4 w-4" />,
    submenu: [
      {
        title: '통합 설정',
        path: '/admin/settings/dropshipping/integration',
        icon: <Cloud className="h-4 w-4" />,
        description: '전자상거래 통합 설정',
        component: 'EcommerceIntegration',
        permissions: ['manage_integration']
      },
      {
        title: '자동화 규칙',
        path: '/admin/settings/dropshipping/automation',
        icon: <Settings className="h-4 w-4" />,
        description: '주문 처리 자동화',
        permissions: ['manage_automation']
      },
      {
        title: '알림 설정',
        path: '/admin/settings/dropshipping/notifications',
        icon: <AlertCircle className="h-4 w-4" />,
        description: '알림 및 이메일 설정',
        permissions: ['manage_notifications']
      },
      {
        title: 'API 연동',
        path: '/admin/settings/dropshipping/api',
        icon: <Link className="h-4 w-4" />,
        description: '외부 서비스 연동',
        permissions: ['manage_api_settings']
      }
    ]
  }
};

/**
 * 대시보드 위젯 정의
 */
export const dropshippingDashboardWidgets = [
  {
    id: 'dropship_overview',
    title: '드롭쉬핑 현황',
    component: 'DropshippingOverviewWidget',
    position: 'top',
    size: 'full',
    permissions: ['view_dropshipping_dashboard'],
    metrics: [
      { key: 'total_suppliers', label: '활성 공급자', icon: Users },
      { key: 'total_products', label: '드롭쉬핑 제품', icon: Package },
      { key: 'pending_orders', label: '처리 대기', icon: ShoppingCart },
      { key: 'today_revenue', label: '오늘 매출', icon: DollarSign }
    ]
  },
  {
    id: 'dropship_orders_chart',
    title: '드롭쉬핑 주문 추이',
    component: 'DropshippingOrdersChart',
    position: 'main',
    size: 'half',
    permissions: ['view_order_analytics']
  },
  {
    id: 'supplier_performance',
    title: '상위 공급자',
    component: 'TopSuppliersWidget',
    position: 'main',
    size: 'half',
    permissions: ['view_supplier_analytics']
  },
  {
    id: 'pending_approvals',
    title: '승인 대기',
    component: 'PendingApprovalsWidget',
    position: 'sidebar',
    size: 'small',
    permissions: ['manage_approvals'],
    actions: [
      { label: '공급자 승인', path: '/admin/users/role-approvals' },
      { label: '제품 승인', path: '/admin/products/dropshipping/approval' }
    ]
  },
  {
    id: 'inventory_alerts',
    title: '재고 알림',
    component: 'InventoryAlertsWidget',
    position: 'sidebar',
    size: 'small',
    permissions: ['view_inventory_alerts']
  }
];

/**
 * 빠른 작업 메뉴
 */
export const dropshippingQuickActions = [
  {
    title: '제품 승인',
    icon: <CheckCircle className="h-5 w-5" />,
    path: '/admin/products/dropshipping/approval',
    color: 'blue',
    badge: 'pending_products',
    permissions: ['approve_products']
  },
  {
    title: '주문 처리',
    icon: <ShoppingCart className="h-5 w-5" />,
    path: '/admin/orders/dropshipping',
    color: 'green',
    badge: 'pending_orders',
    permissions: ['process_orders']
  },
  {
    title: '지급 처리',
    icon: <DollarSign className="h-5 w-5" />,
    path: '/admin/finance/payouts',
    color: 'yellow',
    badge: 'pending_payouts',
    permissions: ['process_payouts']
  },
  {
    title: '통합 동기화',
    icon: <Cloud className="h-5 w-5" />,
    action: 'sync_all',
    color: 'purple',
    permissions: ['manage_integration']
  }
];

/**
 * 알림 유형 정의
 */
export const dropshippingNotificationTypes = {
  supplier_registration: {
    title: '새 공급자 등록',
    description: '새로운 공급자가 가입 승인을 대기 중입니다.',
    icon: Users,
    color: 'blue',
    action: '/admin/users/suppliers'
  },
  product_pending: {
    title: '제품 승인 대기',
    description: '새 드롭쉬핑 제품이 승인을 대기 중입니다.',
    icon: Package,
    color: 'yellow',
    action: '/admin/products/dropshipping/approval'
  },
  low_stock: {
    title: '재고 부족',
    description: '드롭쉬핑 제품의 재고가 부족합니다.',
    icon: AlertCircle,
    color: 'red',
    action: '/admin/products/dropshipping/inventory-sync'
  },
  order_issue: {
    title: '주문 처리 문제',
    description: '드롭쉬핑 주문 처리 중 문제가 발생했습니다.',
    icon: AlertCircle,
    color: 'red',
    action: '/admin/orders/dropshipping'
  },
  payout_request: {
    title: '지급 요청',
    description: '새로운 지급 요청이 있습니다.',
    icon: DollarSign,
    color: 'green',
    action: '/admin/finance/payouts'
  }
};

/**
 * 권한 그룹 정의
 */
export const dropshippingPermissionGroups = {
  dropshipping_admin: [
    'manage_dropshipping_products',
    'approve_products',
    'manage_product_mapping',
    'manage_inventory',
    'view_dropshipping_orders',
    'view_supplier_orders',
    'manage_order_routing',
    'view_shipping_tracking',
    'manage_suppliers',
    'manage_sellers',
    'manage_affiliates',
    'approve_roles',
    'manage_settlements',
    'manage_commissions',
    'process_payouts',
    'manage_commission_rates',
    'view_analytics',
    'manage_integration',
    'manage_automation',
    'manage_notifications',
    'manage_api_settings'
  ],
  dropshipping_manager: [
    'view_dropshipping_orders',
    'view_supplier_orders',
    'view_shipping_tracking',
    'manage_suppliers',
    'manage_sellers',
    'manage_affiliates',
    'view_analytics',
    'view_supplier_reports',
    'view_seller_reports',
    'view_product_reports'
  ],
  dropshipping_operator: [
    'view_dropshipping_orders',
    'process_orders',
    'view_shipping_tracking',
    'view_inventory_alerts'
  ]
};

/**
 * 통합 설정 기본값
 */
export const dropshippingDefaultSettings = {
  integration: {
    autoSyncProducts: true,
    autoSyncInventory: true,
    autoSyncPrices: true,
    autoProcessOrders: false,
    syncInterval: 15, // minutes
    lowStockThreshold: 10,
    priceMarkupDefault: 30 // percentage
  },
  notifications: {
    emailOnNewSupplier: true,
    emailOnProductPending: true,
    emailOnLowStock: true,
    emailOnOrderIssue: true,
    emailOnPayoutRequest: true,
    slackIntegration: false,
    slackWebhookUrl: ''
  },
  commission: {
    platformFeePercentage: 5,
    defaultSupplierCommission: 70,
    defaultAffiliateCommission: 10,
    tierBonuses: {
      silver: 20,
      gold: 50,
      platinum: 100
    }
  },
  automation: {
    autoApproveVerifiedSuppliers: false,
    autoApproveProductsUnderPrice: 0,
    autoProcessOrdersUnderAmount: 0,
    autoRejectLowQualityProducts: false,
    minProductRating: 3.0
  }
};