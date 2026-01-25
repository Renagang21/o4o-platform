/**
 * Forum Pharmacy Extension App Manifest
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * 핵심 원칙:
 * - forum-core 수정 금지
 * - 약사 서비스의 맥락/접근/책임만 부여
 * - 점수/랭킹/알고리즘 구현 금지
 *
 * 이 포럼 확장은 "더 많은 말을 하게 하는 도구"가 아니라
 * "말의 책임을 분명히 하는 도구"다.
 */

export const forumPharmacyManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'forum-pharmacy',
  displayName: '약사 서비스 포럼',
  name: 'Forum Pharmacy Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const,
  category: 'community' as const,
  description: '약사 서비스 전용 포럼 확장 (맥락·접근·책임)',

  // ===== 의존성 =====
  dependencies: {
    core: ['forum-core'],
    apps: ['organization-core', 'membership-yaksa'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'pharmacy_forum_notification',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [],
    services: [
      'PharmacyForumService',
      'PharmacyNotificationService',
    ],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/forum/pharmacy', component: 'ForumPharmacyApp' },
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
      id: 'forum.pharmacy.view',
      name: '약사 포럼 조회',
      description: '약사 서비스 포럼 게시글 조회 권한',
      category: 'forum-pharmacy',
    },
    {
      id: 'forum.pharmacy.write',
      name: '약사 포럼 작성',
      description: '약사 서비스 포럼 게시글 작성 권한',
      category: 'forum-pharmacy',
    },
    {
      id: 'forum.pharmacy.manage',
      name: '약사 포럼 관리',
      description: '약사 서비스 포럼 관리 권한',
      category: 'forum-pharmacy',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'forum-pharmacy',
        label: '약사 포럼',
        icon: 'message-square',
        order: 26,
        parent: 'forum',
        children: [
          {
            id: 'forum-pharmacy-dashboard',
            label: '대시보드',
            path: '/admin/forum/pharmacy',
            icon: 'layout-dashboard',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['PharmacyForumService', 'PharmacyNotificationService'],
    types: [
      'PharmacyForumMeta',
      'PharmacyAuthorType',
      'PharmacyStatementScope',
      'PharmacyBoardType',
    ],
    events: [
      'pharmacy.post.created',
      'pharmacy.approval.requested',
      'pharmacy.approval.completed',
    ],
  },

  // ===== CPT 확장 =====
  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'pharmacy_context',
    },
  ],

  // ===== ACF 정의 =====
  acf: [
    {
      groupId: 'pharmacy_context',
      label: '약사 맥락 정보',
      fields: [
        {
          key: 'authorType',
          type: 'select',
          label: '작성자 유형',
          options: ['pharmacy_owner', 'pharmacy_employee', 'business_operator', 'general_user'],
        },
        {
          key: 'statementScope',
          type: 'select',
          label: '발언 범위',
          options: ['personal', 'professional', 'pharmacy_unit'],
        },
        {
          key: 'disclaimerType',
          type: 'select',
          label: '책임 고지',
          options: ['personal_opinion', 'not_official', 'professional_personal'],
        },
        {
          key: 'pharmacyId',
          type: 'string',
          label: '약국 ID',
        },
      ],
    },
  ],

  // ===== 기본 설정 =====
  defaultConfig: {
    categories: [
      { name: '약사 라운지', slug: 'pharmacist-lounge', color: '#3B82F6' },
      { name: '복약지도 공유', slug: 'medication-guidance', color: '#10B981' },
      { name: '약국 운영 Q&A', slug: 'pharmacy-operation-qa', color: '#8B5CF6' },
      { name: '공지사항', slug: 'announcements', color: '#EF4444' },
    ],
    skin: 'pharmacy',
    brandColor: '#1E40AF',
    accentColor: '#3B82F6',
    requireApproval: false,
    // 명시적 비활성화 (v1 금지 항목)
    disabledFeatures: {
      activityScore: true,
      ranking: true,
      popularPosts: true,
      algorithmicFeed: true,
      likeDislikeCompetition: true,
    },
  },

  // ===== v1 제약 사항 (문서화) =====
  v1Constraints: {
    description: 'WO-KPA-FORUM-PHARMACY-EXT-V1 제약 사항',
    mustNot: [
      '활동 점수 / 레벨 / 랭킹',
      '추천/비추천 경쟁 구조',
      '인기글 / 알고리즘 노출',
      '유료 접근 조건',
      '참여 압박 UX',
      'forum-core 엔티티/권한/구조 수정',
    ],
    must: [
      '작성자 유형 표시 (개설/근무/사업자/일반)',
      '발언 범위 구분 (개인/전문/약국)',
      '책임 고지 표시',
      '약사/약국/조직 단위 게시판',
      '승인 요청/멘션/활동 알림',
    ],
  },
};

// Legacy export for backward compatibility
export const manifest = forumPharmacyManifest;
export default forumPharmacyManifest;
