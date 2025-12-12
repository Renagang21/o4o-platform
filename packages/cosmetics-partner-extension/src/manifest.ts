/**
 * Cosmetics Partner Extension Manifest
 *
 * 화장품 파트너/인플루언서 무재고 판매 기능 Extension App
 * - Partner Profile (파트너 프로필)
 * - Partner Links (추천 링크)
 * - Partner Routines (루틴 기반 추천)
 * - Partner Earnings (수익 관리)
 */

export const cosmeticsPartnerExtensionManifest = {
  // ===== 필수 기본 정보 =====
  id: 'cosmetics-partner-extension',  // ModuleLoader compatibility
  appId: 'cosmetics-partner-extension',
  displayName: '화장품 파트너 관리',
  name: 'Cosmetics Partner Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const, // Legacy compatibility
  category: 'commerce' as const,
  description: '파트너/인플루언서의 무재고 판매, 캠페인 참여, 루틴 기반 추천 기능 제공',

  // Extension configuration
  extendsApp: 'dropshipping-cosmetics',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core', 'dropshipping-cosmetics'],
    apps: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'cosmetics_partner_profiles',
    'cosmetics_partner_links',
    'cosmetics_partner_routines',
    'cosmetics_partner_earnings',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // Custom Post Types owned by this extension
  cpt: [
    {
      name: 'partner_profile',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Partner Profile',
      supports: ['metadata'],
    },
    {
      name: 'partner_link',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Partner Link',
      supports: ['metadata'],
    },
    {
      name: 'partner_routine',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Partner Routine',
      supports: ['metadata'],
    },
    {
      name: 'partner_earnings',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Partner Earnings',
      supports: ['metadata'],
    },
  ],

  // Routes
  routes: [
    '/api/v1/cosmetics-partner',
    '/api/v1/cosmetics-partner/*',
  ],

  // Permissions
  permissions: [
    'cosmetics-partner:view',
    'cosmetics-partner:manage_profile',
    'cosmetics-partner:manage_links',
    'cosmetics-partner:manage_routines',
    'cosmetics-partner:view_earnings',
    'cosmetics-partner:withdraw',
    'cosmetics-partner:admin',
  ],

  // Menu Configuration (표준 형식)
  menus: {
    admin: [
      { label: 'Partner Dashboard', path: '/cosmetics-partner/dashboard', icon: 'LayoutDashboard' },
      { label: 'My Links', path: '/cosmetics-partner/links', icon: 'Link' },
      { label: 'My Routines', path: '/cosmetics-partner/routines', icon: 'Sparkles' },
      { label: 'Earnings', path: '/cosmetics-partner/earnings', icon: 'Wallet' },
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
      './backend/entities/partner-profile.entity',
      './backend/entities/partner-link.entity',
      './backend/entities/partner-routine.entity',
      './backend/entities/partner-earnings.entity',
    ],
    services: ['CosmeticsPartnerService'],
    controllers: ['CosmeticsPartnerController'],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: ['CosmeticsPartnerService'],
    types: [
      'PartnerProfileDto',
      'PartnerLinkDto',
      'PartnerRoutineDto',
      'PartnerEarningsDto',
    ],
    events: [],
  },
};

// Named export for convenience
export { cosmeticsPartnerExtensionManifest as manifest };

export default cosmeticsPartnerExtensionManifest;
