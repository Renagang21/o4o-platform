/**
 * Pharmaceutical Core Manifest
 *
 * S2S 구조에서 의약품(Pharmaceutical) 규제 도메인의 Core App
 *
 * ## S2S 관점에서의 역할
 * - S2S 구조 위에서 의약품 규제 특수성 구현
 * - productType = 'pharmaceutical' 상품에 대한 독립 워크플로우
 * - 규제 도메인으로서 별도 Core App으로 분리됨 (Extension이 아님)
 *
 * ## 규제 도메인 특수성 (Core에서 직접 관리)
 * - 약국/도매상 라이선스 검증
 * - 약품코드(표준코드) 관리
 * - 의약품 전용 주문 워크플로우
 * - 콜드체인 추적
 *
 * ## S2S Core(dropshipping-core)와의 관계
 * - pharmaceutical-core는 dropshipping-core에 의존
 * - productType='pharmaceutical' 상품은 이 Core에서 검증
 * - Listing 생성 차단 (B2B 전용, 일반 판매 불가)
 *
 * ## 하드코딩 상수 (역사적 결정, 추후 일반화 대상)
 * - defaultPlatformFeeRate: 2%
 * - maxCommissionRate: 2%
 * - settlementPeriodDays: 7일
 *
 * @package @o4o/pharmaceutical-core
 */

