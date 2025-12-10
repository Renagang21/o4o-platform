/**
 * Organization-LMS Integration Extension Manifest
 *
 * Integrates organization-core with lms-core for organization-scoped training
 */

export const organizationLmsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'organization-lms',
  displayName: '조직-LMS 연동',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '조직별 LMS 연동 (조직 스코프 교육, 수료증 관리)',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core', 'lms-core'],
    optional: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // ===== 백엔드 =====
  backend: {
    entities: [],
    services: ['OrganizationLmsService'],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== 라이프사이클 =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== 권한 정의 =====
  permissions: [],

  // ===== 메뉴 정의 =====
  menus: {},

  // ===== 외부 노출 =====
  exposes: {
    services: ['OrganizationLmsService'],
    types: [],
    events: ['organization.lms.course.assigned'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    autoAssignCourses: false,
    requireOrganizationApproval: true,
  },
};

// Legacy export for backward compatibility
export const manifest = organizationLmsManifest;
export default organizationLmsManifest;
