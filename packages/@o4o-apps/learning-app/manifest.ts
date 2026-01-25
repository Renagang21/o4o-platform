/**
 * Learning App v1 Manifest
 *
 * 핵심 정체성:
 * - Learning App v1은 LMS가 아니다
 * - '콘텐츠를 순서대로 보여주는 최소 Flow 도구'
 * - 교육/평가/수료 기능 절대 포함 금지
 *
 * Out of Scope:
 * - 강의/수업 개념
 * - 커리큘럼 관리
 * - 퀴즈/시험
 * - 설문/응답
 * - 점수/등급/랭킹
 * - 수료증/이수
 */
export const learningAppManifest = {
  // Basic identification
  id: 'learning-app',
  appId: 'learning-app',
  name: 'Learning App',
  version: '1.0.0',
  description: '콘텐츠를 순서대로 보여주는 Flow 관리 도구 (LMS 아님)',

  // App type and category
  type: 'auxiliary' as const, // 보조 앱 (독립 실행 아님)
  category: 'flow',

  // Author information
  author: 'O4O Platform',
  license: 'MIT',

  // Dependencies - Content App 필수
  dependencies: {
    '@o4o-apps/content-app': '^1.0.0',
  },

  // Database tables (자체 테이블 없음, API만 사용)
  ownsTables: [],

  // Permissions
  permissions: [
    {
      id: 'flow.read',
      name: 'Flow 조회',
      description: 'Flow 목록 및 상세를 조회할 수 있는 권한',
      category: 'flow',
    },
    {
      id: 'flow.progress',
      name: '진행 상태 관리',
      description: '자신의 Flow 진행 상태를 저장할 수 있는 권한',
      category: 'flow',
    },
  ],

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // API routes
  routes: [
    '/api/v1/flows',
    '/api/v1/flows/:id',
    '/api/v1/flows/:id/progress',
  ],

  // Admin routes - 최소화 (독립 진입 금지)
  adminRoutes: [],

  // Public routes - 독립 메뉴 없음
  // Content 상세에서만 진입 가능
  publicRoutes: [
    {
      path: '/flow',
      template: 'flow-list',
      label: 'Flow 목록',
      hidden: true, // 메뉴에서 숨김
    },
    {
      path: '/flow/:id',
      template: 'flow-detail',
      label: 'Flow 상세',
      hidden: true,
    },
    {
      path: '/flow/:flowId/step/:stepIndex',
      template: 'flow-step',
      label: '단계 보기',
      hidden: true,
    },
  ],

  // No CPT/ACF
  cpt: [],
  acf: [],

  // Features - 최소 기능만
  features: [
    'flow-list',
    'flow-detail',
    'step-navigation',
    'progress-tracking',
    'content-preview-integration',
  ],

  // Configuration
  config: {
    autoSaveProgress: {
      type: 'boolean',
      default: true,
      description: '진행 위치 자동 저장',
    },
  },

  // Legacy fields
  enabled: true,

  views: {
    'flow-list': 'views/flow-list.json',
    'flow-detail': 'views/flow-detail.json',
    'flow-step': 'views/flow-step.json',
  },

  functions: {
    learningApi: 'functions/learningApi.ts',
  },

  ui: {
    FlowListPage: 'ui/FlowListPage.tsx',
    FlowDetailPage: 'ui/FlowDetailPage.tsx',
    FlowStepPage: 'ui/FlowStepPage.tsx',
    FlowNavigator: 'ui/FlowNavigator.tsx',
  },
};

export default learningAppManifest;
