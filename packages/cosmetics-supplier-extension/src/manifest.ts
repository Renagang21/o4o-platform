/**
 * Cosmetics Supplier Extension Manifest
 *
 * 브랜드(공급사)가 가격정책, 샘플공급, 승인, 캠페인 등을 관리하는 확장앱
 * Cosmetics Suite의 3면 플랫폼 구조 완성 (Supplier - Seller - Partner)
 */

import type { AppManifest } from '@o4o/types';

const manifest: AppManifest = {
  id: 'cosmetics-supplier-extension',
  namespace: 'cosmetics-supplier',
  version: '1.0.0',
  type: 'extension',
  displayName: 'Cosmetics Supplier Extension',
  description: '브랜드(공급사)가 가격정책, 샘플공급, 승인, 캠페인 등을 관리하는 확장앱',

  dependsOn: ['dropshipping-core', 'dropshipping-cosmetics', 'cosmetics-partner-extension'],

  adminMenu: [
    {
      label: 'Supplier Dashboard',
      path: '/cosmetics-supplier/dashboard',
      icon: 'building',
      order: 1,
    },
    {
      label: 'Price Policies',
      path: '/cosmetics-supplier/price-policies',
      icon: 'tag',
      order: 2,
    },
    {
      label: 'Sample Supply',
      path: '/cosmetics-supplier/samples',
      icon: 'gift',
      order: 3,
    },
    {
      label: 'Approvals',
      path: '/cosmetics-supplier/approvals',
      icon: 'check-circle',
      order: 4,
    },
    {
      label: 'Campaigns',
      path: '/cosmetics-supplier/campaigns',
      icon: 'megaphone',
      order: 5,
    },
  ],

  entities: [
    'SupplierProfile',
    'PricePolicy',
    'SampleSupply',
    'SupplierApproval',
    'SupplierCampaign',
  ],

  services: [
    'SupplierProfileService',
    'PricePolicyService',
    'SampleSupplyService',
    'SupplierApprovalService',
    'SupplierCampaignService',
  ],

  routes: {
    prefix: '/api/v1/supplier',
    middleware: ['auth', 'supplier'],
  },

  lifecycle: {
    install: 'dist/lifecycle/install.js',
    activate: 'dist/lifecycle/activate.js',
    deactivate: 'dist/lifecycle/deactivate.js',
    uninstall: 'dist/lifecycle/uninstall.js',
  },

  permissions: [
    'supplier:profile:read',
    'supplier:profile:write',
    'supplier:price-policy:read',
    'supplier:price-policy:write',
    'supplier:sample:read',
    'supplier:sample:write',
    'supplier:approval:read',
    'supplier:approval:write',
    'supplier:campaign:read',
    'supplier:campaign:write',
  ],
};

export default manifest;
