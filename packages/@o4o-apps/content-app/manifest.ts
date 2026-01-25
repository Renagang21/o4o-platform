/**
 * Content App Manifest
 *
 * 플랫폼 공통 콘텐츠 제작 도구
 * - 특정 도메인에 종속되지 않음
 * - 역할(Role)이 아닌 소유 주체(Owner) 기준
 * - 강의/퀴즈/설문/평가 기능 없음
 */
export const contentAppManifest = {
  // Basic identification
  id: 'content-app',
  appId: 'content-app',
  name: 'Content App',
  version: '1.0.0',
  description: '플랫폼 공통 콘텐츠 제작 도구 - 콘텐츠를 만들고, 저장하고, 참조할 수 있게 합니다',

  // App type and category
  type: 'standalone' as const,
  category: 'content',

  // Author information
  author: 'O4O Platform',
  license: 'MIT',

  // Dependencies
  dependencies: {},

  // Database tables (uses cms-core tables)
  ownsTables: [],

  // Permissions
  permissions: [
    {
      id: 'content.read',
      name: '콘텐츠 조회',
      description: '콘텐츠를 조회할 수 있는 권한',
      category: 'content',
    },
    {
      id: 'content.create',
      name: '콘텐츠 생성',
      description: '콘텐츠를 생성할 수 있는 권한',
      category: 'content',
    },
    {
      id: 'content.edit',
      name: '콘텐츠 수정',
      description: '콘텐츠를 수정할 수 있는 권한',
      category: 'content',
    },
    {
      id: 'content.delete',
      name: '콘텐츠 삭제',
      description: '콘텐츠를 삭제할 수 있는 권한',
      category: 'content',
    },
    {
      id: 'content.share',
      name: '콘텐츠 공유',
      description: '콘텐츠를 다른 서비스에 공유할 수 있는 권한',
      category: 'content',
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
    '/api/v1/content',
    '/api/v1/content/:id',
    '/api/v1/content/templates',
  ],

  // Admin routes
  adminRoutes: [
    {
      path: '/admin/content',
      label: '콘텐츠 관리',
    },
    {
      path: '/admin/content/create',
      label: '콘텐츠 생성',
    },
  ],

  // Frontend routes
  publicRoutes: [
    {
      path: '/content',
      template: 'content-list',
      label: '콘텐츠 목록',
    },
    {
      path: '/content/create',
      template: 'content-create',
      label: '콘텐츠 생성',
    },
    {
      path: '/content/:id',
      template: 'content-detail',
      label: '콘텐츠 상세',
    },
    {
      path: '/content/:id/edit',
      template: 'content-edit',
      label: '콘텐츠 수정',
    },
  ],

  // CPT definitions
  cpt: [],

  // ACF definitions
  acf: [],

  // Features
  features: [
    'text-content',
    'image-content',
    'social-content',
    'reference-content',
    'template-selection',
    'owner-based-permissions',
    'visibility-control',
    'content-sharing',
    'channel-preview',
  ],

  // Configuration
  config: {
    defaultVisibility: {
      type: 'string',
      default: 'private',
      description: 'Default visibility for new content',
    },
    enableTemplates: {
      type: 'boolean',
      default: true,
      description: 'Enable template selection for content creation',
    },
  },

  // Legacy fields (for backward compatibility)
  enabled: true,

  views: {
    'content-list': 'views/content-list.json',
    'content-create': 'views/content-create.json',
    'content-detail': 'views/content-detail.json',
    'content-edit': 'views/content-edit.json',
  },

  functions: {
    contentList: 'functions/contentList.ts',
    contentCreate: 'functions/contentCreate.ts',
    contentDetail: 'functions/contentDetail.ts',
    contentEdit: 'functions/contentEdit.ts',
  },

  ui: {
    ContentListPage: 'ui/ContentListPage.tsx',
    ContentCreatePage: 'ui/ContentCreatePage.tsx',
    ContentDetailPage: 'ui/ContentDetailPage.tsx',
    ContentEditPage: 'ui/ContentEditPage.tsx',
    ContentCard: 'ui/ContentCard.tsx',
    ContentEditor: 'ui/ContentEditor.tsx',
    OwnerSelector: 'ui/OwnerSelector.tsx',
    ContentPreview: 'ui/ContentPreview.tsx',
  },
};

export default contentAppManifest;
