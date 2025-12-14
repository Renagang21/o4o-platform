/**
 * LMS-Marketing Extension Manifest
 *
 * Marketing LMS Extension App
 * - Product info delivery to sellers/consumers
 * - Marketing quiz/survey campaigns
 * - Engagement capture and analytics
 *
 * Uses LMS-Core (ContentBundle, Quiz, Survey, EngagementLog)
 * Independent from Yaksa LMS
 */

export const lmsMarketingManifest = {
  // ===== Basic Info =====
  appId: 'lms-marketing',
  displayName: 'Marketing LMS Extension',
  name: 'LMS Marketing',
  version: '0.3.0',
  type: 'extension' as const,
  appType: 'extension' as const,
  category: 'marketing' as const,
  description:
    'Product info delivery + marketing quiz/survey + engagement capture for suppliers',

  // ===== Dependencies =====
  dependencies: {
    core: ['lms-core'],
    extensions: [],
  },

  // ===== Owned Tables =====
  // Phase R6: ProductContent table for product info delivery
  // Phase R7: QuizCampaign table for quiz campaigns
  ownsTables: ['lms_marketing_product_contents', 'lms_marketing_quiz_campaigns'] as string[],

  // ===== Uninstall Policy =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== Backend =====
  backend: {
    entities: ['ProductContent', 'MarketingQuizCampaign'],
    services: ['ProductContentService', 'MarketingQuizCampaignService'],
    controllers: ['ProductContentController', 'MarketingQuizCampaignController'],
    routesExport: 'createRoutes',
    servicesExport: 'createServices',
    hooksExport: 'createHooks',
    migrationsPath: './migrations',
  },

  // ===== Frontend =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/marketing', component: 'MarketingDashboard' },
        { path: '/admin/marketing/campaigns', component: 'CampaignList' },
        { path: '/admin/marketing/campaigns/:id', component: 'CampaignDetail' },
        { path: '/admin/marketing/product-info', component: 'ProductInfoList' },
      ],
    },
    supplier: {
      pages: [
        { path: '/supplier/marketing', component: 'SupplierMarketingDashboard' },
        { path: '/supplier/marketing/campaigns', component: 'SupplierCampaigns' },
        { path: '/supplier/marketing/analytics', component: 'EngagementAnalytics' },
      ],
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
      id: 'marketing.read',
      name: 'Marketing 읽기',
      description: '마케팅 캠페인 조회 권한',
      category: 'marketing',
    },
    {
      id: 'marketing.write',
      name: 'Marketing 쓰기',
      description: '마케팅 캠페인 생성/수정 권한',
      category: 'marketing',
    },
    {
      id: 'marketing.manage',
      name: 'Marketing 관리',
      description: '마케팅 전체 관리 권한',
      category: 'marketing',
    },
    {
      id: 'marketing.analytics',
      name: 'Marketing 분석',
      description: 'Engagement 분석 및 리포트 권한',
      category: 'marketing',
    },
  ],

  // ===== Menus =====
  menus: {
    admin: [
      {
        id: 'marketing',
        label: '마케팅',
        icon: 'megaphone',
        order: 50,
        children: [
          {
            id: 'marketing-dashboard',
            label: '대시보드',
            path: '/admin/marketing',
            icon: 'layout-dashboard',
          },
          {
            id: 'marketing-campaigns',
            label: '캠페인 관리',
            path: '/admin/marketing/campaigns',
            icon: 'target',
          },
          {
            id: 'marketing-product-info',
            label: '제품 정보',
            path: '/admin/marketing/product-info',
            icon: 'package',
          },
        ],
      },
    ],
    supplier: [
      {
        id: 'supplier-marketing',
        label: '마케팅',
        icon: 'megaphone',
        order: 20,
        children: [
          {
            id: 'supplier-marketing-dashboard',
            label: '대시보드',
            path: '/supplier/marketing',
            icon: 'layout-dashboard',
          },
          {
            id: 'supplier-campaigns',
            label: '내 캠페인',
            path: '/supplier/marketing/campaigns',
            icon: 'target',
          },
          {
            id: 'supplier-analytics',
            label: '분석',
            path: '/supplier/marketing/analytics',
            icon: 'bar-chart',
          },
        ],
      },
    ],
  },

  // ===== Exposes =====
  exposes: {
    entities: ['ProductContent', 'MarketingQuizCampaign'],
    services: ['ProductContentService', 'MarketingQuizCampaignService'],
    controllers: ['ProductContentController', 'MarketingQuizCampaignController'],
    types: [
      'ProductContent',
      'ProductContentTargeting',
      'TargetAudience',
      'MarketingQuizCampaign',
      'QuizQuestion',
      'QuizOption',
      'QuizCampaignTargeting',
      'QuizReward',
      'CampaignStatus',
    ],
    hooks: [
      'publishProductInfo',
      'getProductContentsForUser',
      'createQuizCampaign',
      'getQuizCampaignsForUser',
      'createSurveyCampaign',
      'getCampaignAnalytics',
    ],
    events: [
      'product-content.created',
      'product-content.published',
      'product-content.deactivated',
      'quiz-campaign.created',
      'quiz-campaign.published',
      'quiz-campaign.completed',
      'quiz-campaign.attempt-recorded',
      'campaign.created',
      'campaign.published',
      'campaign.completed',
      'engagement.campaign-view',
      'engagement.campaign-complete',
    ],
  },

  // ===== Default Config =====
  defaultConfig: {
    enableQuizCampaigns: true,
    enableSurveyCampaigns: true,
    enableProductInfo: true,
    defaultCampaignDuration: 30, // days
    maxConcurrentCampaigns: 10,
  },
};

// Legacy exports
export const manifest = lmsMarketingManifest;
export default lmsMarketingManifest;
