/**
 * yaksa-admin Extension App Manifest
 *
 * yaksa-admin Scope Fixation
 *
 * [Scope Included]
 * - Membership Approval (membership-yaksa)
 * - Reporting Review (reporting-yaksa)
 * - Officer Role Assign (organization-core + membership-yaksa)
 * - Education Status Overview (lms-yaksa, READ ONLY)
 * - Fee Payment Overview (annualfee-yaksa, READ ONLY)
 *
 * [Scope Excluded - DO NOT IMPLEMENT]
 * - Board / Announcement CRUD (use forum-yaksa)
 * - File Repository / DMS
 * - Accounting / Expense / Budget
 * - SMS / Message System
 * - CMS / Homepage Builder
 * - KPA Direct Integration
 *
 * === 이 주석은 삭제/수정 금지 ===
 * === Phase 1 이후 모든 구현은 이 주석을 기준으로 판단 ===
 */

export const yaksaAdminManifest = {
  // ===== 필수 기본 정보 =====
  id: 'yaksa-admin',
  appId: 'yaksa-admin',
  displayName: '지부/분회 관리자 센터',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '지부/분회 관리자를 위한 관제 센터 - 승인 및 조회 전용',

  // ===== 대상 사용자 =====
  targetUsers: ['division_admin', 'branch_admin'],

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    extensions: [
      'membership-yaksa',
      'forum-yaksa', // 링크용
    ],
    optional: [
      'reporting-yaksa',
      'lms-yaksa',
      'annualfee-yaksa',
    ],
  },

  // ===== Phase 0: 소유 테이블 없음 =====
  // yaksa-admin은 데이터를 생성하지 않는다.
  // 다른 서비스의 데이터를 조회/승인만 한다.
  ownsTables: [],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'safe' as const,
    allowPurge: false,
    autoBackup: false,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [],
    services: [],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        // Phase 0: 스켈레톤만 정의, 실제 구현은 Phase 1+
        { path: '/admin/yaksa', component: 'YaksaAdminDashboard' },
        { path: '/admin/yaksa/members', component: 'MemberApprovalPage' },
        { path: '/admin/yaksa/reports', component: 'ReportReviewPage' },
        { path: '/admin/yaksa/officers', component: 'OfficerManagePage' },
        { path: '/admin/yaksa/education', component: 'EducationOverviewPage' },
        { path: '/admin/yaksa/fees', component: 'FeeOverviewPage' },
        { path: '/admin/yaksa/forum', component: 'ForumLinkPage' },
      ],
    },
  },

  // ===== 라이프사이클 =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
  },

  // ===== 권한 정의 =====
  permissions: [
    {
      id: 'yaksa-admin.access',
      name: '관리자 센터 접근',
      description: '지부/분회 관리자 센터에 접근할 수 있는 권한',
      category: 'yaksa-admin',
      scopes: ['division', 'branch'],
    },
    {
      id: 'yaksa-admin.members.approve',
      name: '회원 승인',
      description: '신규 회원 가입 승인 권한',
      category: 'yaksa-admin',
      scopes: ['division', 'branch'],
    },
    {
      id: 'yaksa-admin.reports.review',
      name: '신상신고 검토',
      description: '신상신고 내용 검토 및 승인 권한',
      category: 'yaksa-admin',
      scopes: ['division', 'branch'],
    },
    {
      id: 'yaksa-admin.officers.assign',
      name: '임원 관리',
      description: '임원 역할 할당 권한',
      category: 'yaksa-admin',
      scopes: ['division', 'branch'],
    },
    {
      id: 'yaksa-admin.education.view',
      name: '교육 현황 조회',
      description: '소속 회원 교육 이수 현황 조회 (READ ONLY)',
      category: 'yaksa-admin',
      scopes: ['division', 'branch'],
    },
    {
      id: 'yaksa-admin.fees.view',
      name: '회비 현황 조회',
      description: '소속 회원 회비 납부 현황 조회 (READ ONLY)',
      category: 'yaksa-admin',
      scopes: ['division', 'branch'],
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'yaksa-admin',
        label: '지부/분회 관리',
        icon: 'building-2',
        order: 20,
        children: [
          {
            id: 'members',
            label: '회원 승인/현황',
            path: '/admin/yaksa/members',
            icon: 'user-check',
          },
          {
            id: 'reports',
            label: '신상신고 승인',
            path: '/admin/yaksa/reports',
            icon: 'file-check',
          },
          {
            id: 'officers',
            label: '임원 관리',
            path: '/admin/yaksa/officers',
            icon: 'users',
          },
          {
            id: 'education',
            label: '교육 이수 현황',
            path: '/admin/yaksa/education',
            icon: 'graduation-cap',
          },
          {
            id: 'fees',
            label: '회비 납부 현황',
            path: '/admin/yaksa/fees',
            icon: 'credit-card',
          },
          {
            id: 'forum',
            label: '커뮤니티 바로가기',
            path: '/admin/yaksa/forum',
            icon: 'external-link',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: [],
    types: [],
    events: [],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    enableMemberApproval: true,
    enableReportReview: true,
    enableOfficerManagement: true,
    educationViewOnly: true,
    feeViewOnly: true,
  },
};

// Legacy export for backward compatibility
export const manifest = yaksaAdminManifest;
export default yaksaAdminManifest;
