/**
 * Signage Pharmacy Extension Manifest
 *
 * 약국 디지털 사이니지 Extension App
 * - 콘텐츠 선택 (Content Selection)
 * - 플레이리스트 관리 (MediaList/Playlist Management)
 * - 간편 편성 (Simple Scheduling)
 * - 즉시 실행 (Quick Action)
 * - 디스플레이 상태 확인 (Display Status)
 *
 * Phase 2 MVP - 약국이 "지금 당장 쓸 수 있는" 최소 기능 세트
 */

export const signagePharmacyExtensionManifest = {
  // ===== 필수 기본 정보 =====
  id: 'signage-pharmacy-extension',
  appId: 'signage-pharmacy-extension',
  displayName: '약국 디지털 사이니지',
  name: 'Signage Pharmacy Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const,
  category: 'signage' as const,
  description: '약국 디지털 사이니지 - 콘텐츠 선택, 플레이리스트 관리, 편성, 즉시 실행',

  // Extension configuration
  extendsApp: 'digital-signage-core',

  // ===== 의존성 =====
  dependencies: {
    core: ['digital-signage-core'],
    apps: [],
  },

  // ===== 소유 테이블 (Phase 2에서는 없음 - Core 테이블만 사용) =====
  ownsTables: [],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // Routes (Contract를 통해 Core API 사용)
  routes: [
    '/api/v1/pharmacy-signage',
    '/api/v1/pharmacy-signage/*',
  ],

  // Permissions
  permissions: [
    'pharmacy-signage:view',
    'pharmacy-signage:manage_content',
    'pharmacy-signage:manage_playlists',
    'pharmacy-signage:manage_schedule',
    'pharmacy-signage:execute_actions',
    'pharmacy-signage:view_displays',
    'pharmacy-signage:admin',
  ],

  // Menu Configuration
  menus: {
    admin: [
      {
        label: '사이니지 대시보드',
        path: '/pharmacy-signage/dashboard',
        icon: 'LayoutDashboard',
      },
      {
        label: '콘텐츠 라이브러리',
        path: '/pharmacy-signage/content',
        icon: 'FolderOpen',
      },
      {
        label: '플레이리스트',
        path: '/pharmacy-signage/playlists',
        icon: 'ListVideo',
      },
      {
        label: '편성표',
        path: '/pharmacy-signage/schedule',
        icon: 'Calendar',
      },
      {
        label: '즉시 실행',
        path: '/pharmacy-signage/quick-action',
        icon: 'Play',
      },
    ],
    member: [],
  },

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  /**
   * Backend Configuration
   */
  backend: {
    entities: [],
    services: ['PharmacySignageService'],
    controllers: ['PharmacySignageController'],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: ['PharmacySignageService'],
    types: [
      'PharmacyContentDto',
      'PharmacyPlaylistDto',
      'PharmacyScheduleDto',
      'PharmacyQuickActionDto',
    ],
    events: [],
  },
};

// Named export for convenience
export { signagePharmacyExtensionManifest as manifest };

export default signagePharmacyExtensionManifest;
