/**
 * Groupbuy-Yaksa Manifest
 *
 * 지부/분회 주도의 공동구매 Extension
 * Phase 2: Operational Flow Completion
 */

export const manifest = {
  id: 'groupbuy-yaksa',
  name: '공동구매 관리',
  version: '1.1.0',
  description: '지부/분회 주도의 공동구매 캠페인 및 상품 관리',

  type: 'extension' as const,

  category: 'commerce',

  targetServices: ['yaksa'],

  dependencies: {
    required: ['dropshipping-core', 'organization-core'],
    optional: [],
  },

  permissions: {
    entities: [
      'GroupbuyCampaign',
      'CampaignProduct',
      'GroupbuyOrder',
      'SupplierProfile',
    ],
    routes: ['/api/groupbuy/*'],
  },

  settings: {
    defaultMinQuantity: 10,
    defaultCampaignDurationDays: 14,
  },

  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },
};

export default manifest;
