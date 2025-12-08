import { AppManifest } from '@o4o/types';

/**
 * PartnerOps App Manifest
 *
 * AppManager용 manifest - 설치/의존성 해결에 사용
 */
export const partneropsManifest: AppManifest = {
  appId: 'partnerops',
  name: 'PartnerOps',
  version: '1.0.0',
  type: 'extension',
  description: '파트너/어필리에이트 운영 앱 - 링크 추적, 전환 분석, 커미션 정산',

  // Dependencies - requires dropshipping-core
  dependencies: {
    'dropshipping-core': '>=1.0.0',
  },

  // Permissions
  permissions: [
    'partnerops.read',
    'partnerops.write',
    'partnerops.routines.manage',
    'partnerops.links.manage',
    'partnerops.conversions.view',
    'partnerops.settlement.view',
  ],

  // CPT definitions (none for partnerops)
  cpt: [],

  // ACF field groups (none for partnerops)
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
