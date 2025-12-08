import { AppManifest } from '@o4o/types';
import { forumManifest } from './forum.manifest.js';
import { forumCosmeticsManifest } from '@o4o-apps/forum-cosmetics';
import { manifest as lmsCoreManifest } from '@o4o/lms-core';
import { manifest as organizationCoreManifest } from '@o4o/organization-core';
import { manifest as organizationForumManifest } from '@o4o-extensions/organization-forum';
import { dropshippingCoreManifest } from './dropshipping-core.manifest.js';
import { cosmeticsExtensionManifest } from '@o4o/dropshipping-cosmetics';
import { selleropsManifest } from './sellerops.manifest.js';
import { supplieropsManifest } from './supplierops.manifest.js';

/**
 * App Manifest Registry
 *
 * Central registry of all available app manifests
 *
 * Note: Extension app manifests have extended properties beyond the base AppManifest type.
 * Type assertions are used here to accommodate the extended manifest schema.
 */
const manifestRegistry: Record<string, AppManifest> = {
  'forum-core': forumManifest as any,
  'forum-cosmetics': forumCosmeticsManifest as any,
  'lms-core': lmsCoreManifest as any,
  'organization-core': organizationCoreManifest as any,
  'organization-forum': organizationForumManifest as any,
  'dropshipping-core': dropshippingCoreManifest as any,
  'dropshipping-cosmetics': cosmeticsExtensionManifest as any,
  sellerops: selleropsManifest as any,
  supplierops: supplieropsManifest as any,
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
