import { AppManifest } from '@o4o/types';

/**
 * SellerOps App Manifest
 *
 * AppManager용 manifest - 설치/의존성 해결에 사용
 */
export const selleropsManifest: AppManifest = {
  appId: 'sellerops',
  name: 'SellerOps',
  version: '1.0.0',
  type: 'extension',
  description: '범용 판매자 운영 앱 - 공급자 승인, 리스팅 관리, 주문 추적, 정산 대시보드',

  // Dependencies - requires dropshipping-core
  dependencies: {
    'dropshipping-core': '>=1.0.0',
  },

  // Permissions
  permissions: [
    'sellerops.read',
    'sellerops.write',
    'sellerops.seller.profile',
    'sellerops.supplier.request',
    'sellerops.listing.manage',
    'sellerops.order.view',
    'sellerops.settlement.view',
  ],

  // CPT definitions (none for sellerops)
  cpt: [],

  // ACF field groups (none for sellerops)
  acf: [],

  // Tables owned by this app
  ownsTables: [
    'sellerops_settings',
    'sellerops_notifications',
    'sellerops_documents',
  ],

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: false,
  },
};
