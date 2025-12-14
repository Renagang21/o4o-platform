/**
 * Market Trial Manifest
 *
 * Extension app for supplier product trial funding.
 * Depends on dropshipping-core for Supplier/Seller/Product infrastructure.
 */

export const marketTrialManifest = {
  // ===== Basic Info =====
  appId: 'market-trial',
  displayName: 'Market Trial',
  version: '1.0.0',
  appType: 'extension' as const,
  description: 'Supplier product trial funding with seller/partner participation',

  // ===== Dependencies =====
  dependencies: {
    core: ['dropshipping-core'],
    optional: ['forum-core'],
  },

  // ===== Owned Tables =====
  ownsTables: [
    'market_trials',
    'market_trial_participants',
    'market_trial_forums',
  ],

  // ===== Uninstall Policy =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== Backend =====
  backend: {
    entities: [
      'MarketTrial',
      'MarketTrialParticipant',
      'MarketTrialForum',
    ],
    services: [],  // Phase 2
    controllers: [], // Phase 2
    routesExport: 'createRoutes',
  },

  // ===== Frontend =====
  frontend: {
    admin: {
      pages: [],  // Phase 3+
    },
  },

  // ===== Lifecycle =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== Permissions =====
  permissions: [
    {
      id: 'market-trial.read',
      name: 'Market Trial 읽기',
      description: 'Market Trial 데이터 조회 권한',
      category: 'market-trial',
    },
    {
      id: 'market-trial.write',
      name: 'Market Trial 쓰기',
      description: 'Market Trial 생성/수정 권한',
      category: 'market-trial',
    },
    {
      id: 'market-trial.manage',
      name: 'Market Trial 관리',
      description: 'Market Trial 전체 관리 권한',
      category: 'market-trial',
    },
  ],

  // ===== Menus =====
  menus: {
    admin: [],  // Phase 3+
  },

  // ===== Exposes =====
  exposes: {
    services: [],  // Phase 2
    types: ['MarketTrial', 'MarketTrialParticipant', 'MarketTrialForum'],
    events: [],  // Future
  },

  // ===== Default Config =====
  defaultConfig: {
    minFundingPeriodDays: 7,
    maxFundingPeriodDays: 30,
    minTrialPeriodDays: 14,
    maxTrialPeriodDays: 90,
  },
};

// Legacy export for backward compatibility
export const manifest = marketTrialManifest;
export default marketTrialManifest;
