/**
 * LMS-Core Manifest
 *
 * Learning Management System core engine:
 * - Course and lesson management
 * - Enrollment and progress tracking
 * - Certificate issuance
 * - Event scheduling and attendance
 */

export const lmsCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'lms-core',
  displayName: 'LMS 엔진',
  name: 'LMS Core',
  version: '1.0.0',
  type: 'core' as const,
  appType: 'core' as const, // Legacy compatibility
  category: 'education' as const,
  description: 'Learning Management System 핵심 엔진 - 과정/레슨/등록/진도/수료증/출석',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    apps: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'lms_courses',
    'lms_lessons',
    'lms_enrollments',
    'lms_progress',
    'lms_certificates',
    'lms_events',
    'lms_attendance',
    'lms_quizzes',
    'lms_quiz_attempts',
    'lms_surveys',
    'lms_survey_questions',
    'lms_survey_responses',
    'lms_engagement_logs',
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
      './entities/Course',
      './entities/Lesson',
      './entities/Enrollment',
      './entities/Progress',
      './entities/Certificate',
      './entities/LMSEvent',
      './entities/Attendance',
      './entities/Quiz',
      './entities/QuizAttempt',
      './entities/Survey',
      './entities/SurveyQuestion',
      './entities/SurveyResponse',
      './entities/EngagementLog',
    ],
    services: [
      'CourseService',
      'LessonService',
      'EnrollmentService',
      'ProgressService',
      'CertificateService',
      'EventService',
      'AttendanceService',
      'QuizService',
      'SurveyService',
      'EngagementLoggingService',
    ],
    controllers: [
      'CourseController',
      'EnrollmentController',
      'CertificateController',
      'QuizController',
      'SurveyController',
      'EngagementLogController',
    ],
    routesExport: 'createRoutes',
    hooksExport: 'createHooks',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/lms', component: 'LmsDashboard' },
        { path: '/admin/lms/courses', component: 'CourseList' },
        { path: '/admin/lms/courses/:id', component: 'CourseDetail' },
        { path: '/admin/lms/courses/:id/edit', component: 'CourseEdit' },
        { path: '/admin/lms/enrollments', component: 'EnrollmentList' },
        { path: '/admin/lms/certificates', component: 'CertificateList' },
        { path: '/admin/lms/events', component: 'EventList' },
      ],
    },
    member: {
      pages: [
        { path: '/lms', component: 'MyLearning' },
        { path: '/lms/courses', component: 'CoursesCatalog' },
        { path: '/lms/courses/:id', component: 'CourseViewer' },
        { path: '/lms/certificates', component: 'MyCertificates' },
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
      id: 'lms.read',
      name: 'LMS 읽기',
      description: '과정/레슨 조회 권한',
      category: 'lms',
    },
    {
      id: 'lms.write',
      name: 'LMS 쓰기',
      description: '과정/레슨 생성/수정 권한',
      category: 'lms',
    },
    {
      id: 'lms.manage',
      name: 'LMS 관리',
      description: 'LMS 전체 관리 권한',
      category: 'lms',
    },
    {
      id: 'lms.instructor',
      name: '강사 역할',
      description: '강의 진행 및 출석 관리 권한',
      category: 'lms',
    },
    {
      id: 'lms.admin',
      name: 'LMS 관리자',
      description: '수료증 발급 및 설정 관리 권한',
      category: 'lms',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'lms',
        label: 'LMS',
        icon: 'graduation-cap',
        order: 40,
        children: [
          {
            id: 'lms-dashboard',
            label: '대시보드',
            path: '/admin/lms',
            icon: 'layout-dashboard',
          },
          {
            id: 'lms-courses',
            label: '과정 관리',
            path: '/admin/lms/courses',
            icon: 'book-open',
          },
          {
            id: 'lms-enrollments',
            label: '등록 관리',
            path: '/admin/lms/enrollments',
            icon: 'users',
          },
          {
            id: 'lms-certificates',
            label: '수료증',
            path: '/admin/lms/certificates',
            icon: 'award',
          },
          {
            id: 'lms-events',
            label: '교육 일정',
            path: '/admin/lms/events',
            icon: 'calendar',
          },
        ],
      },
    ],
    member: [
      {
        id: 'my-learning',
        label: '내 학습',
        icon: 'book',
        order: 10,
        children: [
          {
            id: 'my-courses',
            label: '수강 중인 과정',
            path: '/lms',
            icon: 'play-circle',
          },
          {
            id: 'my-certificates',
            label: '수료증',
            path: '/lms/certificates',
            icon: 'award',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: [
      'CourseService',
      'LessonService',
      'EnrollmentService',
      'ProgressService',
      'CertificateService',
      'QuizService',
      'SurveyService',
      'EngagementLoggingService',
    ],
    types: [
      'Course',
      'Lesson',
      'Enrollment',
      'Progress',
      'Certificate',
      'Quiz',
      'QuizAttempt',
      'Survey',
      'SurveyQuestion',
      'SurveyResponse',
      'EngagementLog',
    ],
    events: [
      'course.created',
      'course.updated',
      'enrollment.created',
      'progress.updated',
      'certificate.issued',
      'event.scheduled',
      'attendance.recorded',
      'quiz.created',
      'quiz.published',
      'quiz.attempt.completed',
      'survey.created',
      'survey.published',
      'survey.response.completed',
      'engagement.view',
      'engagement.click',
      'engagement.reaction',
      'engagement.quiz-submit',
      'engagement.survey-submit',
      'engagement.acknowledge',
      'engagement.complete',
    ],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    enableCertificates: true,
    defaultCourseDuration: 60,
    requireEnrollmentApproval: false,
    maxConcurrentEnrollments: 10,
  },
};

// Legacy export for backward compatibility
export const manifest = lmsCoreManifest;
export default lmsCoreManifest;