export const pharmaceuticalCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'pharmaceutical-core',
  displayName: '의약품 S2S',
  version: '1.0.0',
  appType: 'core' as const,
  description:
    'S2S 의약품 규제 도메인 Core - 라이선스 검증, 약품코드 관리, B2B 주문 워크플로우',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core'], // Dropshipping Core와 연동
    optional: [],
  },

  /**
   * Database Tables
   * Pharmaceutical Core 전용 테이블
   */
  ownsTables: [
    'pharma_product_masters',
    'pharma_offers',
    'pharma_orders',
    'pharma_settlement_batches',
  ],

  /**
   * Permissions
   */
  permissions: [
    // 의약품 상품 관리
    'pharma.product.read',
    'pharma.product.create',
    'pharma.product.update',
    'pharma.product.delete',
    // Offer 관리 (도매상/제조사)
    'pharma.offer.read',
    'pharma.offer.create',
    'pharma.offer.update',
    'pharma.offer.delete',
    // 주문 관리
    'pharma.order.read',
    'pharma.order.create',
    'pharma.order.update',
    'pharma.order.cancel',
    // 정산 관리
    'pharma.settlement.read',
    'pharma.settlement.create',
    'pharma.settlement.close',
    'pharma.settlement.pay',
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
    'pharma-product-management',      // 의약품 상품 관리
    'pharma-offer-management',        // 공급 조건 관리
    'pharma-order-workflow',          // B2B 주문 워크플로우
    'pharma-settlement',              // 정산 관리
    'pharmacy-license-validation',    // 약국/도매상 라이선스 검증
    'drug-code-management',           // 약품코드 관리
  ],

  /**
   * Configuration
   */
  config: {
    defaultPlatformFeeRate: {
      type: 'number',
      default: 0.02,
      description: 'Default platform fee rate (2%)',
    },
    maxCommissionRate: {
      type: 'number',
      default: 0.02,
      description: 'Maximum commission rate for pharmaceutical (2%)',
    },
    settlementPeriodDays: {
      type: 'number',
      default: 7,
      description: 'Settlement payment due days after closing',
    },
    enableColdChainTracking: {
      type: 'boolean',
      default: true,
      description: 'Enable cold chain tracking for temperature-sensitive drugs',
    },
  },

  /**
   * Events
   * Pharmaceutical Core에서 발행하는 이벤트
   */
  events: [
    'pharma.product.created',
    'pharma.product.updated',
    'pharma.offer.created',
    'pharma.offer.updated',
    'pharma.order.created',
    'pharma.order.confirmed',
    'pharma.order.shipped',
    'pharma.order.delivered',
    'pharma.order.cancelled',
    'pharma.settlement.created',
    'pharma.settlement.closed',
    'pharma.settlement.paid',
  ],

  /**
   * Subscribed Events
   * Dropshipping Core에서 구독하는 이벤트
   */
  subscribedEvents: [
    'product.master.created',
    'product.master.updated',
  ],

  /**
   * API Routes
   */
  apiRoutes: [
    '/api/v1/pharma/products',
    '/api/v1/pharma/products/:id',
    '/api/v1/pharma/offers',
    '/api/v1/pharma/offers/:id',
    '/api/v1/pharma/orders',
    '/api/v1/pharma/orders/:id',
    '/api/v1/pharma/settlement',
    '/api/v1/pharma/settlement/:id',
  ],

  /**
   * Frontend Routes
   */
  frontendRoutes: [
    '/pharma/products',
    '/pharma/products/new',
    '/pharma/products/:id',
    '/pharma/offers',
    '/pharma/offers/new',
    '/pharma/offers/:id',
    '/pharma/orders',
    '/pharma/orders/:id',
    '/pharma/settlement',
    '/pharma/settlement/:id',
  ],

  /**
   * Menu Configuration
   */
  menus: {
    admin: [
      { label: '의약품 상품', path: '/pharma/products', icon: 'Medication' },
      { label: '의약품 정산', path: '/pharma/settlement', icon: 'AccountBalance' },
    ],
    member: [
      { label: '의약품 카탈로그', path: '/pharma/products', icon: 'Medication' },
      { label: '내 Offer', path: '/pharma/offers', icon: 'LocalOffer' },
      { label: '주문 관리', path: '/pharma/orders', icon: 'Receipt' },
      { label: '정산', path: '/pharma/settlement', icon: 'AccountBalance' },
    ],
  },

  /**
   * Backend Configuration
   */
  backend: {
    entities: [
      'PharmaProductMaster',
      'PharmaOffer',
      'PharmaOrder',
      'PharmaSettlementBatch',
    ],
    services: [
      'PharmaProductService',
      'PharmaOfferService',
      'PharmaOrderService',
      'PharmaSettlementService',
    ],
    controllers: [
      'PharmaProductController',
      'PharmaOfferController',
      'PharmaOrderController',
      'PharmaSettlementController',
    ],
    routesExport: 'createRoutes',
  },

  /**
   * Extension Interface
   * Dropshipping Core Extension으로 등록
   */
  extensionInterface: {
    targetCore: 'dropshipping-core',
    extensionExport: 'pharmaceuticalExtension',
    supportedProductTypes: ['pharmaceutical'],
    hooks: {
      validateOfferCreation: true,
      validateListingCreation: true,  // Always block
      validateOrderCreation: true,
      beforeSettlementCreate: true,
      beforeCommissionApply: true,
      afterCommissionApply: true,
    },
  },

  /**
   * Exposes
   */
  exposes: {
    entities: [
      'PharmaProductMaster',
      'PharmaOffer',
      'PharmaOrder',
      'PharmaSettlementBatch',
    ],
    services: [
      'PharmaProductService',
      'PharmaOfferService',
      'PharmaOrderService',
      'PharmaSettlementService',
    ],
    types: [
      'PharmaProductCategory',
      'PharmaProductStatus',
      'PharmaOfferStatus',
      'PharmaSupplierType',
      'PharmaOrderStatus',
      'PharmaPaymentStatus',
      'PharmaSettlementStatus',
      'PharmaSettlementType',
    ],
    events: [
      'pharma.product.created',
      'pharma.product.updated',
      'pharma.offer.created',
      'pharma.offer.updated',
      'pharma.order.created',
      'pharma.order.confirmed',
      'pharma.order.shipped',
      'pharma.order.delivered',
      'pharma.order.cancelled',
      'pharma.settlement.created',
      'pharma.settlement.closed',
      'pharma.settlement.paid',
    ],
  },
};

export default pharmaceuticalCoreManifest;
