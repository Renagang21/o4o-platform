/**
 * Forum Cosmetics Extension App Manifest
 *
 * Extends forum-core with cosmetics-specific features:
 * - Skin type filtering
 * - Skincare concerns integration
 * - Product recommendations
 * - Brand-specific discussions
 */

export const forumCosmeticsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'forum-cosmetics',
  displayName: '뷰티 포럼',
  name: 'Cosmetics Forum Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const, // Legacy compatibility
  category: 'community' as const,
  description: '화장품/뷰티 특화 포럼 (피부타입, 고민, 제품 리뷰, 성분 정보)',

  // ===== 의존성 =====
  dependencies: {
    core: ['forum-core'],
    apps: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'cosmetics_forum_meta',
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
      './backend/entities/CosmeticsForumMeta',
    ],
    services: [
      'CosmeticsForumService',
    ],
    controllers: [
      'CosmeticsForumController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/forum/cosmetics', component: 'ForumCosmeticsApp' },
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
      id: 'forum.cosmetics.view',
      name: '뷰티 포럼 조회',
      description: '뷰티 포럼 게시글 조회 권한',
      category: 'forum-cosmetics',
    },
    {
      id: 'forum.cosmetics.write',
      name: '뷰티 포럼 작성',
      description: '뷰티 포럼 게시글 작성 권한',
      category: 'forum-cosmetics',
    },
    {
      id: 'forum.cosmetics.manage',
      name: '뷰티 포럼 관리',
      description: '뷰티 포럼 관리 권한',
      category: 'forum-cosmetics',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'forum-cosmetics',
        label: '뷰티 포럼',
        icon: 'sparkles',
        order: 26,
        parent: 'forum',
        children: [
          {
            id: 'forum-cosmetics-dashboard',
            label: '대시보드',
            path: '/admin/forum/cosmetics',
            icon: 'layout-dashboard',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['CosmeticsForumService'],
    types: ['CosmeticsForumMeta', 'CosmeticsSkinType', 'CosmeticsConcern'],
    events: ['cosmetics.post.created', 'cosmetics.review.created'],
  },

  // ===== CPT 확장 =====
  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'cosmetics_meta',
    },
  ],

  // ===== ACF 정의 =====
  acf: [
    {
      groupId: 'cosmetics_meta',
      label: 'Cosmetics Metadata',
      fields: [
        {
          key: 'skinType',
          type: 'select',
          label: '피부 타입',
          options: ['건성', '지성', '복합성', '민감성', '중성'],
        },
        {
          key: 'concerns',
          type: 'multiselect',
          label: '피부 고민',
          options: ['모공', '미백', '주름', '탄력', '여드름', '홍조', '각질', '잡티', '다크서클'],
        },
        {
          key: 'brand',
          type: 'text',
          label: '브랜드',
        },
        {
          key: 'productId',
          type: 'text',
          label: '제품 ID',
        },
        {
          key: 'rating',
          type: 'number',
          label: '평점',
          min: 1,
          max: 5,
        },
        {
          key: 'ingredients',
          type: 'multiselect',
          label: '주요 성분',
          options: ['레티놀', '비타민C', '나이아신아마이드', '히알루론산', 'AHA', 'BHA', '세라마이드', '펩타이드', '콜라겐'],
        },
      ],
    },
  ],

  // ===== 기본 설정 =====
  defaultConfig: {
    categories: [
      { name: '제품 리뷰', slug: 'product-reviews', color: '#EC4899' },
      { name: '스킨케어 루틴', slug: 'skincare-routine', color: '#F472B6' },
      { name: '성분 분석', slug: 'ingredient-analysis', color: '#F9A8D4' },
      { name: '피부 고민 상담', slug: 'skin-concerns', color: '#FBCFE8' },
      { name: '브랜드 추천', slug: 'brand-recommendations', color: '#FDF2F8' },
    ],
    skin: 'cosmetics',
    brandColor: '#EC4899',
    accentColor: '#F472B6',
    requireApproval: false,
  },
};

// Legacy export for backward compatibility
export const manifest = forumCosmeticsManifest;
export default forumCosmeticsManifest;
