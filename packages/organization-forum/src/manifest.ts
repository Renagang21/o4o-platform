/**
 * Organization-Forum Integration Extension Manifest
 *
 * Integrates organization-core with forum-app for organization-scoped forums
 */

export const organizationForumManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'organization-forum',
  displayName: '조직-포럼 연동',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '조직별 포럼 연동 (조직 생성 시 카테고리 자동 생성, 조직 스코프 권한)',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core', 'forum-core'],
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
    services: ['OrganizationForumService'],
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
    services: ['OrganizationForumService'],
    types: [],
    events: ['organization.forum.categories.created'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    autoCreateDefaultCategories: true,
    defaultCategories: ['공지사항', '자유게시판', '질문/답변', '자료실'],
  },
};

// Legacy export for backward compatibility
export const manifest = organizationForumManifest;
export default organizationForumManifest;
