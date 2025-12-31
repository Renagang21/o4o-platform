/**
 * SupplierOps Manifest
 *
 * S2S 구조에서 Supplier(공급자) 역할의 운영 앱
 *
 * ## Ops 서비스 책임 범위
 * - 자격 관리: Supplier 프로필, 상태
 * - 상태 관리: Product Master, Offer 활성화/비활성화
 * - 관계 관리: Seller 취급 요청 승인/거절
 *
 * ## Ops 서비스가 하지 않는 것
 * - 업무 방식 판단 (서비스별 정책)
 * - 정책 결정 (승인 조건, 수수료율 등)
 * - 비즈니스 로직 (서비스별 Extension에서 처리)
 *
 * ## S2S 흐름에서의 역할
 * 1. Supplier가 Product Master 생성 (상품 원본)
 * 2. Product Master 기반으로 Offer 생성 (공급 조건)
 * 3. Seller 취급 요청 승인/거절
 * 4. Order Relay를 통해 주문 수신 및 처리
 * 5. 정산 대시보드 조회
 *
 * ## Product 소유권 (S2S 핵심)
 * - Product Master의 Source of Truth는 Supplier에 있음
 * - SupplierOps가 Product Master 생성/수정 담당
 */

export const supplieropsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'supplierops',
  displayName: '공급자 운영',
  version: '1.0.0',
  appType: 'extension' as const,
  description:
    'S2S Supplier 운영 앱 - Product Master 관리, Offer 생성, Seller 관계 관리, 주문 수신, 정산 조회',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core'],
    optional: [],
  },

  /**
   * Database Tables
   * SupplierOps 전용 테이블 (설정/상태 저장용)
   */
  ownsTables: [
    'supplierops_settings',
    'supplierops_notifications',
  ],

  /**
   * Permissions
   */
  permissions: [
    'supplierops.read',
    'supplierops.write',
    'supplierops.supplier.profile',
    'supplierops.product.manage',
    'supplierops.offer.manage',
    'supplierops.order.view',
    'supplierops.settlement.view',
  ],

  /**
   * Lifecycle Hooks
   */
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  /**
   * Features
   */
  features: [
    'supplier-dashboard',
    'supplier-profile-management',
    'product-master-management',
    'offer-creation-workflow',
    'order-relay-monitoring',
    'settlement-dashboard',
  ],

  /**
   * Configuration
   */
  config: {
    enableNotifications: {
      type: 'boolean',
      default: true,
      description: 'Enable in-app notifications for suppliers',
    },
    dashboardRefreshInterval: {
      type: 'number',
      default: 30000,
      description: 'Dashboard auto-refresh interval in milliseconds',
    },
    maxProductsPerPage: {
      type: 'number',
      default: 20,
      description: 'Maximum products to display per page',
    },
  },

  /**
   * Events
   * SupplierOps에서 발행하는 이벤트
   */
  events: [
    'supplierops.product.created',
    'supplierops.offer.created',
    'supplierops.offer.updated',
    'supplierops.notification.sent',
  ],

  /**
   * Subscribed Events
   * dropshipping-core에서 구독하는 이벤트
   */
  subscribedEvents: [
    'product.master.updated',
    'product.offer.updated',
    'listing.created',
    'order.created',
    'order.relay.dispatched',
    'order.relay.fulfilled',
    'settlement.closed',
    'commission.applied',
  ],

  /**
   * API Routes
   */
  apiRoutes: [
    '/api/v1/supplierops/dashboard',
    '/api/v1/supplierops/profile',
    '/api/v1/supplierops/products',
    '/api/v1/supplierops/offers',
    '/api/v1/supplierops/orders',
    '/api/v1/supplierops/settlement',
    '/api/v1/supplierops/notifications',
  ],

  /**
   * Frontend Routes
   */
  frontendRoutes: [
    '/supplierops/dashboard',
    '/supplierops/profile',
    '/supplierops/products',
    '/supplierops/products/new',
    '/supplierops/offers',
    '/supplierops/offers/new',
    '/supplierops/orders',
    '/supplierops/orders/:id',
    '/supplierops/settlement',
  ],

  /**
   * Menu Configuration
   */
  menus: {
    admin: [],
    member: [
      { label: '대시보드', path: '/supplierops/dashboard', icon: 'Dashboard' },
      { label: '내 정보', path: '/supplierops/profile', icon: 'Person' },
      { label: '상품 관리', path: '/supplierops/products', icon: 'Inventory' },
      { label: 'Offer 관리', path: '/supplierops/offers', icon: 'LocalOffer' },
      { label: '주문/Relay', path: '/supplierops/orders', icon: 'LocalShipping' },
      { label: '정산', path: '/supplierops/settlement', icon: 'AccountBalance' },
    ],
  },

  /**
   * Backend Configuration
   */
  backend: {
    entities: [],
    services: ['SupplierOpsService'],
    controllers: ['SupplierOpsController'],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: ['SupplierOpsService'],
    types: ['SupplierOpsDashboardDto', 'SupplierOpsProfileDto'],
    events: [
      'supplierops.product.created',
      'supplierops.offer.created',
      'supplierops.offer.updated',
      'supplierops.notification.sent',
    ],
  },
};

export default supplieropsManifest;
