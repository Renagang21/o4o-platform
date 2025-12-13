/**
 * Reporting-Yaksa Extension App Manifest
 *
 * Extends organization-core/membership-yaksa with annual reporting features:
 * - Annual status report submission/management
 * - Admin approval/rejection workflow
 * - Membership-Yaksa auto-sync
 * - Audit log preservation
 */

export const reportingYaksaManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'reporting-yaksa',
  displayName: '신상신고 시스템',
  name: 'Reporting Yaksa Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const, // Legacy compatibility
  category: 'reporting' as const,
  description: '약사회 신상신고 시스템 (연간 신고서, 승인 워크플로우, 자동 동기화)',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core', 'membership-yaksa'],
    apps: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'yaksa_annual_reports',
    'yaksa_report_field_templates',
    'yaksa_report_logs',
    'yaksa_report_assignments',
    // RPA 연동 테이블 (forum-yaksa integration)
    'yaksa_rpa_reports',
    'yaksa_rpa_report_history',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true, // 신고서 데이터는 중요
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      './backend/entities/AnnualReport',
      './backend/entities/ReportFieldTemplate',
      './backend/entities/ReportLog',
      './backend/entities/ReportAssignment',
      // RPA 연동 엔티티 (forum-yaksa integration)
      './backend/entities/YaksaReport',
      './backend/entities/YaksaReportHistory',
    ],
    services: [
      'AnnualReportService',
      'ReportTemplateService',
      'MembershipSyncService',
      // RPA 연동 서비스
      'YaksaReportService',
    ],
    controllers: [
      'AnnualReportController',
      'ReportTemplateController',
      // RPA 연동 컨트롤러
      'YaksaReportController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/reporting', component: 'ReportingDashboard' },
        { path: '/admin/reporting/reports', component: 'ReportList' },
        { path: '/admin/reporting/reports/:id', component: 'ReportDetail' },
        { path: '/admin/reporting/templates', component: 'TemplateList' },
        { path: '/admin/reporting/templates/:id', component: 'TemplateEditor' },
      ],
    },
    member: {
      pages: [
        { path: '/member/reporting', component: 'MyReportPage' },
        { path: '/member/reporting/new', component: 'ReportForm' },
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

  // ===== 메뉴 정의 =====
  menus: {
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
        order: 20,
      },
    ],
  },

  // ===== 외부 노출 (다른 앱에서 사용 가능) =====
  exposes: {
    services: ['AnnualReportService', 'MembershipSyncService'],
    types: ['AnnualReport', 'ReportFieldTemplate', 'ReportStatus'],
    events: ['report.submitted', 'report.approved', 'report.rejected', 'report.synced'],
  },

  // ===== 기본 설정 =====
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
};

export default reportingYaksaManifest;
