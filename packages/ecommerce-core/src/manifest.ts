/**
 * E-commerce Core Manifest
 *
 * 판매 원장(Source of Truth)으로서의 E-commerce 엔진:
 * - 주문 관리 (Order, OrderItem)
 * - 결제 관리 (Payment)
 * - 판매 유형 분류 (retail, dropshipping, b2b, subscription)
 *
 * Dropshipping Core, Retail Core 등 하위 시스템은
 * E-commerce Order를 참조하여 각자의 비즈니스 로직을 처리합니다.
 */

export const ecommerceCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'ecommerce-core',
  displayName: 'E-commerce 엔진',
  version: '1.0.0',
  appType: 'core' as const,
  description: '판매 원장(Source of Truth) - 주문/결제/판매유형 통합 관리',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    optional: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'ecommerce_orders',
    'ecommerce_order_items',
    'ecommerce_payments',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: false, // 원장 데이터 삭제 금지
    autoBackup: true,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      'EcommerceOrder',
      'EcommerceOrderItem',
      'EcommercePayment',
    ],
    services: [
      'EcommerceOrderService',
      'EcommercePaymentService',
    ],
    controllers: [
      'EcommerceOrderController',
      'EcommercePaymentController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/ecommerce', component: 'EcommerceDashboard' },
        { path: '/admin/ecommerce/orders', component: 'OrderList' },
        { path: '/admin/ecommerce/orders/:id', component: 'OrderDetail' },
        { path: '/admin/ecommerce/payments', component: 'PaymentList' },
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
      id: 'ecommerce.read',
      name: 'E-commerce 읽기',
      description: 'E-commerce 데이터 조회 권한',
      category: 'ecommerce',
    },
    {
      id: 'ecommerce.write',
      name: 'E-commerce 쓰기',
      description: 'E-commerce 데이터 생성/수정 권한',
      category: 'ecommerce',
    },
    {
      id: 'ecommerce.manage',
      name: 'E-commerce 관리',
      description: 'E-commerce 전체 관리 권한',
      category: 'ecommerce',
    },
    {
      id: 'ecommerce.admin',
      name: 'E-commerce 관리자',
      description: '환불 처리 등 관리자 권한',
      category: 'ecommerce',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'ecommerce',
        label: 'E-commerce',
        icon: 'shopping-bag',
        order: 20,
        children: [
          {
            id: 'ecommerce-dashboard',
            label: '대시보드',
            path: '/admin/ecommerce',
            icon: 'layout-dashboard',
          },
          {
            id: 'ecommerce-orders',
            label: '주문 관리',
            path: '/admin/ecommerce/orders',
            icon: 'receipt',
          },
          {
            id: 'ecommerce-payments',
            label: '결제 관리',
            path: '/admin/ecommerce/payments',
            icon: 'credit-card',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['EcommerceOrderService', 'EcommercePaymentService'],
    types: ['EcommerceOrder', 'EcommerceOrderItem', 'EcommercePayment', 'OrderType', 'OrderStatus', 'PaymentStatus'],
    events: [
      'order.created',
      'order.confirmed',
      'order.cancelled',
      'order.completed',
      'payment.pending',
      'payment.completed',
      'payment.failed',
      'payment.refunded',
    ],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    defaultCurrency: 'KRW',
    autoConfirmPayment: false,
    orderNumberPrefix: 'ORD',
    paymentTimeout: 30, // 분
  },
};

// Legacy export for backward compatibility
export const manifest = ecommerceCoreManifest;
export default ecommerceCoreManifest;
