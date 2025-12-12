/**
 * Cosmetics Sample & Display Extension Manifest
 *
 * 샘플/테스터, 진열(Display), 전환율 관리 확장앱
 * Seller Extension + Supplier Extension을 연결하는 핵심 운영 계층
 */

export interface ExtensionManifest {
  id: string;
  namespace: string;
  version: string;
  type: 'extension';
  displayName: string;
  description: string;
  dependsOn: string[];
  adminMenu: Array<{
    label: string;
    path: string;
    icon?: string;
  }>;
  backend: {
    entities: string[];
    services: string[];
    routes: {
      prefix: string;
      controller: string;
    }[];
  };
  permissions: string[];
  lifecycle: {
    install: string;
    activate: string;
    deactivate: string;
    uninstall: string;
  };
}

export const manifest: ExtensionManifest = {
  id: 'cosmetics-sample-display-extension',
  namespace: 'cosmetics-sample-display',
  version: '1.0.0',
  type: 'extension',
  displayName: 'Cosmetics Sample & Display Extension',
  description: '샘플/테스터, 진열(Display), 전환율 관리 확장앱 - Seller와 Supplier를 연결하는 핵심 운영 모듈',

  dependsOn: [
    'cosmetics-seller-extension',
    'cosmetics-supplier-extension',
    'dropshipping-cosmetics',
  ],

  adminMenu: [
    {
      label: 'Sample Dashboard',
      path: '/cosmetics-sample/dashboard',
      icon: 'Beaker',
    },
    {
      label: 'Sample Tracking',
      path: '/cosmetics-sample/tracking',
      icon: 'Package',
    },
    {
      label: 'Display Management',
      path: '/cosmetics-sample/display',
      icon: 'Layout',
    },
    {
      label: 'Conversion Analytics',
      path: '/cosmetics-sample/analytics',
      icon: 'TrendingUp',
    },
  ],

  backend: {
    entities: [
      'SampleInventory',
      'SampleUsageLog',
      'DisplayLayout',
      'SampleConversion',
    ],
    services: [
      'SampleInventoryService',
      'SampleUsageService',
      'DisplayService',
      'SampleConversionService',
    ],
    routes: [
      { prefix: '/api/v1/cosmetics-sample/inventory', controller: 'SampleInventoryController' },
      { prefix: '/api/v1/cosmetics-sample/usage', controller: 'SampleUsageController' },
      { prefix: '/api/v1/cosmetics-sample/display', controller: 'DisplayController' },
      { prefix: '/api/v1/cosmetics-sample/analytics', controller: 'AnalyticsController' },
    ],
  },

  permissions: [
    'cosmetics-sample:read',
    'cosmetics-sample:write',
    'cosmetics-sample:inventory:manage',
    'cosmetics-sample:usage:record',
    'cosmetics-sample:display:manage',
    'cosmetics-sample:analytics:view',
  ],

  lifecycle: {
    install: 'dist/backend/lifecycle/install.js',
    activate: 'dist/backend/lifecycle/activate.js',
    deactivate: 'dist/backend/lifecycle/deactivate.js',
    uninstall: 'dist/backend/lifecycle/uninstall.js',
  },
};

export default manifest;
