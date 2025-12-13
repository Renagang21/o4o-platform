/**
 * PharmacyOps Manifest
 *
 * 약국 운영앱 - 의약품 B2B 주문/배송/정산 전용
 *
 * @package @o4o/pharmacyops
 */

export const manifest = {
  meta: {
    appId: 'pharmacyops',
    name: 'Pharmacy Operations',
    displayName: '약국 운영',
    description: '의약품 B2B 주문, 배송 추적, 정산 관리를 위한 약국 전용 운영 시스템',
    version: '1.0.0',
    type: 'service' as const,
    author: 'O4O Platform',
    icon: 'pharmacy',
    category: 'operations',
  },

  dependencies: {
    core: ['pharmaceutical-core'],
    extension: [],
  },

  permissions: {
    // 약국 역할만 접근 가능
    requiredRoles: ['pharmacy'],
    // 약국 개설 허가증 필수
    requiredLicenses: ['pharmacyLicense'],
  },

  cms: {
    cpt: [],
    acf: [],
    viewTemplates: [],
  },

  backend: {
    entities: [],
    services: [
      'PharmacyDashboardService',
      'PharmacyProductService',
      'PharmacyOfferService',
      'PharmacyOrderService',
      'PharmacyDispatchService',
      'PharmacySettlementService',
    ],
    routes: ['/api/v1/pharmacyops/*'],
  },

  navigation: {
    menus: [
      {
        id: 'pharmacyops-main',
        label: '약국 운영',
        path: '/pharmacyops',
        icon: 'pharmacy',
        children: [
          { id: 'pharmacyops-dashboard', label: '대시보드', path: '/pharmacyops/dashboard', icon: 'dashboard' },
          { id: 'pharmacyops-products', label: '의약품 목록', path: '/pharmacyops/products', icon: 'medication' },
          { id: 'pharmacyops-offers', label: '도매 Offer', path: '/pharmacyops/offers', icon: 'local_offer' },
          { id: 'pharmacyops-orders', label: '주문 관리', path: '/pharmacyops/orders', icon: 'shopping_cart' },
          { id: 'pharmacyops-dispatch', label: '배송 조회', path: '/pharmacyops/dispatch', icon: 'local_shipping' },
          { id: 'pharmacyops-settlement', label: '구매 내역', path: '/pharmacyops/settlement', icon: 'receipt_long' },
        ],
      },
    ],
    adminRoutes: [
      '/pharmacyops',
      '/pharmacyops/dashboard',
      '/pharmacyops/products',
      '/pharmacyops/offers',
      '/pharmacyops/orders',
      '/pharmacyops/orders/create',
      '/pharmacyops/orders/:orderId',
      '/pharmacyops/dispatch',
      '/pharmacyops/settlement',
    ],
  },

  // 약국 전용 설정
  config: {
    // PHARMACEUTICAL 제품만 표시
    productTypeFilter: ['pharmaceutical'],
    // B2C Listing 기능 비활성화
    enableListing: false,
    // 파트너 추천 비활성화
    enablePartnerRecommendation: false,
    // 정산 타입 (약국은 구매자이므로 지출 기반)
    settlementViewMode: 'expense',
  },
};

export default manifest;
