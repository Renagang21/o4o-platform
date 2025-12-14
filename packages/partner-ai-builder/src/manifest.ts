/**
 * Partner AI Builder Manifest
 *
 * AI 기반 파트너 콘텐츠 자동 생성 엔진
 *
 * @package @o4o/partner-ai-builder
 */

export const manifest = {
  meta: {
    appId: 'partner-ai-builder',
    name: 'Partner AI Builder',
    displayName: 'AI 루틴 생성기',
    description: 'AI 기반 파트너 콘텐츠(루틴, 추천) 자동 생성 엔진',
    version: '1.0.0',
    type: 'extension' as const,
    author: 'O4O Platform',
    icon: 'smart_toy',
    category: 'ai',
  },

  dependencies: {
    core: [],
    extension: ['partnerops'],
  },

  permissions: {
    requiredRoles: ['partner', 'admin'],
    requiredLicenses: [],
  },

  cms: {
    cpt: [],
    acf: [],
    viewTemplates: [],
  },

  backend: {
    entities: [],
    services: [
      'AiRoutineBuilderService',
      'AiContentService',
      'AiRecommendationService',
    ],
    routes: ['/api/v1/ai-builder/*'],
  },

  navigation: {
    menus: [],
    adminRoutes: [
      '/partnerops/ai-builder',
      '/partnerops/ai-builder/routine',
      '/partnerops/ai-builder/recommend',
    ],
  },

  // AI Builder 전용 설정
  config: {
    // PHARMACEUTICAL 제품 완전 차단
    blockedIndustries: ['PHARMACEUTICAL'],
    // 허용 산업군
    allowedIndustries: ['COSMETICS', 'HEALTH', 'GENERAL'],
    // AI 모델 설정
    aiModel: 'gpt-4o-mini',
    // 루틴 단계 범위
    routineStepsRange: { min: 3, max: 7 },
    // 추천 제품 최대 개수
    maxRecommendedProducts: 5,
  },
};

export default manifest;
