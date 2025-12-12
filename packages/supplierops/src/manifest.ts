/**
 * SupplierOps Manifest
 *
 * AppStore 표준 manifest - 범용 공급자 운영 앱
 *
 * Phase 2 업데이트:
 * - Core Extension Interface 구현
 * - Hook 기반 Validation 지원
 */

export const supplieropsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'supplierops',
  displayName: '공급자 운영',
  version: '1.0.0',
  appType: 'extension' as const,
  description:
    'Universal Supplier Operations App - Product management, Offer creation, Order relay monitoring, Settlement dashboard',

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
