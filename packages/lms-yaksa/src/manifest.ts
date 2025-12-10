/**
 * LMS-Yaksa Extension App Manifest
 *
 * Extends lms-core with Yaksa organization-specific features:
 * - 면허/자격 정보 관리 (License Profile)
 * - 필수 연수교육 정책 (Required Course Policy)
 * - 연수 평점 기록 (Credit Records)
 * - 강좌 배정 관리 (Course Assignment)
 */

export const lmsYaksaManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'lms-yaksa',
  displayName: '약사회 교육/연수',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '약사회 보수교육 및 연수 시스템 (교육 이수, 이수증 발급, 교육 이력 관리)',

  // ===== 의존성 =====
  dependencies: {
    core: ['lms-core', 'organization-core'],
    optional: ['membership-yaksa'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'lms_yaksa_license_profiles',       // 면허/자격 프로필
    'lms_yaksa_required_course_policies', // 필수 교육 정책
    'lms_yaksa_credit_records',          // 연수 평점 기록
    'lms_yaksa_course_assignments',      // 강좌 배정
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== CMS (CPT/ACF/ViewTemplates) =====
  cms: {
    // lms-yaksa는 독자 CPT 없이 lms-core의 Course를 확장 사용
    cpt: [],
    // ACF 필드 그룹 (향후 확장 시 추가)
    acf: [],
    // View Templates
    viewTemplates: [
      {
        id: 'lms-yaksa-dashboard',
        name: '약사 LMS 대시보드',
        component: 'LmsYaksaDashboard',
        type: 'admin',
      },
      {
        id: 'lms-yaksa-license-list',
        name: '면허 목록',
        component: 'LicenseProfileList',
        type: 'admin',
      },
      {
        id: 'lms-yaksa-policy-list',
        name: '필수 교육 정책 목록',
        component: 'RequiredCoursePolicyList',
        type: 'admin',
      },
      {
        id: 'lms-yaksa-credit-list',
        name: '평점 기록 목록',
        component: 'CreditRecordList',
        type: 'admin',
      },
      {
        id: 'lms-yaksa-assignment-list',
        name: '강좌 배정 목록',
        component: 'CourseAssignmentList',
        type: 'admin',
      },
      {
        id: 'lms-yaksa-my-education',
        name: '내 교육 현황',
        component: 'MyEducationPage',
        type: 'member',
      },
    ],
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      'YaksaLicenseProfile',
      'RequiredCoursePolicy',
      'CreditRecord',
      'YaksaCourseAssignment',
    ],
    services: [
      'LicenseProfileService',
      'RequiredCoursePolicyService',
      'CreditRecordService',
      'CourseAssignmentService',
    ],
    controllers: [
      'LicenseProfileController',
      'RequiredCoursePolicyController',
      'CreditRecordController',
      'CourseAssignmentController',
      'YaksaLmsAdminController',
    ],
    routesExport: 'createRoutes',
    routePrefix: '/lms/yaksa',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/lms-yaksa', component: 'LmsYaksaDashboard' },
        { path: '/admin/lms-yaksa/policies', component: 'RequiredCoursePolicyList' },
        { path: '/admin/lms-yaksa/credits', component: 'CreditRecordList' },
        { path: '/admin/lms-yaksa/assignments', component: 'CourseAssignmentList' },
        { path: '/admin/lms-yaksa/licenses', component: 'LicenseProfileList' },
      ],
    },
    member: {
      pages: [
        { path: '/member/education', component: 'MyEducationPage' },
        { path: '/member/education/credits', component: 'MyCreditHistory' },
        { path: '/member/education/assignments', component: 'MyAssignments' },
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
      id: 'lms-yaksa.license.read',
      name: '면허 정보 조회',
      description: '약사 면허 정보를 조회할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.license.manage',
      name: '면허 정보 관리',
      description: '약사 면허 정보를 관리할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.policy.read',
      name: '필수 교육 정책 조회',
      description: '필수 교육 정책을 조회할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.policy.manage',
      name: '필수 교육 정책 관리',
      description: '필수 교육 정책을 관리할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.credit.read',
      name: '교육 평점 조회',
      description: '보수교육 평점을 조회할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.credit.manage',
      name: '교육 평점 관리',
      description: '보수교육 평점을 관리할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.assignment.read',
      name: '강좌 배정 조회',
      description: '강좌 배정을 조회할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.assignment.manage',
      name: '강좌 배정 관리',
      description: '강좌 배정을 관리할 수 있는 권한',
      category: 'lms-yaksa',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'lms-yaksa',
        label: '교육/연수',
        icon: 'academic-cap',
        order: 40,
        children: [
          {
            id: 'lms-yaksa-dashboard',
            label: '대시보드',
            path: '/admin/lms-yaksa',
            icon: 'chart-bar',
          },
          {
            id: 'lms-yaksa-policies',
            label: '필수 교육 정책',
            path: '/admin/lms-yaksa/policies',
            icon: 'clipboard-list',
            permission: 'lms-yaksa.policy.read',
          },
          {
            id: 'lms-yaksa-credits',
            label: '평점 관리',
            path: '/admin/lms-yaksa/credits',
            icon: 'clipboard-check',
            permission: 'lms-yaksa.credit.manage',
          },
          {
            id: 'lms-yaksa-assignments',
            label: '강좌 배정',
            path: '/admin/lms-yaksa/assignments',
            icon: 'user-plus',
            permission: 'lms-yaksa.assignment.read',
          },
          {
            id: 'lms-yaksa-licenses',
            label: '면허 관리',
            path: '/admin/lms-yaksa/licenses',
            icon: 'identification',
            permission: 'lms-yaksa.license.manage',
          },
        ],
      },
    ],
    member: [
      {
        id: 'my-education',
        label: '교육/연수',
        icon: 'academic-cap',
        path: '/member/education',
        order: 30,
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    entities: [
      'YaksaLicenseProfile',
      'RequiredCoursePolicy',
      'CreditRecord',
      'YaksaCourseAssignment',
    ],
    services: [
      'LicenseProfileService',
      'RequiredCoursePolicyService',
      'CreditRecordService',
      'CourseAssignmentService',
    ],
    types: [
      'YaksaLicenseProfile',
      'RequiredCoursePolicy',
      'CreditRecord',
      'YaksaCourseAssignment',
      'CreditType',
      'AssignmentStatus',
    ],
    events: [
      'lms-yaksa.credit.earned',
      'lms-yaksa.assignment.completed',
      'lms-yaksa.license.verified',
    ],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    // 연간 필수 이수 평점
    requiredAnnualCredits: 8,

    // 이수증 자동 발급
    autoIssueCertificate: true,

    // 교육 이력 보존 기간 (년)
    historyRetentionYears: 10,

    // 과제 기본 만료 기간 (일)
    defaultAssignmentDueDays: 90,
  },
};

export default lmsYaksaManifest;
