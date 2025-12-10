/**
 * Reporting-Yaksa Extension App Manifest
 *
 * 약사회 신상신고 앱
 *
 * - 연간 신상신고서 제출/관리
 * - 관리자 승인/반려 워크플로우
 * - Membership-Yaksa 자동 연동
 * - 감사 로그 보존
 */

export const reportingYaksaManifest = {
  // 기본 정보
  id: 'reporting-yaksa',
  appId: 'reporting-yaksa',
  name: 'Annual Reporting – Yaksa Organization',
  version: '1.0.0',
  type: 'extension' as const,
  description: '약사회 신상신고 시스템 (연간 신고서, 승인 워크플로우, 자동 동기화)',

  // 작성자 정보
  author: {
    name: 'O4O Platform',
    email: 'dev@o4o-platform.com',
    url: 'https://o4o-platform.com',
  },

  // 의존성
  dependencies: {
    'organization-core': '>=1.0.0',
    'membership-yaksa': '>=1.0.0',
  },

  // 소유 테이블
  ownsTables: [
    'yaksa_annual_reports',
    'yaksa_report_field_templates',
    'yaksa_report_logs',
    'yaksa_report_assignments',
  ],

  // 삭제 정책
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true, // 신고서 데이터는 중요
  },

  // 권한 정의
  permissions: [
    // 회원용 권한
    {
      id: 'reporting.my.read',
      name: '내 신고서 조회',
      description: '자신의 신상신고서를 조회할 수 있는 권한',
      category: 'reporting',
    },
    {
      id: 'reporting.my.write',
      name: '내 신고서 작성',
      description: '자신의 신상신고서를 작성/수정/제출할 수 있는 권한',
      category: 'reporting',
    },

    // 관리자용 권한
    {
      id: 'reporting.admin.read',
      name: '신고서 관리 조회',
      description: '조직 내 신상신고서를 조회할 수 있는 권한',
      category: 'reporting',
    },
    {
      id: 'reporting.admin.approve',
      name: '신고서 승인/반려',
      description: '신상신고서를 승인하거나 반려할 수 있는 권한',
      category: 'reporting',
    },
    {
      id: 'reporting.admin.sync',
      name: '회원정보 동기화',
      description: '승인된 신고서를 회원정보에 동기화할 수 있는 권한',
      category: 'reporting',
    },

    // 템플릿 관리 권한
    {
      id: 'reporting.template.read',
      name: '템플릿 조회',
      description: '신고서 템플릿을 조회할 수 있는 권한',
      category: 'reporting',
    },
    {
      id: 'reporting.template.manage',
      name: '템플릿 관리',
      description: '신고서 템플릿을 생성/수정/삭제할 수 있는 권한',
      category: 'reporting',
    },
  ],

  // 라이프사이클 훅
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // Admin UI 라우트
  adminRoutes: [
    {
      path: '/admin/reporting',
      component: './admin-ui/pages/ReportingDashboard.js',
    },
    {
      path: '/admin/reporting/reports',
      component: './admin-ui/pages/ReportList.js',
    },
    {
      path: '/admin/reporting/reports/:id',
      component: './admin-ui/pages/ReportDetail.js',
    },
    {
      path: '/admin/reporting/templates',
      component: './admin-ui/pages/TemplateList.js',
    },
    {
      path: '/admin/reporting/templates/:id',
      component: './admin-ui/pages/TemplateEditor.js',
    },
  ],

  // 메뉴 정의
  menu: {
    admin: [
      {
        id: 'reporting',
        label: '신상신고',
        icon: 'clipboard-document-list',
        order: 30,
        children: [
          {
            id: 'reporting-dashboard',
            label: '대시보드',
            path: '/admin/reporting',
            icon: 'chart-bar',
          },
          {
            id: 'reporting-list',
            label: '신고서 목록',
            path: '/admin/reporting/reports',
            icon: 'document-text',
          },
          {
            id: 'reporting-templates',
            label: '템플릿 관리',
            path: '/admin/reporting/templates',
            icon: 'document-duplicate',
            permission: 'reporting.template.manage',
          },
        ],
      },
    ],
    member: [
      {
        id: 'my-reporting',
        label: '신상신고',
        icon: 'clipboard-document',
        path: '/member/reporting',
      },
    ],
  },

  // 기본 설정
  defaultConfig: {
    // 자동 동기화 활성화
    autoSyncOnApprove: true,

    // 제출 마감일 알림 (일 전)
    deadlineReminderDays: [30, 14, 7, 3, 1],

    // 관리자 알림
    notifyAdminOnSubmit: true,

    // 회원 알림
    notifyMemberOnApprove: true,
    notifyMemberOnReject: true,

    // 다단계 승인 사용 여부
    useMultiLevelApproval: false,

    // 승인 체계: single | branch_district | branch_district_national
    approvalWorkflow: 'single',
  },

  // 이벤트 훅 (다른 앱과 연동)
  hooks: {
    // 승인 후 Membership-Yaksa 업데이트
    onReportApproved: {
      handler: './hooks/onReportApproved.js',
      async: true,
    },

    // 신고서 제출 시 알림
    onReportSubmitted: {
      handler: './hooks/onReportSubmitted.js',
      async: true,
    },
  },
};

export default reportingYaksaManifest;
