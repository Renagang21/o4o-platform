/**
 * Forum Yaksa Extension App Manifest
 *
 * Extends forum-core with Yaksa organization-specific features:
 * - Drug database integration
 * - Case study sharing
 * - Pharmacy-focused categories
 * - Medication guidance
 */

export const forumYaksaManifest = {
  appId: 'forum-yaksa',
  name: 'Forum Extension – Yaksa Organization',
  type: 'extension' as const,
  version: '1.0.0',
  description: '약사 조직 특화 포럼 (복약지도, 케이스 스터디, 약물 정보)',

  // Core dependency
  dependencies: {
    'forum-core': '>=1.0.0',
  },

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true, // Yaksa communities are important
  },

  // Extension tables (yaksa-specific)
  ownsTables: [
    'yaksa_forum_community',
    'yaksa_forum_community_member',
  ],

  // Extend forum_post CPT with pharmacy metadata
  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'pharmacy_meta',
    },
  ],

  // ACF group for pharmacy metadata
  acf: [
    {
      groupId: 'pharmacy_meta',
      label: '약물 메타데이터',
      fields: [
        {
          key: 'drugName',
          type: 'string',
          label: '약물명',
        },
        {
          key: 'drugCode',
          type: 'string',
          label: '약물 코드 (EDI)',
        },
        {
          key: 'category',
          type: 'select',
          label: '카테고리',
          options: ['복약지도', '부작용', '상호작용', '조제'],
        },
        {
          key: 'severity',
          type: 'select',
          label: '중요도',
          options: ['일반', '주의', '경고'],
        },
        {
          key: 'caseStudy',
          type: 'boolean',
          label: '케이스 스터디',
        },
      ],
    },
  ],

  // Admin UI routes (override core UI)
  adminRoutes: [
    {
      path: '/admin/forum',
      component: './admin-ui/pages/ForumYaksaApp.js',
    },
  ],

  // Default configuration
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
    requireApproval: true, // Yaksa-specific: require approval for posts
  },

  // Permissions (inherits from forum-core)
  permissions: [],

  // Menu (uses core menu with yaksa theme)
  menu: null,
};

export default forumYaksaManifest;
