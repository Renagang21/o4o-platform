import type { ExtensionManifest } from '@o4o/types';

export const manifest: ExtensionManifest = {
  id: 'organization-dropshipping',
  name: 'Organization-Dropshipping Integration',
  version: '0.1.0',
  type: 'extension',
  description: 'Integrates organization-core with dropshipping-core for organization-scoped groupbuys',

  author: 'O4O Platform',
  license: 'MIT',

  /**
   * Dependencies
   *
   * This extension requires both organization-core and dropshipping-core
   */
  dependencies: {
    core: ['organization-core'],
    apps: ['dropshipping-core'],
  },

  /**
   * Lifecycle Hooks
   */
  lifecycle: {
    onInstall: './lifecycle/install.js',
  },

  /**
   * Features
   */
  features: [
    'organization-scoped-products',
    'organization-based-groupbuys',
    'hierarchical-dropshipping-permissions',
    'organization-pricing',
    'groupbuy-participant-tracking',
  ],

  /**
   * Configuration
   */
  config: {
    enableGroupbuys: {
      type: 'boolean',
      default: true,
      description: 'Enable groupbuy campaigns for organizations',
    },
    defaultMinQuantity: {
      type: 'number',
      default: 10,
      description: 'Default minimum quantity for groupbuys',
    },
    allowPublicGroupbuys: {
      type: 'boolean',
      default: false,
      description: 'Allow non-members to view organization groupbuys',
    },
  },
};
