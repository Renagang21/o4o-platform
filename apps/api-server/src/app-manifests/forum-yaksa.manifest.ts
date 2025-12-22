/**
 * Forum Yaksa Extension App Manifest (Local Copy)
 *
 * This is a local copy for when @o4o/forum-core-yaksa package is not built.
 * Should be replaced with package import when available.
 */

export const forumYaksaManifest = {
  appId: 'forum-yaksa',
  displayName: '약사회 포럼',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '약사 조직 특화 포럼 (복약지도, 케이스 스터디, 약물 정보)',

  dependencies: {
    core: ['forum-core'],
    optional: ['organization-core', 'membership-yaksa'],
  },

  ownsTables: [
    'yaksa_forum_community',
    'yaksa_forum_community_member',
  ],

  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  backend: {
    entities: [
      'YaksaForumCommunity',
      'YaksaForumCommunityMember',
    ],
    services: [
      'YaksaForumService',
    ],
    controllers: [],
    routesExport: 'createRoutes',
  },

  frontend: {
    admin: {
      pages: [
        { path: '/admin/forum/yaksa', component: 'ForumYaksaApp' },
      ],
    },
  },

  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  permissions: [
    {
      id: 'forum.yaksa.view',
      name: '약사회 포럼 조회',
      description: '약사회 포럼 게시글 조회 권한',
      category: 'forum-yaksa',
    },
    {
      id: 'forum.yaksa.write',
      name: '약사회 포럼 작성',
      description: '약사회 포럼 게시글 작성 권한',
      category: 'forum-yaksa',
    },
    {
      id: 'forum.yaksa.manage',
      name: '약사회 포럼 관리',
      description: '약사회 포럼 관리 권한',
      category: 'forum-yaksa',
    },
  ],

  menus: {
    admin: [
      {
        id: 'forum-yaksa',
        label: '약사회 포럼',
        icon: 'message-square',
        order: 25,
        parent: 'forum',
        children: [
          {
            id: 'forum-yaksa-dashboard',
            label: '대시보드',
            path: '/admin/forum/yaksa',
            icon: 'layout-dashboard',
          },
        ],
      },
    ],
  },

  exposes: {
    services: ['YaksaForumService'],
    types: ['YaksaForumCommunity', 'YaksaForumCommunityMember'],
    events: ['yaksa.community.created', 'yaksa.post.created'],
  },

  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'pharmacy_meta',
    },
  ],

  acf: [
    {
      groupId: 'pharmacy_meta',
      label: '약물 메타데이터',
      fields: [
        { key: 'drugName', type: 'string', label: '약물명' },
        { key: 'drugCode', type: 'string', label: '약물 코드 (EDI)' },
        { key: 'category', type: 'select', label: '카테고리', options: ['복약지도', '부작용', '상호작용', '조제'] },
        { key: 'severity', type: 'select', label: '중요도', options: ['일반', '주의', '경고'] },
        { key: 'caseStudy', type: 'boolean', label: '케이스 스터디' },
      ],
    },
  ],

  defaultConfig: {
    categories: [
      { name: '지부 공지', slug: 'branch-announcements', color: '#1E40AF' },
      { name: '복약지도', slug: 'medication-guidance', color: '#3B82F6' },
      { name: '부작용 공유', slug: 'side-effects', color: '#60A5FA' },
      { name: '교육자료', slug: 'education', color: '#93C5FD' },
    ],
    skin: 'yaksa',
    brandColor: '#1E40AF',
    accentColor: '#3B82F6',
    requireApproval: true,
  },
};

export default forumYaksaManifest;
