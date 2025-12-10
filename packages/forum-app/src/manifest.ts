/**
 * Forum Core App Manifest
 *
 * Core forum engine providing:
 * - Posts, comments, categories, tags
 * - Likes, bookmarks, reports
 * - Public templates for rendering
 */

export const forumManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'forum-core',
  displayName: '포럼 엔진',
  version: '1.0.0',
  appType: 'core' as const,
  description: '커뮤니티 포럼 코어 엔진 (게시글/댓글/카테고리/태그)',

  // ===== 의존성 =====
  dependencies: {
    core: [],
    optional: ['organization-core'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
    'forum_like',
    'forum_bookmark',
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
      'ForumPost',
      'ForumCategory',
      'ForumComment',
      'ForumTag',
      'ForumLike',
      'ForumBookmark',
    ],
    services: [
      'ForumService',
      'PostService',
      'CategoryService',
      'CommentService',
    ],
    controllers: [
      'ForumController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/forum', component: 'ForumDashboard' },
        { path: '/admin/forum/posts', component: 'PostList' },
        { path: '/admin/forum/posts/:id', component: 'PostDetail' },
        { path: '/admin/forum/posts/:id/edit', component: 'PostEdit' },
        { path: '/admin/forum/posts/new', component: 'PostNew' },
        { path: '/admin/forum/categories', component: 'CategoryList' },
        { path: '/admin/forum/reports', component: 'ReportList' },
      ],
    },
    public: {
      pages: [
        { path: '/forum', component: 'ForumHome', template: 'forum-home' },
        { path: '/forum/category/:slug', component: 'CategoryArchive', template: 'category-archive' },
        { path: '/forum/post/:slug', component: 'PostSingle', template: 'post-single' },
        { path: '/forum/tag/:tag', component: 'PostList', template: 'post-list' },
        { path: '/forum/search', component: 'SearchResults', template: 'post-list' },
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
      id: 'forum.read',
      name: '포럼 읽기',
      description: '포럼 게시글 조회 권한',
      category: 'forum',
    },
    {
      id: 'forum.write',
      name: '포럼 작성',
      description: '포럼 게시글 작성 권한',
      category: 'forum',
    },
    {
      id: 'forum.comment',
      name: '댓글 작성',
      description: '포럼 댓글 작성 권한',
      category: 'forum',
    },
    {
      id: 'forum.moderate',
      name: '포럼 중재',
      description: '게시글/댓글 관리 및 신고 처리 권한',
      category: 'forum',
    },
    {
      id: 'forum.admin',
      name: '포럼 관리자',
      description: '포럼 전체 관리 권한',
      category: 'forum',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'forum',
        label: '포럼',
        icon: 'message-square',
        order: 20,
        children: [
          {
            id: 'forum-dashboard',
            label: '대시보드',
            path: '/admin/forum',
            icon: 'layout-dashboard',
          },
          {
            id: 'forum-posts',
            label: '게시글 관리',
            path: '/admin/forum/posts',
            icon: 'file-text',
          },
          {
            id: 'forum-categories',
            label: '카테고리',
            path: '/admin/forum/categories',
            icon: 'folder',
          },
          {
            id: 'forum-reports',
            label: '신고 검토',
            path: '/admin/forum/reports',
            icon: 'shield',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['ForumService', 'PostService', 'CategoryService', 'CommentService'],
    types: ['ForumPost', 'ForumCategory', 'ForumComment', 'ForumTag'],
    events: ['post.created', 'post.updated', 'post.deleted', 'comment.created', 'comment.deleted'],
  },

  // ===== CPT 정의 =====
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
  ],

  // ===== 뷰 템플릿 =====
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
      description: '게시글 목록을 표시하는 템플릿',
      component: './templates/PostList.js',
      dataLoader: 'postListLoader',
    },
    {
      id: 'post-single',
      name: '게시글 상세',
      description: '단일 게시글 내용, 댓글 표시',
      component: './templates/PostSingle.js',
      dataLoader: 'postSingleLoader',
    },
    {
      id: 'category-archive',
      name: '카테고리 아카이브',
      description: '특정 카테고리의 게시글 목록',
      component: './templates/CategoryArchive.js',
      dataLoader: 'categoryArchiveLoader',
    },
  ],

  // ===== 기본 설정 =====
  defaultConfig: {
    postsPerPage: 20,
    enableLikes: true,
    enableBookmarks: true,
    enableComments: true,
    moderationEnabled: true,
  },
};

// Legacy export for backward compatibility
export const manifest = forumManifest;
export default forumManifest;
