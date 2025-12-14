/**
 * Platform-Core App Manifest
 *
 * Core platform services:
 * - App Registry (app installation/status tracking)
 * - Platform Settings (global configuration)
 * - Account Activities (user activity logging)
 *
 * @status FROZEN - Phase A/B complete (2025-12-14)
 * @note Foundation Core. Do not modify without Phase review.
 */

export const platformCoreManifest = {
  // ===== Required Basic Information =====
  id: 'platform-core',
  appId: 'platform-core',
  displayName: '플랫폼 코어',
  name: 'Platform Core Services',
  version: '1.0.0',
  type: 'core' as const,
  appType: 'core' as const,
  category: 'core' as const,
  description: '앱 레지스트리, 플랫폼 설정, 활동 로깅 등 핵심 플랫폼 서비스',

  // ===== Dependencies =====
  dependencies: {
    core: ['auth-core'], // Depends on auth-core for user references
    apps: [],
  },

  // ===== Owned Tables =====
  ownsTables: [
    'app_registry',
    'settings',
    'account_activities',
  ],

  // ===== Uninstall Policy =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: false, // Critical system tables - never purge
    autoBackup: true,
  },

  // ===== Backend =====
  backend: {
    entities: [],
    services: [],
    controllers: [],
    routesExport: 'createRoutes',
    routePrefix: '/api/v1/platform',
  },

  // ===== Lifecycle =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== Permissions =====
  permissions: [
    {
      id: 'platform.apps.view',
      name: '앱 목록 조회',
      description: '설치된 앱 목록 조회',
      category: 'platform',
    },
    {
      id: 'platform.apps.manage',
      name: '앱 관리',
      description: '앱 설치, 업데이트, 삭제',
      category: 'platform',
    },
    {
      id: 'platform.settings.view',
      name: '설정 조회',
      description: '플랫폼 설정 조회',
      category: 'platform',
    },
    {
      id: 'platform.settings.manage',
      name: '설정 관리',
      description: '플랫폼 설정 변경',
      category: 'platform',
    },
    {
      id: 'platform.activities.view',
      name: '활동 로그 조회',
      description: '사용자 활동 로그 조회',
      category: 'platform',
    },
  ],

  // ===== Admin Menus =====
  menus: {
    admin: [
      {
        id: 'platform-core',
        label: '플랫폼 관리',
        icon: 'settings',
        order: 90,
        children: [
          {
            id: 'platform-apps',
            label: '앱 관리',
            path: '/admin/apps',
            icon: 'grid',
            permission: 'platform.apps.view',
          },
          {
            id: 'platform-settings',
            label: '플랫폼 설정',
            path: '/admin/settings',
            icon: 'sliders',
            permission: 'platform.settings.view',
          },
          {
            id: 'platform-activities',
            label: '활동 로그',
            path: '/admin/activities',
            icon: 'activity',
            permission: 'platform.activities.view',
          },
        ],
      },
    ],
    member: [],
  },

  // ===== Exposes =====
  exposes: {
    entities: ['AppRegistry', 'Setting', 'AccountActivity'],
    services: ['AppRegistryService', 'SettingsService', 'ActivityLogService'],
    types: ['AppRegistry', 'Setting', 'AccountActivity', 'AppStatus'],
    events: [
      'platform.app.installed',
      'platform.app.activated',
      'platform.app.deactivated',
      'platform.app.uninstalled',
      'platform.settings.changed',
    ],
  },

  // ===== Default Config =====
  defaultConfig: {
    // Platform name
    platformName: 'O4O Platform',

    // Default language
    defaultLanguage: 'ko',

    // Activity log retention (days)
    activityLogRetentionDays: 90,

    // Enable analytics
    enableAnalytics: true,
  },
};

export default platformCoreManifest;
