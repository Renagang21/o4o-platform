import { AppManifest } from '@o4o/types';

/**
 * Dropshipping Core App Manifest
 * 
 * Minimal manifest to enable installation of Dropshipping Core app.
 * This can be extended later with CPT, ACF, permissions, and lifecycle hooks as needed.
 */
export const dropshippingCoreManifest: AppManifest = {
  appId: 'dropshipping-core',
  name: 'Dropshipping Core',
  version: '1.0.0',
  type: 'core',
  description: '멀티벤더 드랍쉬핑 마켓플레이스 코어 엔진',
  
  // Dependencies (if any)
  dependencies: {},
  
  // Permissions (if any)
  permissions: [],
  
  // CPT definitions (if any)
  cpt: [],
  
  // ACF field groups (if any)
  acf: [],
  
  // Tables owned by this app (if any)
  ownsTables: [],
  
  // Lifecycle hooks (optional)
  // Uncomment and implement when needed:
  // lifecycle: {
  //   install: './lifecycle/install.js',
  //   activate: './lifecycle/activate.js',
  //   deactivate: './lifecycle/deactivate.js',
  //   uninstall: './lifecycle/uninstall.js',
  // },
  
  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: false,
  },
};
