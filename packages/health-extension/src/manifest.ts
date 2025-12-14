/**
 * Health Extension Manifest
 * 건강기능식품/건강제품 산업군 확장 앱
 * @package @o4o/health-extension
 */

export const healthExtensionManifest = {
  id: 'health-extension',
  appId: 'health-extension',
  displayName: '건강기능식품',
  name: 'Health Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const,
  category: 'commerce' as const,
  description: '건강기능식품/건강보조제 전용 확장 - 영양정보, 기능성, 섭취방법 관리',

  dependencies: { core: ['dropshipping-core'], apps: [] },
  productType: 'HEALTH',
  extendsCPT: ['ds_product'],
  cpt: [],
  routes: ['/api/v1/health', '/api/v1/health/*'],
  permissions: ['health:view', 'health:edit', 'health:manage'],
  ownsTables: [],

  uninstallPolicy: { defaultMode: 'keep-data' as const, allowPurge: true, autoBackup: false },

  backend: {
    entities: [],
    services: ['HealthProductService', 'HealthOfferService', 'HealthOrderService', 'HealthSettlementService'],
    controllers: [],
    routesExport: 'createRoutes',
  },

  frontend: {
    admin: {
      pages: [
        { path: '/health/products', component: 'HealthProductListPage' },
        { path: '/health/offers', component: 'HealthOfferListPage' },
        { path: '/health/orders', component: 'HealthOrderListPage' },
        { path: '/health/settlement', component: 'HealthSettlementListPage' },
      ],
    },
  },

  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  menus: {
    admin: [{
      id: 'health', label: '건강식품', icon: 'heart-pulse', order: 40, parent: 'dropshipping',
      children: [
        { id: 'health-products', label: '제품 목록', path: '/health/products', icon: 'package' },
        { id: 'health-offers', label: 'Offer 관리', path: '/health/offers', icon: 'tag' },
        { id: 'health-orders', label: '주문 관리', path: '/health/orders', icon: 'shopping-cart' },
        { id: 'health-settlement', label: '정산 내역', path: '/health/settlement', icon: 'receipt' },
      ],
    }],
  },

  exposes: {
    services: ['HealthProductService', 'HealthOfferService'],
    types: ['HealthMetadata', 'NutritionInfo'],
    events: ['health.offer.created', 'health.order.created'],
  },

  config: {
    productTypeFilter: ['HEALTH'],
    excludeProductTypes: ['PHARMACEUTICAL'],
    enableListing: true,
    expirationWarningDays: 90,
  },
};

export const manifest = healthExtensionManifest;
export default healthExtensionManifest;
