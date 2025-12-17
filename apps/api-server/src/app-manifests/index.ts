import { AppManifest } from '@o4o/types';
import { forumManifest } from './forum.manifest.js';
import { forumYaksaManifest } from './forum-yaksa.manifest.js';
import { signageManifest } from '@o4o-apps/signage';
import { manifest as lmsCoreManifest } from '@o4o/lms-core';
import { manifest as organizationCoreManifest } from '@o4o/organization-core';
import { manifest as organizationForumManifest } from '@o4o-extensions/organization-forum';
import { dropshippingCoreManifest } from './dropshipping-core.manifest.js';
import { cosmeticsExtensionManifest } from '@o4o/dropshipping-cosmetics';
import { selleropsManifest } from './sellerops.manifest.js';
import { supplieropsManifest } from './supplierops.manifest.js';
import { partneropsManifest } from './partnerops.manifest.js';
import { manifest as membershipYaksaManifest } from '@o4o/membership-yaksa';
import { manifest as cmsCoreManifest } from '@o4o-apps/cms-core';
import { ecommerceCoreManifest } from '@o4o/ecommerce-core';
// Additional Yaksa/Cosmetics packages
// TODO: Fix build/runtime errors in these packages
// import { manifest as annualfeeYaksaManifest } from '@o4o/annualfee-yaksa';
// import { manifest as yaksaSchedulerManifest } from '@o4o/yaksa-scheduler';
// import { manifest as cosmeticsPartnerExtensionManifest } from '@o4o/cosmetics-partner-extension';
import { manifest as cosmeticsSellerExtensionManifest } from '@o4o/cosmetics-seller-extension';
// import { manifest as cosmeticsSupplierExtensionManifest } from '@o4o/cosmetics-supplier-extension';
import { manifest as lmsYaksaManifest } from '@o4o/lms-yaksa';
// import { manifest as lmsMarketingManifest } from '@o4o/lms-marketing';
// import { manifest as healthExtensionManifest } from '@o4o/health-extension';
// TODO: Add these packages to api-server dependencies before enabling
// import { manifest as platformCoreManifest } from '@o4o/platform-core';
// import { manifest as authCoreManifest } from '@o4o/auth-core';

/**
 * App Manifest Registry
 *
 * Central registry of all available app manifests
 *
 * Note: Extension app manifests have extended properties beyond the base AppManifest type.
 * Type assertions are used here to accommodate the extended manifest schema.
 */
const manifestRegistry: Record<string, AppManifest> = {
  // Forum apps
  'forum': forumManifest as any, // Alias for backward compatibility
  'forum-core': forumManifest as any,
  'forum-yaksa': forumYaksaManifest as any,
  // Display apps
  'signage': signageManifest as any,
  'digitalsignage': signageManifest as any, // Alias for backward compatibility
  // LMS
  'lms-core': lmsCoreManifest as any,
  'lms-yaksa': lmsYaksaManifest as any,
  // 'lms-marketing': lmsMarketingManifest as any, // TODO: Fix build errors
  // Organization
  'organization-core': organizationCoreManifest as any,
  'organization-forum': organizationForumManifest as any,
  'membership-yaksa': membershipYaksaManifest as any,
  // Yaksa Services - TODO: Fix build/runtime errors
  // 'annualfee-yaksa': annualfeeYaksaManifest as any,
  // 'yaksa-scheduler': yaksaSchedulerManifest as any,
  // Dropshipping
  'dropshipping': dropshippingCoreManifest as any, // Alias for backward compatibility
  'dropshipping-core': dropshippingCoreManifest as any,
  'dropshipping-cosmetics': cosmeticsExtensionManifest as any,
  // Cosmetics Extensions
  // 'cosmetics-partner-extension': cosmeticsPartnerExtensionManifest as any,
  'cosmetics-seller-extension': cosmeticsSellerExtensionManifest as any,
  // 'cosmetics-supplier-extension': cosmeticsSupplierExtensionManifest as any,
  // Operations
  sellerops: selleropsManifest as any,
  supplierops: supplieropsManifest as any,
  partnerops: partneropsManifest as any,
  // CMS
  'cms-core': cmsCoreManifest as any,
  // E-commerce
  'ecommerce-core': ecommerceCoreManifest as any,
  // Platform Core - TODO: Add to api-server dependencies before enabling
  // 'platform-core': platformCoreManifest as any,
  // 'auth-core': authCoreManifest as any,
  // 'health-extension': healthExtensionManifest as any, // TODO: Fix build errors
};

/**
 * Load manifest for a given appId
 *
 * @param appId - The app identifier (e.g., 'forum', 'digitalsignage')
 * @returns AppManifest if found
 * @throws Error if manifest not found
 */
export function loadLocalManifest(appId: string): AppManifest {
  const manifest = manifestRegistry[appId];

  if (!manifest) {
    throw new Error(`Manifest not found for appId: ${appId}`);
  }

  return manifest;
}

/**
 * Get list of all available app IDs
 *
 * @returns Array of app IDs
 */
export function getAvailableAppIds(): string[] {
  return Object.keys(manifestRegistry);
}

/**
 * Check if an app manifest exists
 *
 * @param appId - The app identifier
 * @returns true if manifest exists
 */
export function hasManifest(appId: string): boolean {
  return appId in manifestRegistry;
}
