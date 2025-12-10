/**
 * Dropshipping-Core Manifest
 *
 * Industry-neutral extensible dropshipping engine:
 * - Supplier/Seller management
 * - Product catalog (Master, Offers, Listings)
 * - Order relay workflow
 * - Settlement and commission
 */

export const dropshippingCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'dropshipping-core',
  displayName: 'Dropshipping 엔진',
  version: '1.0.0',
  appType: 'core' as const,
  description: '산업 중립적 확장형 Dropshipping 엔진 - Supplier/Seller/Product/Order/Settlement/Commission',

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
