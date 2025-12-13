/**
 * yaksa-scheduler Manifest
 * Phase 19-A: Central Scheduler Infrastructure for Yaksa Services
 *
 * Provides:
 * - Cron-based job scheduling
 * - Job execution logging
 * - Failure queue with retry logic
 * - Admin API for job management
 */

export const yaksaSchedulerManifest = {
  // ===== 필수 기본 정보 =====
  id: 'yaksa-scheduler', // ModuleLoader compatibility
  appId: 'yaksa-scheduler',
  displayName: 'Yaksa Scheduler',
  name: 'Yaksa Scheduler',
  version: '0.1.0',
  type: 'extension' as const,
  appType: 'extension' as const, // Legacy compatibility
  category: 'infrastructure' as const,
  description: 'Central scheduler infrastructure for Yaksa service automation',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'scheduled_jobs',
    'job_execution_logs',
    'job_failure_queue',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== CMS (CPT/ACF/ViewTemplates) =====
  cms: {
    cpt: [],
    acf: [],
    viewTemplates: [
      {
        id: 'scheduler-dashboard',
        name: 'Scheduler 대시보드',
        component: 'SchedulerDashboard',
        type: 'admin',
      },
      {
        id: 'scheduler-job-list',
        name: '작업 목록',
        component: 'ScheduledJobList',
        type: 'admin',
      },
      {
        id: 'scheduler-failure-queue',
        name: '실패 큐',
        component: 'FailureQueueList',
        type: 'admin',
      },
    ],
  },

  // ===== 백엔드 =====
  backend: {
    entities: [
      './backend/entities/ScheduledJob',
      './backend/entities/JobExecutionLog',
      './backend/entities/JobFailureQueue',
    ],
    services: [
      'SchedulerService',
      'JobMonitorService',
    ],
    controllers: [
      'SchedulerController',
    ],
    routesExport: 'createRoutes',
    routePrefix: '/api/v1/yaksa-scheduler',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/yaksa-scheduler', component: 'SchedulerDashboard' },
        { path: '/admin/yaksa-scheduler/jobs', component: 'ScheduledJobList' },
        { path: '/admin/yaksa-scheduler/failures', component: 'FailureQueueList' },
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
      id: 'yaksa-scheduler.job.read',
      name: '스케줄 작업 조회',
      description: '스케줄 작업을 조회할 수 있는 권한',
      category: 'yaksa-scheduler',
    },
    {
      id: 'yaksa-scheduler.job.manage',
      name: '스케줄 작업 관리',
      description: '스케줄 작업을 생성/수정/삭제할 수 있는 권한',
      category: 'yaksa-scheduler',
    },
    {
      id: 'yaksa-scheduler.job.trigger',
      name: '작업 수동 실행',
      description: '스케줄 작업을 수동으로 실행할 수 있는 권한',
      category: 'yaksa-scheduler',
    },
    {
      id: 'yaksa-scheduler.failure.manage',
      name: '실패 큐 관리',
      description: '실패 큐를 관리하고 재시도할 수 있는 권한',
      category: 'yaksa-scheduler',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'yaksa-scheduler',
        label: 'Scheduler',
        icon: 'clock',
        order: 90,
        children: [
          {
            id: 'scheduler-dashboard',
            label: '대시보드',
            path: '/admin/yaksa-scheduler',
            icon: 'chart-bar',
          },
          {
            id: 'scheduler-jobs',
            label: '작업 목록',
            path: '/admin/yaksa-scheduler/jobs',
            icon: 'clipboard-list',
            permission: 'yaksa-scheduler.job.read',
          },
          {
            id: 'scheduler-failures',
            label: '실패 큐',
            path: '/admin/yaksa-scheduler/failures',
            icon: 'exclamation-triangle',
            permission: 'yaksa-scheduler.failure.manage',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    entities: [
      'ScheduledJob',
      'JobExecutionLog',
      'JobFailureQueue',
    ],
    services: [
      'SchedulerService',
      'JobMonitorService',
    ],
    types: [
      'ScheduledJob',
      'JobExecutionLog',
      'JobFailureQueue',
      'JobStatus',
      'JobTargetService',
      'JobActionType',
      'ExecutionResult',
      'FailureQueueStatus',
    ],
    events: [
      'yaksa-scheduler.job.started',
      'yaksa-scheduler.job.completed',
      'yaksa-scheduler.job.failed',
      'yaksa-scheduler.retry.succeeded',
      'yaksa-scheduler.retry.exhausted',
    ],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    // 기본 재시도 횟수
    defaultMaxRetries: 3,
    // 재시도 기본 딜레이 (분)
    defaultRetryDelayMinutes: 5,
    // 실패 큐 처리 간격 (분)
    retryQueueIntervalMinutes: 5,
    // 로그 보존 기간 (일)
    logRetentionDays: 90,
  },
};

export const manifest = yaksaSchedulerManifest;
export default yaksaSchedulerManifest;
