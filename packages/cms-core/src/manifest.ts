/**
 * CMS Core App Manifest
 *
 * Core CMS engine providing:
 * - Template system (templates, template parts, views)
 * - Custom Post Types (CPT) and fields
 * - Advanced Custom Fields (ACF) groups and values
 * - Menu system with locations
 * - Media library with folders
 * - CMS settings management
 *
 * @status FROZEN - Phase A/B complete (2025-12-14)
 * @note Core structure is stable. Do not modify without Phase review.
 */

export const cmsCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'cms-core',
  displayName: 'CMS 엔진',
  version: '1.0.0',
  appType: 'core' as const,
  description: 'CMS 핵심 엔진 - 템플릿, CPT, ACF, 뷰, 메뉴, 미디어',

  // ===== 의존성 =====
  dependencies: {
    core: [],
    optional: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    // Template system
    'cms_templates',
    'cms_template_parts',
    'cms_views',
    // Custom Post Types
    'cms_cpt_types',
    'cms_cpt_fields',
    // Advanced Custom Fields
    'cms_acf_field_groups',
    'cms_acf_fields',
    'cms_acf_values',
    // Settings
    'cms_settings',
    // Menu system
    'cms_menus',
    'cms_menu_items',
    'cms_menu_locations',
    // Media library
    'cms_media',
    'cms_media_files',
    'cms_media_folders',
    'cms_media_tags',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      'Template',
      'TemplatePart',
      'View',
      'CptType',
      'CptField',
      'AcfFieldGroup',
      'AcfField',
      'AcfValue',
      'CmsSetting',
      'Menu',
      'MenuItem',
      'MenuLocation',
      'Media',
      'MediaFile',
      'MediaFolder',
      'MediaTag',
    ],
    services: [
      'TemplateService',
      'CptService',
      'AcfService',
      'MenuService',
      'MediaService',
      'SettingsService',
    ],
    controllers: [
      'TemplateController',
      'CptController',
      'AcfController',
      'MenuController',
      'MediaController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/cms', component: 'CmsApp' },
        { path: '/admin/cms/templates', component: 'TemplatesPage' },
        { path: '/admin/cms/cpt', component: 'CptPage' },
        { path: '/admin/cms/acf', component: 'AcfPage' },
        { path: '/admin/cms/menus', component: 'MenusPage' },
        { path: '/admin/cms/media', component: 'MediaPage' },
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

  // ===== 권한 정의 =====
  permissions: [
    {
      id: 'cms.templates.view',
      name: '템플릿 조회',
      description: '템플릿을 조회할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.templates.manage',
      name: '템플릿 관리',
      description: '템플릿을 생성/수정/삭제할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.cpt.view',
      name: 'CPT 조회',
      description: 'Custom Post Type을 조회할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.cpt.manage',
      name: 'CPT 관리',
      description: 'Custom Post Type을 생성/수정/삭제할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.acf.view',
      name: 'ACF 조회',
      description: 'Advanced Custom Fields를 조회할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.acf.manage',
      name: 'ACF 관리',
      description: 'Advanced Custom Fields를 생성/수정/삭제할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.menus.view',
      name: '메뉴 조회',
      description: '메뉴를 조회할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.menus.manage',
      name: '메뉴 관리',
      description: '메뉴를 생성/수정/삭제할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.media.view',
      name: '미디어 조회',
      description: '미디어를 조회할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.media.manage',
      name: '미디어 관리',
      description: '미디어를 업로드/수정/삭제할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.settings.view',
      name: 'CMS 설정 조회',
      description: 'CMS 설정을 조회할 수 있는 권한',
      category: 'cms',
    },
    {
      id: 'cms.settings.manage',
      name: 'CMS 설정 관리',
      description: 'CMS 설정을 변경할 수 있는 권한',
      category: 'cms',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'cms',
        label: 'CMS',
        icon: 'layout',
        order: 5,
        children: [
          {
            id: 'templates',
            label: '템플릿',
            path: '/admin/cms/templates',
            icon: 'document',
          },
          {
            id: 'cpt',
            label: 'Custom Post Types',
            path: '/admin/cms/cpt',
            icon: 'collection',
          },
          {
            id: 'acf',
            label: 'ACF 필드',
            path: '/admin/cms/acf',
            icon: 'adjustments',
          },
          {
            id: 'menus',
            label: '메뉴 관리',
            path: '/admin/cms/menus',
            icon: 'menu',
          },
          {
            id: 'media',
            label: '미디어 라이브러리',
            path: '/admin/cms/media',
            icon: 'photograph',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['TemplateService', 'CptService', 'AcfService', 'MenuService', 'MediaService'],
    types: ['Template', 'CptType', 'AcfFieldGroup', 'Menu', 'Media'],
    events: ['template.updated', 'cpt.created', 'acf.updated', 'menu.updated', 'media.uploaded'],
  },

  // ===== 뷰 템플릿 =====
  viewTemplates: [
    {
      viewId: 'templates-list',
      route: '/admin/cms/templates',
      title: '템플릿 목록',
      type: 'list' as const,
      layout: 'admin',
      auth: true,
    },
    {
      viewId: 'templates-detail',
      route: '/admin/cms/templates/:id',
      title: '템플릿 상세',
      type: 'detail' as const,
      layout: 'admin',
      auth: true,
    },
    {
      viewId: 'cpt-list',
      route: '/admin/cms/cpt',
      title: 'CPT 목록',
      type: 'list' as const,
      layout: 'admin',
      auth: true,
    },
    {
      viewId: 'acf-list',
      route: '/admin/cms/acf',
      title: 'ACF 필드 목록',
      type: 'list' as const,
      layout: 'admin',
      auth: true,
    },
    {
      viewId: 'menus-list',
      route: '/admin/cms/menus',
      title: '메뉴 목록',
      type: 'list' as const,
      layout: 'admin',
      auth: true,
    },
    {
      viewId: 'media-list',
      route: '/admin/cms/media',
      title: '미디어 라이브러리',
      type: 'list' as const,
      layout: 'admin',
      auth: true,
    },
  ],

  // ===== Navigation 정의 =====
  navigation: {
    admin: [
      {
        id: 'cms-core.cms',
        label: 'CMS',
        path: '/admin/cms',
        icon: 'layout',
        order: 5,
      },
      {
        id: 'cms-core.templates',
        label: '템플릿',
        path: '/admin/cms/templates',
        icon: 'document',
        parentId: 'cms-core.cms',
        order: 1,
      },
      {
        id: 'cms-core.cpt',
        label: 'Custom Post Types',
        path: '/admin/cms/cpt',
        icon: 'collection',
        parentId: 'cms-core.cms',
        order: 2,
      },
      {
        id: 'cms-core.acf',
        label: 'ACF 필드',
        path: '/admin/cms/acf',
        icon: 'adjustments',
        parentId: 'cms-core.cms',
        order: 3,
      },
      {
        id: 'cms-core.menus',
        label: '메뉴 관리',
        path: '/admin/cms/menus',
        icon: 'menu',
        parentId: 'cms-core.cms',
        order: 4,
      },
      {
        id: 'cms-core.media',
        label: '미디어 라이브러리',
        path: '/admin/cms/media',
        icon: 'photograph',
        parentId: 'cms-core.cms',
        order: 5,
      },
    ],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    defaultTemplateEngine: 'handlebars',
    mediaUploadMaxSize: 10485760,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 1024, height: 1024 },
    ],
  },
};

// Legacy export for backward compatibility
export const manifest = cmsCoreManifest;
export default cmsCoreManifest;
