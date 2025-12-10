/**
 * Cosmetics Seller Extension Manifest
 *
 * 화장품 매장 판매원(Seller) 운영 기능 Extension App
 * - 진열 관리 (Display)
 * - 샘플 관리 (Sample)
 * - 매장 재고 관리 (Inventory)
 * - 상담 로그 (Consultation Log)
 * - 판매원 KPI (Seller KPI)
 */

export const cosmeticsSellerExtensionManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'cosmetics-seller-extension',
  displayName: '화장품 판매원 관리',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '화장품 매장 판매원 운영 기능 - 진열, 샘플, 재고, 상담, KPI 관리',

  // Extension configuration
  extendsApp: 'dropshipping-cosmetics',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core', 'dropshipping-cosmetics'],
    optional: [],
  },

  // Custom Post Types owned by this extension
  cpt: [
    {
      name: 'seller_display',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Seller Display',
      supports: ['metadata'],
    },
    {
      name: 'seller_sample',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Seller Sample',
      supports: ['metadata'],
    },
    {
      name: 'seller_inventory',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Seller Inventory',
      supports: ['metadata'],
    },
    {
      name: 'seller_consultation_log',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Seller Consultation Log',
      supports: ['metadata'],
    },
    {
      name: 'seller_kpi',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Seller KPI',
      supports: ['metadata'],
    },
  ],

  // ACF field groups
  acf: [
    {
      groupId: 'seller_display_metadata',
      label: 'Display Information',
      appliesTo: 'seller_display',
      fields: [
        {
          key: 'location',
          label: 'Display Location',
          type: 'select',
          required: true,
          choices: {
            entrance: '입구',
            counter: '카운터',
            shelf_a: '진열대 A',
            shelf_b: '진열대 B',
            window: '쇼윈도',
            promotion: '프로모션 존',
          },
        },
        {
          key: 'faceCount',
          label: 'Face Count',
          type: 'number',
          required: true,
          instructions: '진열 페이스 수',
        },
        {
          key: 'facingQuality',
          label: 'Facing Quality',
          type: 'select',
          required: false,
          choices: {
            excellent: '우수',
            good: '양호',
            average: '보통',
            poor: '미흡',
          },
        },
      ],
    },
    {
      groupId: 'seller_sample_metadata',
      label: 'Sample Information',
      appliesTo: 'seller_sample',
      fields: [
        {
          key: 'sampleCount',
          label: 'Sample Count',
          type: 'number',
          required: true,
        },
        {
          key: 'usageType',
          label: 'Usage Type',
          type: 'select',
          required: false,
          choices: {
            demo: '데모용',
            giveaway: '증정용',
            tester: '테스터',
          },
        },
      ],
    },
    {
      groupId: 'seller_kpi_metadata',
      label: 'KPI Metrics',
      appliesTo: 'seller_kpi',
      fields: [
        {
          key: 'consultations',
          label: 'Consultation Count',
          type: 'number',
          required: true,
        },
        {
          key: 'conversions',
          label: 'Conversion Count',
          type: 'number',
          required: true,
        },
        {
          key: 'sampleToPurchaseRate',
          label: 'Sample to Purchase Rate',
          type: 'number',
          required: false,
        },
        {
          key: 'totalSales',
          label: 'Total Sales',
          type: 'number',
          required: false,
        },
      ],
    },
  ],

  // Routes
  routes: [
    '/api/v1/cosmetics-seller',
    '/api/v1/cosmetics-seller/*',
  ],

  // Permissions
  permissions: [
    'cosmetics-seller:view',
    'cosmetics-seller:manage_displays',
    'cosmetics-seller:manage_samples',
    'cosmetics-seller:manage_inventory',
    'cosmetics-seller:view_consultations',
    'cosmetics-seller:view_kpi',
    'cosmetics-seller:admin',
  ],

  // Shortcodes
  shortcodes: [
    {
      name: 'cosmetics-seller-dashboard',
      component: './frontend/shortcodes/seller-dashboard.js',
      description: 'Seller Dashboard overview',
      usage: '[cosmetics-seller-dashboard]',
      attributes: {},
    },
    {
      name: 'cosmetics-seller-displays',
      component: './frontend/shortcodes/seller-displays.js',
      description: 'Display management view',
      usage: '[cosmetics-seller-displays]',
      attributes: {},
    },
    {
      name: 'cosmetics-seller-samples',
      component: './frontend/shortcodes/seller-samples.js',
      description: 'Sample management view',
      usage: '[cosmetics-seller-samples]',
      attributes: {},
    },
    {
      name: 'cosmetics-seller-inventory',
      component: './frontend/shortcodes/seller-inventory.js',
      description: 'Inventory management view',
      usage: '[cosmetics-seller-inventory]',
      attributes: {},
    },
    {
      name: 'cosmetics-seller-consultations',
      component: './frontend/shortcodes/seller-consultations.js',
      description: 'Consultation logs view',
      usage: '[cosmetics-seller-consultations]',
      attributes: {},
    },
    {
      name: 'cosmetics-seller-kpi',
      component: './frontend/shortcodes/seller-kpi.js',
      description: 'Seller KPI dashboard',
      usage: '[cosmetics-seller-kpi]',
      attributes: {},
    },
  ],

  // Menu Configuration (표준 형식)
  menus: {
    admin: [
      { label: 'Seller Dashboard', path: '/cosmetics-seller/dashboard', icon: 'LayoutDashboard' },
      { label: 'Displays', path: '/cosmetics-seller/displays', icon: 'Monitor' },
      { label: 'Samples', path: '/cosmetics-seller/samples', icon: 'Gift' },
      { label: 'Store Inventory', path: '/cosmetics-seller/inventory', icon: 'Package' },
      { label: 'Consultations', path: '/cosmetics-seller/consultations', icon: 'MessageSquare' },
      { label: 'Seller KPI', path: '/cosmetics-seller/kpi', icon: 'TrendingUp' },
    ],
    member: [],
  },

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  /**
   * Backend Configuration
   */
  backend: {
    entities: [
      'SellerDisplayEntity',
      'SellerSampleEntity',
      'SellerInventoryEntity',
      'SellerConsultationLogEntity',
      'SellerKpiEntity',
    ],
    services: ['CosmeticsSellerService'],
    controllers: ['CosmeticsSellerController'],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: ['CosmeticsSellerService'],
    types: [
      'SellerDisplayDto',
      'SellerSampleDto',
      'SellerInventoryDto',
      'SellerConsultationLogDto',
      'SellerKpiDto',
    ],
    events: [],
  },
};

// Named export for convenience
export { cosmeticsSellerExtensionManifest as manifest };

export default cosmeticsSellerExtensionManifest;
