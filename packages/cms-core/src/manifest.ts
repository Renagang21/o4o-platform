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
 */

export const cmsCoreManifest = {
  appId: 'cms-core',
  name: 'CMS Core Engine',
  type: 'core' as const,
  version: '1.0.0',
  description: 'CMS 핵심 엔진 - 템플릿, CPT, ACF, 뷰, 메뉴, 미디어',

  // No dependencies - this is a foundational package
  dependencies: {},

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true, // CMS data is critical
  },

  // All owned tables (16 tables)
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

  // Permissions
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

  // Admin UI routes
  adminRoutes: [
    {
      path: '/admin/cms',
      component: './admin-ui/pages/CmsApp.js',
    },
    {
      path: '/admin/cms/templates',
      component: './admin-ui/pages/TemplatesPage.js',
    },
    {
      path: '/admin/cms/cpt',
      component: './admin-ui/pages/CptPage.js',
    },
    {
      path: '/admin/cms/acf',
      component: './admin-ui/pages/AcfPage.js',
    },
    {
      path: '/admin/cms/menus',
      component: './admin-ui/pages/MenusPage.js',
    },
    {
      path: '/admin/cms/media',
      component: './admin-ui/pages/MediaPage.js',
    },
  ],

  // Default configuration
  defaultConfig: {
    defaultTemplateEngine: 'handlebars',
    mediaUploadMaxSize: 10485760, // 10MB
    allowedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 1024, height: 1024 },
    ],
  },

  // Menu structure for admin
  menu: {
    admin: [
      {
        id: 'cms',
        label: 'CMS',
        icon: 'layout',
        children: [
          {
            id: 'templates',
            label: '템플릿',
            path: '/admin/cms/templates',
          },
          {
            id: 'cpt',
            label: 'Custom Post Types',
            path: '/admin/cms/cpt',
          },
          {
            id: 'acf',
            label: 'ACF 필드',
            path: '/admin/cms/acf',
          },
          {
            id: 'menus',
            label: '메뉴 관리',
            path: '/admin/cms/menus',
          },
          {
            id: 'media',
            label: '미디어 라이브러리',
            path: '/admin/cms/media',
          },
        ],
      },
    ],
  },
};

export default cmsCoreManifest;
