/**
 * Forum App Manifest
 *
 * Defines the forum feature as an installable/activatable app
 */
export const forumManifest = {
  appId: 'forum',
  name: 'Forum',
  version: '1.0.0',
  description: '커뮤니티 포럼 기능 (게시글/댓글/카테고리/태그)',

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
