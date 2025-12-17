/**
 * Cosmetics Supplier Extension Manifest
 *
 * 브랜드(공급사)가 가격정책, 샘플공급, 승인, 캠페인 등을 관리하는 확장앱
 * Cosmetics Suite의 3면 플랫폼 구조 완성 (Supplier - Seller - Partner)
 */

export const cosmeticsSupplierExtensionManifest = {
  // ===== 필수 기본 정보 =====
  id: 'cosmetics-supplier-extension',  // ModuleLoader compatibility
  appId: 'cosmetics-supplier-extension',
  displayName: '화장품 공급사 관리',
  name: 'Cosmetics Supplier Extension',
  version: '1.0.0',
  type: 'extension' as const,
  appType: 'extension' as const, // Legacy compatibility
  category: 'commerce' as const,
  description: '브랜드(공급사)가 가격정책, 샘플공급, 승인, 캠페인 등을 관리하는 확장앱',

  // Extension configuration
  extendsApp: 'dropshipping-cosmetics',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core', 'dropshipping-cosmetics'],
    apps: ['cosmetics-partner-extension'],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'cosmetics_supplier_profiles',
    'cosmetics_price_policies',
    'cosmetics_sample_supplies',
    'cosmetics_supplier_approvals',
    'cosmetics_supplier_campaigns',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // Routes
  routes: [
    '/api/v1/cosmetics-supplier',
    '/api/v1/cosmetics-supplier/*',
  ],

  // Permissions
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

  // Menu Configuration (표준 형식)
  menus: {
    admin: [
      { label: 'Supplier Dashboard', path: '/cosmetics-supplier/dashboard', icon: 'Building' },
      { label: 'Price Policies', path: '/cosmetics-supplier/price-policies', icon: 'Tag' },
      { label: 'Sample Supply', path: '/cosmetics-supplier/samples', icon: 'Gift' },
      { label: 'Approvals', path: '/cosmetics-supplier/approvals', icon: 'CheckCircle' },
      { label: 'Campaigns', path: '/cosmetics-supplier/campaigns', icon: 'Megaphone' },
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
    entities: [
      './backend/entities/supplier-profile.entity',
      './backend/entities/price-policy.entity',
      './backend/entities/sample-supply.entity',
      './backend/entities/supplier-approval.entity',
      './backend/entities/supplier-campaign.entity',
    ],
    services: [
      'SupplierProfileService',
      'PricePolicyService',
      'SampleSupplyService',
      'SupplierApprovalService',
      'SupplierCampaignService',
    ],
    controllers: [],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: [
      'SupplierProfileService',
      'PricePolicyService',
      'SampleSupplyService',
      'SupplierApprovalService',
      'SupplierCampaignService',
    ],
    types: [],
    events: [],
  },
};

// Named export for convenience
export { cosmeticsSupplierExtensionManifest as manifest };

export default cosmeticsSupplierExtensionManifest;
