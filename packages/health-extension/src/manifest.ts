/**
 * Health Extension Manifest
 *
 * 건강기능식품/건강제품 산업군 확장 앱
 * ProductType.HEALTH 기반 산업 확장
 *
 * Phase 11: Core v2 정합 리팩토링
 * - Cosmetics, Pharmaceutical에 이어 3번째 표준 Reference App
 *
 * @package @o4o/health-extension
 */

export const healthExtensionManifest = {
  // ===== 필수 기본 정보 =====
  id: 'health-extension',
  appId: 'health-extension',
  displayName: '건강기능식품',
  name: 'Health Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const,
  category: 'commerce' as const,
  description: '건강기능식품/건강보조제 전용 확장 - 영양정보, 기능성, 섭취방법 관리',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core'],
    apps: [],
  },

  // ProductType 필터링
  productType: 'HEALTH',

  // Extend existing CPTs with health metadata
  extendsCPT: ['ds_product'],

  // Custom Post Types owned by this extension
  cpt: [],

  // ACF field groups for health metadata
  acf: [
    {
      groupId: 'health_metadata',
      label: 'Health Product Information',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'nutritionInfo',
          label: 'Nutrition Information',
          type: 'array',
          required: false,
          subFields: [
            {
              key: 'name',
              label: '영양소명',
              type: 'text',
              required: true,
            },
            {
              key: 'amount',
              label: '함량',
              type: 'text',
              required: true,
            },
            {
              key: 'unit',
              label: '단위',
              type: 'text',
              required: true,
            },
            {
              key: 'dailyValue',
              label: '1일 영양성분 기준치(%)',
              type: 'number',
              required: false,
            },
          ],
          instructions: '영양성분 정보를 입력하세요',
        },
        {
          key: 'functionDescription',
          label: 'Function Description',
          type: 'text',
          required: true,
          instructions: '기능성 내용을 입력하세요 (예: 면역력 증진에 도움을 줄 수 있음)',
        },
        {
          key: 'intakeMethod',
          label: 'Intake Method',
          type: 'text',
          required: true,
          instructions: '섭취 방법 및 1일 섭취량을 입력하세요 (예: 1일 1회, 1회 2정)',
        },
        {
          key: 'dailyDosage',
          label: 'Daily Dosage',
          type: 'text',
          required: false,
          instructions: '1일 권장 섭취량 (예: 1,000mg)',
        },
        {
          key: 'caution',
          label: 'Caution',
          type: 'text',
          required: true,
          instructions: '섭취 시 주의사항을 입력하세요',
        },
        {
          key: 'allergyInfo',
          label: 'Allergy Information',
          type: 'multiselect',
          required: false,
          choices: {
            milk: '우유',
            egg: '알류(가금류)',
            peanut: '땅콩',
            soybean: '대두',
            wheat: '밀',
            buckwheat: '메밀',
            shellfish: '조개류',
            crab: '게',
            shrimp: '새우',
            pork: '돼지고기',
            beef: '쇠고기',
            chicken: '닭고기',
            squid: '오징어',
            fish: '생선',
            walnut: '호두',
            pine_nut: '잣',
            sulfites: '아황산류',
          },
          instructions: '알레르기 유발 물질을 선택하세요',
        },
        {
          key: 'expirationDate',
          label: 'Expiration Date',
          type: 'date',
          required: true,
          instructions: '유통기한을 입력하세요',
        },
        {
          key: 'storageMethod',
          label: 'Storage Method',
          type: 'select',
          required: false,
          choices: {
            room_temp: '실온보관',
            refrigerated: '냉장보관',
            frozen: '냉동보관',
            dark_place: '직사광선을 피해 서늘한 곳',
          },
          instructions: '보관 방법을 선택하세요',
        },
        {
          key: 'manufacturer',
          label: 'Manufacturer',
          type: 'text',
          required: false,
          instructions: '제조원을 입력하세요',
        },
        {
          key: 'importer',
          label: 'Importer',
          type: 'text',
          required: false,
          instructions: '수입원을 입력하세요 (수입제품의 경우)',
        },
        {
          key: 'certifications',
          label: 'Certifications',
          type: 'multiselect',
          required: false,
          choices: {
            gmp: 'GMP 인증',
            haccp: 'HACCP 인증',
            organic: '유기농 인증',
            halal: '할랄 인증',
            kosher: '코셔 인증',
            vegan: '비건 인증',
            iso: 'ISO 인증',
          },
          instructions: '제품 인증을 선택하세요',
        },
        {
          key: 'healthCategory',
          label: 'Health Category',
          type: 'select',
          required: true,
          choices: {
            vitamin: '비타민',
            mineral: '미네랄',
            omega: '오메가3/지방산',
            probiotics: '프로바이오틱스',
            antioxidant: '항산화',
            joint: '관절/뼈',
            eye: '눈 건강',
            liver: '간 건강',
            immune: '면역력',
            energy: '에너지/피로',
            digestion: '소화/장 건강',
            skin_health: '피부 건강',
            weight: '체중 관리',
            heart: '심혈관',
            brain: '두뇌/기억력',
            sleep: '수면/스트레스',
            general: '종합 영양제',
          },
          instructions: '건강기능식품 카테고리를 선택하세요',
        },
        {
          key: 'targetGroup',
          label: 'Target Group',
          type: 'multiselect',
          required: false,
          choices: {
            all: '전연령',
            child: '어린이',
            teen: '청소년',
            adult: '성인',
            senior: '노인',
            pregnant: '임산부',
            lactating: '수유부',
            men: '남성',
            women: '여성',
          },
          instructions: '주요 대상 그룹을 선택하세요',
        },
        {
          key: 'form',
          label: 'Product Form',
          type: 'select',
          required: false,
          choices: {
            tablet: '정제',
            capsule: '캡슐',
            powder: '분말',
            liquid: '액상',
            gummy: '젤리/구미',
            chewable: '씹어먹는',
            softgel: '소프트젤',
            granule: '과립',
          },
          instructions: '제품 제형을 선택하세요',
        },
        {
          key: 'servingSize',
          label: 'Serving Size',
          type: 'text',
          required: false,
          instructions: '1회 섭취량 (예: 2정, 1포)',
        },
        {
          key: 'servingsPerContainer',
          label: 'Servings Per Container',
          type: 'number',
          required: false,
          instructions: '총 내용량 기준 섭취 횟수',
        },
      ],
    },
  ],

  // Routes - extending core routes
  routes: [
    '/api/v1/health',
    '/api/v1/health/*',
  ],

  // Permissions
  permissions: [
    'health:view',
    'health:edit',
    'health:manage',
  ],

  // ===== 소유 테이블 =====
  ownsTables: [],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [],
    services: [
      'HealthProductService',
      'HealthOfferService',
      'HealthOrderService',
      'HealthSettlementService',
    ],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
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
        id: 'health',
        label: '건강식품',
        icon: 'heart-pulse',
        order: 40,
        parent: 'dropshipping',
        children: [
          {
            id: 'health-products',
            label: '제품 목록',
            path: '/health/products',
            icon: 'package',
          },
          {
            id: 'health-offers',
            label: 'Offer 관리',
            path: '/health/offers',
            icon: 'tag',
          },
          {
            id: 'health-orders',
            label: '주문 관리',
            path: '/health/orders',
            icon: 'shopping-cart',
          },
          {
            id: 'health-settlement',
            label: '정산 내역',
            path: '/health/settlement',
            icon: 'receipt',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['HealthProductService', 'HealthOfferService'],
    types: ['HealthMetadata', 'NutritionInfo'],
    events: ['health.offer.created', 'health.order.created'],
  },

  // ===== 산업 확장 설정 =====
  config: {
    // ProductType 필터링
    productTypeFilter: ['HEALTH'],
    // PHARMACEUTICAL 자동 제외
    excludeProductTypes: ['PHARMACEUTICAL'],
    // Listing 가능 (PHARMACEUTICAL과 다름)
    enableListing: true,
    // 유통기한 경고 일수
    expirationWarningDays: 90,
  },
};

// Legacy export for backward compatibility
export const manifest = healthExtensionManifest;
export default healthExtensionManifest;
