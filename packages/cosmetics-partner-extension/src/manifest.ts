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

  // ACF field groups
  acf: [
    {
      groupId: 'partner_profile_metadata',
      label: 'Partner Profile Information',
      appliesTo: 'partner_profile',
      fields: [
        {
          key: 'referralCode',
          label: 'Referral Code',
          type: 'text',
          required: true,
          instructions: '파트너 고유 추천 코드',
        },
        {
          key: 'partnerType',
          label: 'Partner Type',
          type: 'select',
          required: true,
          choices: {
            influencer: '인플루언서',
            store_partner: '매장 파트너',
            affiliate: '제휴 파트너',
            reseller: '리셀러',
          },
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          choices: {
            pending: '승인 대기',
            active: '활성',
            suspended: '정지',
            inactive: '비활성',
          },
        },
      ],
    },
    {
      groupId: 'partner_link_metadata',
      label: 'Partner Link Information',
      appliesTo: 'partner_link',
      fields: [
        {
          key: 'linkType',
          label: 'Link Type',
          type: 'select',
          required: true,
          choices: {
            product: '상품 링크',
            campaign: '캠페인 링크',
            routine: '루틴 링크',
            brand: '브랜드 링크',
          },
        },
        {
          key: 'commissionRate',
          label: 'Commission Rate (%)',
          type: 'number',
          required: false,
          instructions: '커미션 비율 (기본값 사용 시 비워두기)',
        },
      ],
    },
    {
      groupId: 'partner_routine_metadata',
      label: 'Partner Routine Information',
      appliesTo: 'partner_routine',
      fields: [
        {
          key: 'routineType',
          label: 'Routine Type',
          type: 'select',
          required: true,
          choices: {
            morning: '모닝 루틴',
            evening: '이브닝 루틴',
            weekly: '주간 케어',
            special: '스페셜 케어',
          },
        },
        {
          key: 'visibility',
          label: 'Visibility',
          type: 'select',
          required: true,
          choices: {
            public: '공개',
            followers: '팔로워 전용',
            private: '비공개',
          },
        },
      ],
    },
    {
      groupId: 'partner_earnings_metadata',
      label: 'Partner Earnings Information',
      appliesTo: 'partner_earnings',
      fields: [
        {
          key: 'earningsType',
          label: 'Earnings Type',
          type: 'select',
          required: true,
          choices: {
            commission: '판매 커미션',
            bonus: '보너스',
            referral: '추천 보상',
            campaign: '캠페인 보상',
          },
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          choices: {
            pending: '정산 대기',
            available: '출금 가능',
            withdrawn: '출금 완료',
            cancelled: '취소',
          },
        },
      ],
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

  // Shortcodes
  shortcodes: [
    {
      name: 'cosmetics-partner-dashboard',
      component: './frontend/shortcodes/partner-dashboard.js',
      description: 'Partner Dashboard overview',
      usage: '[cosmetics-partner-dashboard]',
      attributes: {},
    },
    {
      name: 'cosmetics-partner-links',
      component: './frontend/shortcodes/partner-links.js',
      description: 'Partner links management view',
      usage: '[cosmetics-partner-links]',
      attributes: {},
    },
    {
      name: 'cosmetics-partner-routines',
      component: './frontend/shortcodes/partner-routines.js',
      description: 'Partner routines management view',
      usage: '[cosmetics-partner-routines]',
      attributes: {},
    },
    {
      name: 'cosmetics-partner-earnings',
      component: './frontend/shortcodes/partner-earnings.js',
      description: 'Partner earnings dashboard',
      usage: '[cosmetics-partner-earnings]',
      attributes: {},
    },
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
