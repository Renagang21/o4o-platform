/**
 * Cosmetics Sample & Display Extension Manifest
 *
 * 샘플/테스터, 진열(Display), 전환율 관리 확장앱
 * Seller Extension + Supplier Extension을 연결하는 핵심 운영 계층
 *
 * === 역할 ===
 * - 샘플 재고 관리 (Sample Inventory)
 * - 샘플 사용 로그 (Sample Usage Log)
 * - 진열 레이아웃 관리 (Display Layout)
 * - 샘플→구매 전환율 분석 (Sample Conversion Analytics)
 */

export interface ExtensionManifest {
  id: string;
  namespace: string;
  version: string;
  type: 'extension';
  displayName: string;
  description: string;
  dependsOn: string[];
  ownsTables: string[];
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

  /**
   * 소유 테이블
   * - cosmetics_sample_inventory: 샘플 재고 (SampleInventory Entity)
   * - cosmetics_sample_usage_logs: 샘플 사용 로그 (SampleUsageLog Entity)
   * - cosmetics_display_layouts: 진열 레이아웃 (DisplayLayout Entity)
   * - cosmetics_sample_conversion: 전환율 통계 (SampleConversion Entity)
   */
  ownsTables: [
    'cosmetics_sample_inventory',
    'cosmetics_sample_usage_logs',
    'cosmetics_display_layouts',
    'cosmetics_sample_conversion',
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
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
    uninstall: './lifecycle/uninstall',
  },
};

export default manifest;
