/**
 * Dropshipping Cosmetics Extension Manifest
 *
 * This extension adds cosmetics-specific metadata and features to the Dropshipping Core app.
 * It extends the core dropshipping functionality with cosmetics-focused features like:
 * - Skin type matching
 * - Ingredient information
 * - Routine recommendations
 * - Product certifications
 */

export const cosmeticsExtensionManifest = {
  // ===== 필수 기본 정보 =====
  id: 'dropshipping-cosmetics', // ModuleLoader compatibility
  appId: 'dropshipping-cosmetics',
  displayName: '화장품 Dropshipping',
  name: 'Dropshipping Cosmetics Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const, // Legacy compatibility
  category: 'commerce' as const,
  description: 'Cosmetics-specific features for dropshipping platform',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core'],
    apps: [],
  },

  // Extend existing CPTs with cosmetics metadata
  extendsCPT: ['ds_product'],

  // Custom Post Types owned by this extension
  // cosmetics_influencer_routine CPT REMOVED (Phase 7-Y) - PartnerRoutine is canonical
  cpt: [],

  // ACF field groups for cosmetics metadata
  acf: [
    {
      groupId: 'cosmetics_metadata',
      label: 'Cosmetics Information',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'skinType',
          label: 'Skin Type',
          type: 'multiselect',
          required: false,
          choices: {
            dry: '건성',
            oily: '지성',
            combination: '복합성',
            sensitive: '민감성',
            normal: '중성',
          },
          instructions: '이 제품에 적합한 피부타입을 선택하세요 (복수 선택 가능)',
        },
        {
          key: 'concerns',
          label: 'Skin Concerns',
          type: 'multiselect',
          required: false,
          choices: {
            acne: '여드름',
            whitening: '미백',
            wrinkle: '주름개선',
            pore: '모공',
            soothing: '진정',
            moisturizing: '보습',
            elasticity: '탄력',
            trouble: '트러블케어',
          },
          instructions: '이 제품이 해결하는 피부 고민을 선택하세요',
        },
        {
          key: 'ingredients',
          label: 'Key Ingredients',
          type: 'array',
          required: false,
          subFields: [
            {
              key: 'name',
              label: 'Ingredient Name',
              type: 'text',
              required: true,
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              required: false,
            },
            {
              key: 'percentage',
              label: 'Percentage',
              type: 'number',
              required: false,
            },
          ],
          instructions: '주요 성분과 효능을 입력하세요',
        },
        {
          key: 'certifications',
          label: 'Certifications',
          type: 'multiselect',
          required: false,
          choices: {
            vegan: '비건',
            hypoallergenic: '저자극',
            organic: '유기농',
            ewgGreen: 'EWG그린',
            crueltyfree: '동물실험반대',
            dermatologicallyTested: '피부과테스트완료',
          },
          instructions: '제품 인증을 선택하세요',
        },
        {
          key: 'productCategory',
          label: 'Product Category',
          type: 'select',
          required: true,
          choices: {
            skincare: '스킨케어',
            cleansing: '클렌징',
            makeup: '메이크업',
            suncare: '선케어',
            mask: '마스크팩',
            bodycare: '바디케어',
            haircare: '헤어케어',
          },
          instructions: '제품 카테고리를 선택하세요',
        },
        {
          key: 'routineInfo',
          label: 'Routine Information',
          type: 'object',
          required: false,
          subFields: [
            {
              key: 'timeOfUse',
              label: 'Time of Use',
              type: 'multiselect',
              required: false,
              choices: {
                morning: '아침',
                evening: '저녁',
                weekly: '주간케어',
              },
            },
            {
              key: 'step',
              label: 'Routine Step',
              type: 'select',
              required: false,
              choices: {
                cleansing: '클렌징',
                toner: '토너',
                essence: '에센스',
                serum: '세럼',
                cream: '크림',
                sunscreen: '선크림',
                mask: '마스크',
              },
            },
            {
              key: 'orderInRoutine',
              label: 'Order in Routine',
              type: 'number',
              required: false,
            },
          ],
          instructions: '루틴에서의 사용 정보를 입력하세요',
        },
        {
          key: 'contraindications',
          label: 'Contraindications',
          type: 'text',
          required: false,
          instructions: '사용 시 주의사항이나 금지 조합을 입력하세요 (예: 레티놀 제품과 동시 사용 금지)',
        },
        {
          key: 'texture',
          label: 'Texture',
          type: 'select',
          required: false,
          choices: {
            gel: '젤',
            cream: '크림',
            lotion: '로션',
            serum: '세럼',
            oil: '오일',
            foam: '폼',
            water: '수분',
            balm: '밤',
          },
        },
        {
          key: 'volume',
          label: 'Volume/Size',
          type: 'text',
          required: false,
          instructions: '용량을 입력하세요 (예: 150ml, 50g)',
        },
        {
          key: 'expiryPeriod',
          label: 'Expiry Period After Opening',
          type: 'text',
          required: false,
          instructions: '개봉 후 사용 기한 (예: 12개월)',
        },
      ],
    },

    // Influencer Routine metadata REMOVED (Phase 7-Y) - PartnerRoutine manages routine metadata
  ],

  // Routes - extending core routes
  routes: [
    '/api/v1/cosmetics',
    '/api/v1/cosmetics/*',
    // '/api/v1/partner/routines' REMOVED (Phase 7-Y) - Routine CRUD moved to cosmetics-partner-extension
  ],

  // Permissions (extending core permissions)
  permissions: [
    'cosmetics:view',
    'cosmetics:edit',
    'cosmetics:manage_filters',
    'cosmetics:recommend_routine',
  ],

  // Shortcodes
  shortcodes: [
    {
      name: 'cosmetics-product',
      component: './frontend/shortcodes/cosmetics-product.js',
      description: 'Display product detail with cosmetics metadata',
      usage: '[cosmetics-product id="PRODUCT_ID"]',
      attributes: {
        id: {
          type: 'string',
          required: true,
          description: 'Product ID to display',
        },
        apiBaseUrl: {
          type: 'string',
          required: false,
          description: 'API base URL (defaults to /api/v1)',
        },
      },
    },
    {
      name: 'cosmetics-products-list',
      component: './frontend/shortcodes/cosmetics-products-list.js',
      description: 'Display filterable product list with cosmetics metadata',
      usage: '[cosmetics-products-list filters="skinType:dry,concerns:hydration" sort="newest" limit="20"]',
      attributes: {
        filters: {
          type: 'string',
          required: false,
          description: 'Filter string (format: "skinType:dry,concerns:hydration")',
        },
        sort: {
          type: 'string',
          required: false,
          description: 'Sort order: newest | price_asc | price_desc | popular',
        },
        limit: {
          type: 'number',
          required: false,
          description: 'Items per page (default: 20)',
        },
        apiBaseUrl: {
          type: 'string',
          required: false,
          description: 'API base URL (defaults to /api/v1)',
        },
      },
    },
    {
      name: 'cosmetics-recommendations',
      component: './frontend/shortcodes/cosmetics-recommendations.js',
      description: 'Display product recommendations based on criteria',
      usage: '[cosmetics-recommendations skinType="dry,sensitive" concerns="hydration,redness" limit="5"]',
      attributes: {
        skinType: {
          type: 'string',
          required: false,
          description: 'Skin types (comma-separated)',
        },
        concerns: {
          type: 'string',
          required: false,
          description: 'Skin concerns (comma-separated)',
        },
        brand: {
          type: 'string',
          required: false,
          description: 'Brand filter',
        },
        category: {
          type: 'string',
          required: false,
          description: 'Product category',
        },
        limit: {
          type: 'number',
          required: false,
          description: 'Number of recommendations (default: 5)',
        },
        apiBaseUrl: {
          type: 'string',
          required: false,
          description: 'API base URL (defaults to /api/v1)',
        },
        title: {
          type: 'string',
          required: false,
          description: 'Panel title',
        },
      },
    },
  ],

  // ===== 소유 테이블 =====
  ownsTables: [
    'cosmetics_filters',
    // 'cosmetics_routines' REMOVED (Phase 7-Y) - PartnerRoutine owns cosmetics_partner_routines
    'cosmetics_brands',
    'cosmetics_skin_types',
    'cosmetics_concerns',
    'cosmetics_ingredients',
    'cosmetics_categories',
    'cosmetics_signage_playlists',
    'cosmetics_seller_workflow_sessions',
    'cosmetics_campaigns',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      './backend/entities/cosmetics-filter.entity',
      // cosmetics-routine.entity REMOVED (Phase 7-Y) - PartnerRoutine is canonical
      './backend/entities/brand.entity',
      './backend/entities/skin-type.entity',
      './backend/entities/concern.entity',
      './backend/entities/ingredient.entity',
      './backend/entities/category.entity',
      './backend/entities/signage-playlist.entity',
      './backend/entities/seller-workflow-session.entity',
      './backend/entities/campaign.entity',
    ],
    services: [
      'CosmeticsMetadataService',
      // 'RoutineService' REMOVED (Phase 7-Y) - Use PartnerRoutine from partner-extension
    ],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/cosmetics/filters', component: 'CosmeticsFilters' },
        { path: '/admin/cosmetics/routines', component: 'RoutineTemplates' },
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

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'cosmetics',
        label: '화장품',
        icon: 'sparkles',
        order: 35,
        parent: 'dropshipping',
        children: [
          {
            id: 'cosmetics-filters',
            label: '필터 관리',
            path: '/admin/cosmetics/filters',
            icon: 'filter',
          },
          {
            id: 'cosmetics-routines',
            label: '루틴 템플릿',
            path: '/admin/cosmetics/routines',
            icon: 'layers',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['CosmeticsMetadataService', 'RoutineService'],
    types: ['CosmeticsMetadata', 'InfluencerRoutine'],
    events: ['cosmetics.filter.applied', 'routine.created'],
  },
};

// Legacy export for backward compatibility
export const manifest = cosmeticsExtensionManifest;
export default cosmeticsExtensionManifest;
