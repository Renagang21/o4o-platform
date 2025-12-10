/**
 * Cosmetics-Store Service App Manifest
 *
 * 화장품 쇼핑몰 서비스 앱
 *
 * - 상품 카탈로그
 * - 장바구니/주문
 * - 결제 연동
 * - 배송 추적
 */

export const cosmeticsStoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'cosmetics-store',
  displayName: '화장품 쇼핑몰',
  version: '1.0.0',
  appType: 'service' as const,
  description: '화장품 전문 쇼핑몰 서비스 (상품 카탈로그, 주문, 결제, 배송)',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    optional: ['dropshipping-cosmetics'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'cosmetics_store_settings',     // 쇼핑몰 설정
    'cosmetics_store_categories',   // 상품 카테고리
    'cosmetics_store_banners',      // 배너/프로모션
    'cosmetics_store_carts',        // 장바구니
    'cosmetics_store_orders',       // 주문
    'cosmetics_store_order_items',  // 주문 상품
    'cosmetics_store_payments',     // 결제
    'cosmetics_store_shipments',    // 배송
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
      'StoreSettings',
      'StoreCategory',
      'StoreBanner',
      'Cart',
      'Order',
      'OrderItem',
      'Payment',
      'Shipment',
    ],
    services: [
      'CatalogService',
      'CartService',
      'OrderService',
      'PaymentService',
      'ShipmentService',
    ],
    controllers: [
      'CatalogController',
      'CartController',
      'OrderController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/store', component: 'StoreDashboard' },
        { path: '/admin/store/orders', component: 'OrderList' },
        { path: '/admin/store/orders/:id', component: 'OrderDetail' },
        { path: '/admin/store/settings', component: 'StoreSettings' },
      ],
    },
    public: {
      pages: [
        { path: '/store', component: 'StoreFront' },
        { path: '/store/products', component: 'ProductList' },
        { path: '/store/products/:id', component: 'ProductDetail' },
        { path: '/store/cart', component: 'CartPage' },
        { path: '/store/checkout', component: 'CheckoutPage' },
        { path: '/store/orders', component: 'MyOrders' },
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
      id: 'store.admin.read',
      name: '쇼핑몰 관리 조회',
      description: '쇼핑몰 관리 화면을 조회할 수 있는 권한',
      category: 'store',
    },
    {
      id: 'store.admin.manage',
      name: '쇼핑몰 관리',
      description: '쇼핑몰 설정 및 상품을 관리할 수 있는 권한',
      category: 'store',
    },
    {
      id: 'store.order.read',
      name: '주문 조회',
      description: '주문을 조회할 수 있는 권한',
      category: 'store',
    },
    {
      id: 'store.order.manage',
      name: '주문 관리',
      description: '주문을 처리하고 관리할 수 있는 권한',
      category: 'store',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'store',
        label: '쇼핑몰',
        icon: 'shopping-bag',
        order: 20,
        children: [
          {
            id: 'store-dashboard',
            label: '대시보드',
            path: '/admin/store',
            icon: 'chart-bar',
          },
          {
            id: 'store-orders',
            label: '주문 관리',
            path: '/admin/store/orders',
            icon: 'clipboard-list',
            permission: 'store.order.manage',
          },
          {
            id: 'store-settings',
            label: '쇼핑몰 설정',
            path: '/admin/store/settings',
            icon: 'cog',
            permission: 'store.admin.manage',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['CartService', 'OrderService'],
    types: ['Order', 'OrderItem', 'Cart', 'Payment'],
    events: ['order.created', 'order.paid', 'order.shipped', 'order.completed'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    // 결제 방식
    paymentMethods: ['card', 'bank_transfer', 'virtual_account'],

    // 배송비 정책
    freeShippingThreshold: 50000,
    defaultShippingFee: 3000,

    // 환불 정책
    refundPeriodDays: 7,

    // 재고 관리
    trackInventory: true,
  },
};

export default cosmeticsStoreManifest;
