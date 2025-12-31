/**
 * Dropshipping-Core Manifest
 *
 * Industry-neutral S2S (Supplier-to-Seller) Engine
 *
 * ## S2S 해석 가이드
 *
 * 본 Core는 "Dropshipping"이라는 이름을 사용하지만, 실제로는 산업 중립적인
 * S2S(Supplier-to-Seller) 구조를 제공합니다.
 *
 * ### 핵심 개념
 * - **Supplier (공급자)**: Product Master의 소유자. 상품 정보, 가격, 재고의 원천.
 * - **Seller (판매자)**: Supplier의 Offer를 기반으로 자신의 채널에 Listing을 생성.
 * - **Product Master**: Supplier가 소유하는 상품 원본 정보 (Source of Truth)
 * - **Offer**: Supplier가 Seller에게 제시하는 공급 조건 (가격, 재고, 배송 등)
 * - **Listing**: Seller가 자신의 채널에 등록한 판매 상품 (Offer 기반)
 *
 * ### S2S 흐름
 * 1. Supplier가 Product Master 생성 (상품 원본)
 * 2. Supplier가 Offer 생성 (판매자에게 제시하는 조건)
 * 3. Seller가 Offer 선택 후 Listing 생성 (자신의 채널에 등록)
 * 4. 주문 발생 시 Order Relay를 통해 Supplier에게 전달
 * 5. 정산은 Settlement/Commission 시스템을 통해 처리
 *
 * ### 비고
 * - "즉시 판매", "B2C 전제", "플랫폼 중재" 개념은 본 Core의 책임이 아님
 * - 각 서비스(Cosmetics, Pharmaceutical, Yaksa 등)는 Extension/Core를 통해 특수성 구현
 * - 본 Core는 S2S 관계 관리에만 집중하며, 비즈니스 정책 판단은 하지 않음
 */

export const dropshippingCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'dropshipping-core',
  displayName: 'S2S 엔진',
  version: '1.0.0',
  appType: 'core' as const,
  description: '산업 중립적 S2S(Supplier-to-Seller) 엔진 - 공급자/판매자 관계, 상품/Offer/Listing, 주문 릴레이, 정산',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    optional: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'dropshipping_suppliers',
    'dropshipping_sellers',
    'dropshipping_product_masters',
    'dropshipping_supplier_product_offers',
    'dropshipping_seller_listings',
    'dropshipping_order_relays',
    'dropshipping_settlement_batches',
    'dropshipping_commission_rules',
    'dropshipping_commission_transactions',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      'Supplier',
      'Seller',
      'ProductMaster',
      'SupplierProductOffer',
      'SellerListing',
      'OrderRelay',
      'SettlementBatch',
      'CommissionRule',
      'CommissionTransaction',
    ],
    services: [
      'SupplierService',
      'SellerService',
      'ProductService',
      'OrderRelayService',
      'SettlementService',
      'CommissionService',
    ],
    controllers: [
      'SupplierController',
      'SellerController',
      'ProductController',
      'OrderController',
      'SettlementController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/dropshipping', component: 'DropshippingDashboard' },
        { path: '/admin/dropshipping/suppliers', component: 'SupplierList' },
        { path: '/admin/dropshipping/sellers', component: 'SellerList' },
        { path: '/admin/dropshipping/products', component: 'ProductList' },
        { path: '/admin/dropshipping/orders', component: 'OrderList' },
        { path: '/admin/dropshipping/settlement', component: 'SettlementList' },
        { path: '/admin/dropshipping/commission', component: 'CommissionSettings' },
      ],
    },
  },

  // ===== 라이프사이클 =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== 권한 정의 =====
  permissions: [
    {
      id: 'dropshipping.read',
      name: 'Dropshipping 읽기',
      description: 'Dropshipping 데이터 조회 권한',
      category: 'dropshipping',
    },
    {
      id: 'dropshipping.write',
      name: 'Dropshipping 쓰기',
      description: 'Dropshipping 데이터 생성/수정 권한',
      category: 'dropshipping',
    },
    {
      id: 'dropshipping.manage',
      name: 'Dropshipping 관리',
      description: 'Dropshipping 전체 관리 권한',
      category: 'dropshipping',
    },
    {
      id: 'dropshipping.supplier',
      name: '공급사 역할',
      description: '공급사로서의 권한',
      category: 'dropshipping',
    },
    {
      id: 'dropshipping.seller',
      name: '판매자 역할',
      description: '판매자로서의 권한',
      category: 'dropshipping',
    },
    {
      id: 'dropshipping.admin',
      name: 'Dropshipping 관리자',
      description: '정산/수수료 설정 등 관리자 권한',
      category: 'dropshipping',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'dropshipping',
        label: 'Dropshipping',
        icon: 'truck',
        order: 30,
        children: [
          {
            id: 'dropshipping-dashboard',
            label: '대시보드',
            path: '/admin/dropshipping',
            icon: 'layout-dashboard',
          },
          {
            id: 'dropshipping-suppliers',
            label: '공급사 관리',
            path: '/admin/dropshipping/suppliers',
            icon: 'building',
          },
          {
            id: 'dropshipping-sellers',
            label: '판매자 관리',
            path: '/admin/dropshipping/sellers',
            icon: 'store',
          },
          {
            id: 'dropshipping-products',
            label: '상품 관리',
            path: '/admin/dropshipping/products',
            icon: 'package',
          },
          {
            id: 'dropshipping-orders',
            label: '주문 관리',
            path: '/admin/dropshipping/orders',
            icon: 'shopping-cart',
          },
          {
            id: 'dropshipping-settlement',
            label: '정산',
            path: '/admin/dropshipping/settlement',
            icon: 'calculator',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['SupplierService', 'SellerService', 'ProductService', 'OrderRelayService', 'SettlementService', 'CommissionService'],
    types: ['Supplier', 'Seller', 'ProductMaster', 'SupplierProductOffer', 'SellerListing', 'OrderRelay'],
    events: [
      'product.master.updated',
      'product.offer.updated',
      'listing.created',
      'order.created',
      'order.relay.dispatched',
      'order.relay.fulfilled',
      'settlement.closed',
      'commission.applied',
    ],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    enableAutoRelayToSupplier: true,
    defaultCommissionRate: 10,
    settlementCycle: 'monthly',
    requireSellerApproval: true,
    requireSupplierApproval: true,
  },
};

// Legacy export for backward compatibility
export const manifest = dropshippingCoreManifest;
export default dropshippingCoreManifest;
