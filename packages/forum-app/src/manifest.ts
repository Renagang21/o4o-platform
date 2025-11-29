/**
 * Forum Core App Manifest
 *
 * Defines the forum-core as a complete, installable core app.
 * This is the "engine" that owns forum data tables and provides core functionality.
 * Service-specific forum apps (forum-neture, forum-yaksa) extend this core.
 */
export const forumManifest = {
  appId: 'forum-core',
  name: 'Forum Core',
  type: 'core' as const,
  version: '1.0.0',
  description: '커뮤니티 포럼 코어 엔진 (게시글/댓글/카테고리/태그)',

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // Data ownership - forum-core owns these tables
  ownsTables: [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
    'forum_like',
    'forum_bookmark',
  ],

  // CPT definitions (using Entity storage)
  cpt: [
    {
      name: 'forum_post',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '포럼 게시글',
      supports: ['title', 'content', 'author', 'categories', 'tags', 'comments'],
    },
    {
      name: 'forum_category',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '포럼 카테고리',
      supports: ['name', 'description', 'hierarchy'],
    },
    {
      name: 'forum_comment',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '포럼 댓글',
      supports: ['content', 'author', 'post'],
    },
    {
      name: 'forum_tag',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '포럼 태그',
      supports: ['name'],
    },
  ],

  // ACF groups (core provides metadata field for extensions)
  acf: [],

  routes: [
    '/admin/forum',
    '/admin/forum/posts',
    '/admin/forum/posts/:id',
    '/admin/forum/posts/:id/edit',
    '/admin/forum/posts/new',
    '/admin/forum/categories',
    '/admin/forum/reports',
  ],

  permissions: [
    'forum.read',
    'forum.write',
    'forum.comment',
    'forum.moderate',
    'forum.admin',
  ],

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // Installation options
  installOptions: {
    adoptExistingTables: true, // Adopt existing forum tables if found
    keepDataOnUninstall: true, // Default: keep data when uninstalling
  },

  // Menu definition (to be integrated with core menu system)
  menu: {
    id: 'forum',
    label: '포럼',
    icon: 'MessageSquare',
    path: '/forum',
    position: 100,
    children: [
      {
        id: 'forum-dashboard',
        label: '대시보드',
        icon: 'LayoutDashboard',
        path: '/forum',
      },
      {
        id: 'forum-posts',
        label: '게시글 관리',
        icon: 'FileText',
        path: '/forum',
      },
      {
        id: 'forum-categories',
        label: '카테고리',
        icon: 'Folder',
        path: '/forum/categories',
      },
      {
        id: 'forum-reports',
        label: '신고 검토',
        icon: 'Shield',
        path: '/forum/reports',
      },
    ],
  },
};

export default forumManifest;
