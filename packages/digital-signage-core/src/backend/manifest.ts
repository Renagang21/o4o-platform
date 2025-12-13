/**
 * Digital Signage Core App Manifest
 *
 * Core signage engine providing:
 * - Media source management (URL/file-based)
 * - Media list composition
 * - Display device management
 * - Display slot configuration
 * - Schedule management
 * - Action execution tracking
 */

export const digitalSignageCoreManifest = {
  // ===== Basic Information =====
  appId: 'digital-signage-core',
  displayName: 'Digital Signage Core',
  version: '0.1.0',
  appType: 'core' as const,
  description: 'Digital Signage Core - Media, Display, Schedule, Action management',

  // ===== Dependencies =====
  dependencies: {
    core: ['platform-core', 'cms-core'],
    optional: [],
  },

  // ===== Owned Tables =====
  ownsTables: [
    'signage_media_source',
    'signage_media_list',
    'signage_media_list_item',
    'signage_display',
    'signage_display_slot',
    'signage_schedule',
    'signage_action_execution',
  ],

  // ===== Uninstall Policy =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== Backend =====
  backend: {
    entities: [
      'MediaSource',
      'MediaList',
      'MediaListItem',
      'Display',
      'DisplaySlot',
      'Schedule',
      'ActionExecution',
    ],
    services: [],
    controllers: [],
    routesExport: 'createRoutes',
  },

  // ===== Frontend =====
  frontend: {
    admin: {
      pages: [],
    },
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
      id: 'signage.media.view',
      name: 'Media 조회',
      description: 'Signage 미디어를 조회할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.media.manage',
      name: 'Media 관리',
      description: 'Signage 미디어를 생성/수정/삭제할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.display.view',
      name: 'Display 조회',
      description: 'Display를 조회할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.display.manage',
      name: 'Display 관리',
      description: 'Display를 생성/수정/삭제할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.schedule.view',
      name: 'Schedule 조회',
      description: 'Schedule을 조회할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.schedule.manage',
      name: 'Schedule 관리',
      description: 'Schedule을 생성/수정/삭제할 수 있는 권한',
      category: 'signage',
    },
  ],

  // ===== Menus =====
  menus: {
    admin: [
      {
        id: 'signage',
        label: 'Digital Signage',
        icon: 'monitor',
        order: 15,
        children: [],
      },
    ],
  },

  // ===== Exposes =====
  exposes: {
    services: [],
    types: ['MediaSource', 'MediaList', 'Display', 'Schedule', 'ActionExecution'],
    events: [],
  },

  // ===== View Templates =====
  viewTemplates: [],

  // ===== Navigation =====
  navigation: {
    admin: [
      {
        id: 'digital-signage-core.signage',
        label: 'Digital Signage',
        path: '/admin/signage',
        icon: 'monitor',
        order: 15,
      },
    ],
  },

  // ===== Default Config =====
  defaultConfig: {},
};

// Legacy export for backward compatibility
export const manifest = digitalSignageCoreManifest;
export default digitalSignageCoreManifest;
