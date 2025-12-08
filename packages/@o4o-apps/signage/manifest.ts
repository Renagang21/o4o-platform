/**
 * Digital Signage App Manifest
 *
 * Professional digital signage system for displays, playlists, and scheduling
 * AppStore-compliant manifest format
 */
export const signageManifest = {
  // Basic identification
  id: 'signage',
  appId: 'signage',
  name: 'Digital Signage',
  version: '1.0.0',
  description: 'Professional digital signage system for displays, playlists, and scheduling',

  // App type and category
  type: 'standalone' as const,
  category: 'display',

  // Author information
  author: 'O4O Platform',
  license: 'MIT',

  // Dependencies
  dependencies: {},

  // Database tables (if any)
  ownsTables: [
    'signage_slides',
    'signage_devices',
    'signage_playlists',
    'signage_schedules',
    'signage_playback_logs',
  ],

  // Permissions
  permissions: [
    {
      id: 'signage.read',
      name: '디지털 사이니지 조회',
      description: '디지털 사이니지 콘텐츠를 조회할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.write',
      name: '디지털 사이니지 편집',
      description: '디지털 사이니지 콘텐츠를 생성/수정할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.manage',
      name: '디지털 사이니지 관리',
      description: '디지털 사이니지 시스템 전체를 관리할 수 있는 권한',
      category: 'signage',
    },
    {
      id: 'signage.device.manage',
      name: '디바이스 관리',
      description: '사이니지 디바이스를 관리할 수 있는 권한',
      category: 'signage',
    },
  ],

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // API routes
  routes: [
    '/api/v1/signage/slides',
    '/api/v1/signage/slides/:id',
    '/api/v1/signage/devices',
    '/api/v1/signage/devices/:id',
    '/api/v1/signage/playlists',
    '/api/v1/signage/playlists/:id',
    '/api/v1/signage/schedules',
    '/api/v1/signage/schedules/:id',
    '/api/v1/signage/playback',
  ],

  // Admin routes
  adminRoutes: [
    {
      path: '/admin/signage',
      label: '디지털 사이니지',
    },
    {
      path: '/admin/signage/slides',
      label: '슬라이드 관리',
    },
    {
      path: '/admin/signage/devices',
      label: '디바이스 관리',
    },
    {
      path: '/admin/signage/playlists',
      label: '재생목록',
    },
    {
      path: '/admin/signage/schedules',
      label: '스케줄 관리',
    },
  ],

  // Frontend routes
  publicRoutes: [
    {
      path: '/signage/player/:deviceId',
      template: 'signage-player',
      label: 'Signage Player',
    },
  ],

  // CPT definitions
  cpt: [],

  // ACF definitions
  acf: [],

  // Features
  features: [
    'slide-management',
    'device-management',
    'playlist-creation',
    'schedule-management',
    'playback-tracking',
    'multi-device-support',
  ],

  // Configuration
  config: {
    enableAutoPlay: {
      type: 'boolean',
      default: true,
      description: 'Enable automatic playback on device startup',
    },
    defaultTransition: {
      type: 'string',
      default: 'fade',
      description: 'Default transition effect between slides',
    },
    defaultDuration: {
      type: 'number',
      default: 10,
      description: 'Default slide duration in seconds',
    },
  },

  // Legacy fields (for backward compatibility)
  enabled: true,

  views: {
    'signage-dashboard': 'views/signage-dashboard.json',
    'signage-slides': 'views/signage-slides.json',
    'signage-devices': 'views/signage-devices.json',
    'signage-playlists': 'views/signage-playlists.json',
    'signage-schedule': 'views/signage-schedule.json',
    'signage-player': 'views/signage-player.json',
  },

  functions: {
    signageDashboard: 'functions/signageDashboard.ts',
    signageSlides: 'functions/signageSlides.ts',
    signageDevices: 'functions/signageDevices.ts',
    signagePlaylists: 'functions/signagePlaylists.ts',
    signageSchedule: 'functions/signageSchedule.ts',
    signagePlayback: 'functions/signagePlayback.ts',
  },

  ui: {
    SignageGrid: 'ui/SignageGrid.tsx',
    SlideCard: 'ui/SlideCard.tsx',
    DeviceCard: 'ui/DeviceCard.tsx',
    PlaylistCard: 'ui/PlaylistCard.tsx',
    ScheduleCard: 'ui/ScheduleCard.tsx',
    SignagePlayer: 'ui/SignagePlayer.tsx',
  },
};

export default signageManifest;
