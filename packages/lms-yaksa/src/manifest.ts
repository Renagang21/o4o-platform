/**
 * LMS-Yaksa Extension App Manifest
 *
 * Extends lms-core with Yaksa organization-specific features:
 * - 보수교육 (Continuing Education)
 * - 연수 프로그램 (Training Programs)
 * - 이수증 발급 (Certificate Issuance)
 * - 회원 교육 이력 관리
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
    'yaksa_education_credits',      // 보수교육 학점
    'yaksa_training_programs',      // 연수 프로그램
    'yaksa_education_history',      // 교육 이력
    'yaksa_certificate_templates',  // 이수증 템플릿
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
      'EducationCredit',
      'TrainingProgram',
      'EducationHistory',
      'CertificateTemplate',
    ],
    services: [
      'EducationCreditService',
      'TrainingProgramService',
      'CertificateService',
    ],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/lms-yaksa', component: 'LmsYaksaDashboard' },
        { path: '/admin/lms-yaksa/programs', component: 'TrainingProgramList' },
        { path: '/admin/lms-yaksa/credits', component: 'EducationCreditList' },
      ],
    },
    member: {
      pages: [
        { path: '/member/education', component: 'MyEducationPage' },
        { path: '/member/education/history', component: 'EducationHistoryPage' },
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
      id: 'lms-yaksa.credit.read',
      name: '교육 학점 조회',
      description: '보수교육 학점을 조회할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.credit.manage',
      name: '교육 학점 관리',
      description: '보수교육 학점을 관리할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.program.read',
      name: '연수 프로그램 조회',
      description: '연수 프로그램을 조회할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.program.manage',
      name: '연수 프로그램 관리',
      description: '연수 프로그램을 관리할 수 있는 권한',
      category: 'lms-yaksa',
    },
    {
      id: 'lms-yaksa.certificate.issue',
      name: '이수증 발급',
      description: '교육 이수증을 발급할 수 있는 권한',
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
            id: 'lms-yaksa-programs',
            label: '연수 프로그램',
            path: '/admin/lms-yaksa/programs',
            icon: 'book-open',
          },
          {
            id: 'lms-yaksa-credits',
            label: '학점 관리',
            path: '/admin/lms-yaksa/credits',
            icon: 'clipboard-check',
            permission: 'lms-yaksa.credit.manage',
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
    services: ['EducationCreditService', 'CertificateService'],
    types: ['EducationCredit', 'TrainingProgram', 'EducationHistory'],
    events: ['education.completed', 'certificate.issued'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    // 연간 필수 이수 학점
    requiredAnnualCredits: 8,

    // 이수증 자동 발급
    autoIssueCertificate: true,

    // 교육 이력 보존 기간 (년)
    historyRetentionYears: 10,
  },
};

export default lmsYaksaManifest;
