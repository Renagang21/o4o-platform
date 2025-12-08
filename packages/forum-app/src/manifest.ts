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

  // Dependencies - format: { "app-id": "version-range" }
  // Note: organization-core dependency removed for initial setup
  // Can be added back when organization tables exist
  dependencies: {},

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

  // Admin routes (dashboard management)
  routes: [
    '/admin/forum',
    '/admin/forum/posts',
    '/admin/forum/posts/:id',
    '/admin/forum/posts/:id/edit',
    '/admin/forum/posts/new',
    '/admin/forum/categories',
    '/admin/forum/reports',
  ],

  // Public routes (user-facing pages)
  publicRoutes: [
    {
      path: '/forum',
      template: 'forum-home',
      label: '포럼 홈',
    },
    {
      path: '/forum/category/:slug',
      template: 'category-archive',
      label: '카테고리 아카이브',
    },
    {
      path: '/forum/post/:slug',
      template: 'post-single',
      label: '게시글 상세',
    },
    {
      path: '/forum/tag/:tag',
      template: 'post-list',
      label: '태그 아카이브',
    },
    {
      path: '/forum/search',
      template: 'post-list',
      label: '검색 결과',
    },
  ],

  // View Templates for public rendering
  viewTemplates: [
    {
      id: 'forum-home',
      name: '포럼 홈',
      description: '카테고리, 공지사항, 최근 게시글을 표시하는 포럼 메인 페이지',
      component: './templates/ForumHome.js',
      dataLoader: 'forumHomeLoader',
    },
    {
      id: 'post-list',
      name: '게시글 목록',
      description: '게시글 목록을 표시하는 템플릿 (검색, 태그, 일반 목록)',
      component: './templates/PostList.js',
      dataLoader: 'postListLoader',
      supports: ['pagination', 'filtering', 'sorting'],
    },
    {
      id: 'post-single',
      name: '게시글 상세',
      description: '단일 게시글 내용, 댓글, 관련 게시글을 표시',
      component: './templates/PostSingle.js',
      dataLoader: 'postSingleLoader',
      supports: ['comments', 'likes', 'bookmarks', 'shares'],
    },
    {
      id: 'category-archive',
      name: '카테고리 아카이브',
      description: '특정 카테고리의 게시글 목록과 하위 카테고리를 표시',
      component: './templates/CategoryArchive.js',
      dataLoader: 'categoryArchiveLoader',
      supports: ['pagination', 'subcategories'],
    },
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
