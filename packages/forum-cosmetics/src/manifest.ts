/**
 * Forum Cosmetics Extension App Manifest
 *
 * Extends forum-core with cosmetics-specific features:
 * - Skin type filtering
 * - Routine builder
 * - Product integration
 * - Beauty-focused categories
 */

export const forumCosmeticsManifest = {
  appId: 'forum-cosmetics',
  name: 'Forum Extension – Cosmetics',
  type: 'extension' as const,
  version: '1.0.0',
  description: '화장품 매장 특화 포럼 (피부타입, 루틴, 제품 연동)',

  // Core dependency
  dependencies: {
    'forum-core': '>=1.0.0',
  },

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false, // Extension data is less critical
  },

  // Extension tables (NOT core tables)
  ownsTables: [
    // Extension apps should not own core tables
  ],

  // Extend forum_post CPT with cosmetics metadata
  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'cosmetic_meta',
    },
  ],

  // ACF group for cosmetics metadata
  acf: [
    {
      groupId: 'cosmetic_meta',
      label: '화장품 메타데이터',
      fields: [
        {
          key: 'skinType',
          type: 'select',
          label: '피부 타입',
          options: ['건성', '지성', '복합성', '민감성'],
        },
        {
          key: 'concerns',
          type: 'multiselect',
          label: '피부 고민',
          options: ['여드름', '주름', '미백', '모공', '탄력'],
        },
        {
          key: 'routine',
          type: 'array',
          label: '루틴 단계',
        },
        {
          key: 'productIds',
          type: 'array',
          label: '관련 제품 ID',
        },
      ],
    },
  ],

  // Admin UI routes
  adminRoutes: [
    {
      path: '/admin/cosmetics/forum',
      component: './admin-ui/pages/CosmeticsForumDashboard',
    },
    {
      path: '/admin/cosmetics/forum/posts',
      component: './admin-ui/pages/CosmeticsForumPostList',
    },
    {
      path: '/admin/cosmetics/forum/stats',
      component: './admin-ui/pages/CosmeticsForumStats',
    },
  ],

  // Default configuration
  defaultConfig: {
    categories: [
      { name: '공지사항', slug: 'announcements', color: '#FF6B6B' },
      { name: '사용후기', slug: 'reviews', color: '#4ECDC4' },
      { name: '질문답변', slug: 'qna', color: '#95E1D3' },
      { name: '이벤트', slug: 'events', color: '#FFD93D' },
    ],
    skin: 'cosmetics',
    brandColor: '#8B7355',
    accentColor: '#E8B4B8',
  },

  // Permissions (inherits from forum-core)
  permissions: [],

  // Menu (uses core menu with cosmetics theme)
  menu: null,
};

export default forumCosmeticsManifest;
