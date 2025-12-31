/**
 * SellerOps Manifest
 *
 * S2S 구조에서 Seller(판매자) 역할의 운영 앱
 *
 * ## Ops 서비스 책임 범위
 * - 자격 관리: Seller 프로필, 상태
 * - 상태 관리: Listing 활성화/비활성화
 * - 관계 관리: Supplier 승인 요청, Offer 선택
 *
 * ## Ops 서비스가 하지 않는 것
 * - 업무 방식 판단 (서비스별 정책)
 * - 정책 결정 (승인 조건, 수수료율 등)
 * - 비즈니스 로직 (서비스별 Extension에서 처리)
 *
 * ## S2S 흐름에서의 역할
 * 1. Seller가 Supplier에게 취급 요청
 * 2. Supplier 승인 후 Offer 선택 가능
 * 3. Offer 선택 → Listing 생성
 * 4. 주문 발생 시 Order Relay 모니터링
 * 5. 정산 대시보드 조회
 */

export const selleropsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'sellerops',
  displayName: '판매자 운영',
  version: '1.0.0',
  appType: 'extension' as const,
  description: 'S2S Seller 운영 앱 - 공급자 관계 관리, Offer 선택, Listing 관리, 주문 모니터링, 정산 조회',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core'],
    optional: [],
  },

  /**
   * Database Tables
   * SellerOps 전용 테이블 (설정/상태 저장용)
   */
  ownsTables: [
    'sellerops_settings',
    'sellerops_notifications',
    'sellerops_documents',
  ],

  /**
   * Permissions
   */
  permissions: [
    'sellerops.read',
    'sellerops.write',
    'sellerops.seller.profile',
    'sellerops.supplier.request',
    'sellerops.listing.manage',
    'sellerops.order.view',
    'sellerops.settlement.view',
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
    'seller-dashboard',
    'seller-profile-management',
    'supplier-approval-request',
    'offer-to-listing-workflow',
    'order-relay-monitoring',
    'settlement-dashboard',
    'notice-document-center',
  ],

  /**
   * Configuration
   */
  config: {
    enableNotifications: {
      type: 'boolean',
      default: true,
      description: 'Enable in-app notifications for sellers',
    },
    dashboardRefreshInterval: {
      type: 'number',
      default: 30000,
      description: 'Dashboard auto-refresh interval in milliseconds',
    },
    maxListingsPerPage: {
      type: 'number',
      default: 20,
      description: 'Maximum listings to display per page',
    },
  },

  /**
   * Events
   * SellerOps에서 발행하는 이벤트
   */
  events: [
    'sellerops.supplier.requested',
    'sellerops.listing.created',
    'sellerops.listing.activated',
    'sellerops.notification.sent',
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
    '/api/v1/sellerops/dashboard',
    '/api/v1/sellerops/profile',
    '/api/v1/sellerops/suppliers',
    '/api/v1/sellerops/listings',
    '/api/v1/sellerops/orders',
    '/api/v1/sellerops/settlement',
    '/api/v1/sellerops/notifications',
    '/api/v1/sellerops/documents',
  ],

  /**
   * Frontend Routes
   */
  frontendRoutes: [
    '/sellerops/dashboard',
    '/sellerops/profile',
    '/sellerops/suppliers',
    '/sellerops/listings',
    '/sellerops/listings/new',
    '/sellerops/orders',
    '/sellerops/orders/:id',
    '/sellerops/settlement',
    '/sellerops/notice',
  ],

  /**
   * Menu Configuration
   */
  menus: {
    admin: [],
    member: [
      { label: '대시보드', path: '/sellerops/dashboard', icon: 'Dashboard' },
      { label: '내 정보', path: '/sellerops/profile', icon: 'Person' },
      { label: '공급자 관리', path: '/sellerops/suppliers', icon: 'Inventory' },
      { label: '리스팅 관리', path: '/sellerops/listings', icon: 'ShoppingCart' },
      { label: '주문/배송', path: '/sellerops/orders', icon: 'LocalShipping' },
      { label: '정산', path: '/sellerops/settlement', icon: 'AccountBalance' },
      { label: '공지사항', path: '/sellerops/notice', icon: 'Announcement' },
    ],
  },

  /**
   * Backend Configuration
   */
  backend: {
    entities: [],
    services: ['SellerOpsService'],
    controllers: ['SellerOpsController'],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: ['SellerOpsService'],
    types: ['SellerOpsDashboardDto', 'SellerOpsProfileDto'],
    events: [
      'sellerops.supplier.requested',
      'sellerops.listing.created',
      'sellerops.listing.activated',
      'sellerops.notification.sent',
    ],
  },
};

export default selleropsManifest;
