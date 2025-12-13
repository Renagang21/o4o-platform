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
import { manifest as lmsYaksaManifest } from '@o4o/lms-yaksa';
import { manifest as yaksaSchedulerManifest } from '@o4o/yaksa-scheduler';

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
  // Organization
  'organization-core': organizationCoreManifest as any,
  'organization-forum': organizationForumManifest as any,
  'membership-yaksa': membershipYaksaManifest as any,
  'lms-yaksa': lmsYaksaManifest as any,
  'yaksa-scheduler': yaksaSchedulerManifest as any,
  // Dropshipping
  'dropshipping': dropshippingCoreManifest as any, // Alias for backward compatibility
  'dropshipping-core': dropshippingCoreManifest as any,
  'dropshipping-cosmetics': cosmeticsExtensionManifest as any,
  // Operations
  sellerops: selleropsManifest as any,
  supplierops: supplieropsManifest as any,
  partnerops: partneropsManifest as any,
  // CMS
  'cms-core': cmsCoreManifest as any,
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
