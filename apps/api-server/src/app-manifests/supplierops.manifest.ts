import { AppManifest } from '@o4o/types';

/**
 * SupplierOps App Manifest
 *
 * AppManager용 manifest - 설치/의존성 해결에 사용
 */
export const supplieropsManifest: AppManifest = {
  appId: 'supplierops',
  name: 'SupplierOps',
  version: '1.0.0',
  type: 'extension',
  description: '범용 공급자 운영 앱 - 상품 등록, Offer 관리, 주문 Relay, 정산 관리',

  // Dependencies - requires dropshipping-core
  dependencies: {
    'dropshipping-core': '>=1.0.0',
  },

  // Permissions
  permissions: [
    'supplierops.read',
    'supplierops.write',
    'supplierops.supplier.profile',
    'supplierops.product.manage',
    'supplierops.offer.manage',
    'supplierops.order.monitor',
    'supplierops.settlement.view',
  ],

  // CPT definitions (none for supplierops)
  cpt: [],

  // ACF field groups (none for supplierops)
  acf: [],

  // Tables owned by this app
  // Note: Tables are created by install lifecycle hook
  // Ownership validation happens before install, so we leave this empty
  ownsTables: [],

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: false,
  },
};
