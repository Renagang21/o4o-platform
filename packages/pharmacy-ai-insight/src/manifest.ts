/**
 * pharmacy-ai-insight Manifest
 *
 * 약사 전용 AI 인사이트 도구
 * - 포럼 내부 도구
 * - AI 요약 중심
 * - 상품/유통 연계
 *
 * @package @o4o/pharmacy-ai-insight
 */

export const pharmacyAiInsightManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'pharmacy-ai-insight',
  name: 'Pharmacy AI Insight',
  displayName: 'AI 인사이트',
  version: '0.1.0',
  type: 'feature' as const,
  description: '약사 전용 AI 인사이트 도구 - 데이터 해석, 패턴 설명, 제품 연계',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    optional: ['dropshipping-core', 'digital-signage-core'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'pharmacy_ai_insight_sessions',
    'pharmacy_ai_insight_settings',
  ],

  // ===== 권한 =====
  permissions: [
    'pharmacy-ai-insight.read',
    'pharmacy-ai-insight.generate',
    'pharmacy-ai-insight.products.view',
  ],

  // ===== Lifecycle =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== Features =====
  features: [
    'ai-summary-card',
    'pattern-explanation',
    'product-type-block',
    'selective-cta',
  ],

  // ===== Configuration =====
  config: {
    enableAiSummary: {
      type: 'boolean',
      default: true,
      description: 'AI 요약 기능 활성화',
    },
    summaryRefreshInterval: {
      type: 'number',
      default: 300000,
      description: '요약 갱신 주기 (ms)',
    },
    showProductHints: {
      type: 'boolean',
      default: true,
      description: '제품 연계 힌트 표시',
    },
  },

  // ===== API Routes =====
  apiRoutes: [
    '/api/v1/pharmacy-ai-insight/summary',
    '/api/v1/pharmacy-ai-insight/patterns',
    '/api/v1/pharmacy-ai-insight/product-hints',
  ],

  // ===== Frontend Routes =====
  frontendRoutes: [
    '/pharmacy-ai-insight',
    '/pharmacy-ai-insight/summary',
  ],

  // ===== Navigation Menus =====
  navigation: {
    menus: [
      {
        id: 'pharmacy-ai-insight-main',
        label: 'AI 인사이트',
        path: '/pharmacy-ai-insight',
        icon: 'insights',
        children: [
          {
            id: 'pharmacy-ai-insight-summary',
            label: 'AI 요약',
            path: '/pharmacy-ai-insight/summary',
            icon: 'auto_awesome',
          },
        ],
      },
    ],
    adminRoutes: [
      '/pharmacy-ai-insight',
      '/pharmacy-ai-insight/summary',
    ],
  },

  // ===== Backend =====
  backend: {
    entities: [],
    services: ['AiInsightService', 'ProductHintService'],
    controllers: ['InsightController'],
    routesExport: 'createRoutes',
  },

  // ===== 원칙 (코드에 명시) =====
  principles: {
    noMedicalAdvice: true,
    noPatientManagement: true,
    noCounselingRecords: true,
    aiInterpretationOnly: true,
    productFocused: true,
  },
};

export default pharmacyAiInsightManifest;
