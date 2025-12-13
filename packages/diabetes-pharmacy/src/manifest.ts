/**
 * diabetes-pharmacy Manifest
 *
 * 혈당관리 세미프랜차이즈 약국 운영 실행 App
 * DiabetesCare Core 기반 Extension App
 *
 * @package @o4o/diabetes-pharmacy
 */

export const diabetesPharmacyManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'diabetes-pharmacy',
  name: 'DiabetesCare Pharmacy',
  displayName: '혈당관리 약국',
  version: '0.1.0',
  type: 'extension' as const,
  description: '혈당관리 세미프랜차이즈 약국 운영 실행 App - Pattern 결과를 Action으로 전환',

  // ===== 의존성 =====
  dependencies: {
    core: ['diabetes-core'],
    optional: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'diabetes_pharmacy_actions',
    'diabetes_pharmacy_settings',
  ],

  // ===== 권한 =====
  permissions: [
    'diabetes-pharmacy.read',
    'diabetes-pharmacy.write',
    'diabetes-pharmacy.actions.manage',
    'diabetes-pharmacy.dashboard.view',
  ],

  // ===== Lifecycle =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== Features =====
  features: [
    'diabetes-dashboard',
    'action-management',
    'pattern-to-action-mapping',
  ],

  // ===== Configuration =====
  config: {
    enableNotifications: {
      type: 'boolean',
      default: true,
      description: '약국 알림 활성화',
    },
    dashboardRefreshInterval: {
      type: 'number',
      default: 60000,
      description: '대시보드 자동 갱신 주기 (ms)',
    },
  },

  // ===== Events =====
  events: [
    'diabetes-pharmacy.action.selected',
    'diabetes-pharmacy.action.executed',
    'diabetes-pharmacy.dashboard.viewed',
  ],

  // ===== Subscribed Events (from diabetes-core) =====
  subscribedEvents: [
    'diabetes-core.pattern.detected',
    'diabetes-core.report.generated',
    'diabetes-core.coaching.session.created',
  ],

  // ===== API Routes =====
  apiRoutes: [
    '/api/v1/diabetes-pharmacy/dashboard',
    '/api/v1/diabetes-pharmacy/actions',
  ],

  // ===== Frontend Routes =====
  frontendRoutes: [
    '/diabetes-pharmacy',
    '/diabetes-pharmacy/dashboard',
    '/diabetes-pharmacy/actions',
  ],

  // ===== Navigation Menus =====
  navigation: {
    menus: [
      {
        id: 'diabetes-pharmacy-main',
        label: '혈당관리',
        path: '/diabetes-pharmacy',
        icon: 'glucose',
        children: [
          {
            id: 'diabetes-pharmacy-dashboard',
            label: '대시보드',
            path: '/diabetes-pharmacy/dashboard',
            icon: 'dashboard',
          },
          {
            id: 'diabetes-pharmacy-actions',
            label: '실행(Action)',
            path: '/diabetes-pharmacy/actions',
            icon: 'play_arrow',
          },
        ],
      },
    ],
    adminRoutes: [
      '/diabetes-pharmacy',
      '/diabetes-pharmacy/dashboard',
      '/diabetes-pharmacy/actions',
    ],
  },

  // ===== Backend =====
  backend: {
    entities: [],
    services: ['ActionService', 'PharmacyDiabetesService'],
    controllers: ['ActionController', 'DashboardController'],
    routesExport: 'createRoutes',
  },

  // ===== Exposes =====
  exposes: {
    services: ['ActionService', 'PharmacyDiabetesService'],
    types: ['ActionType', 'ActionDto', 'DashboardSummaryDto'],
    events: [
      'diabetes-pharmacy.action.selected',
      'diabetes-pharmacy.action.executed',
    ],
  },
};

export default diabetesPharmacyManifest;
