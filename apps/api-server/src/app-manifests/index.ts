import { AppManifest } from '@o4o/types';
import { forumManifest } from './forum.manifest.js';
// import { forumNetureManifest } from '@o4o-apps/forum-neture';
import { forumYaksaManifest } from '@o4o-apps/forum-yaksa';

/**
 * App Manifest Registry
 *
 * Central registry of all available app manifests
 *
 * Note: Extension app manifests (forum-neture, forum-yaksa) have extended properties
 * beyond the base AppManifest type. Type assertions are used here to accommodate
 * the extended manifest schema documented in docs/dev/spec/extension_app_pattern.md
 *
 * TODO: Add manifests for dropshipping-core, dropshipping-cosmetics, lms-core,
 * organization-core, organization-dropshipping, organization-forum after packages are built
 */
const manifestRegistry: Record<string, AppManifest> = {
  forum: forumManifest as any,
  // 'forum-neture': forumNetureManifest as any,
  'forum-yaksa': forumYaksaManifest as any,
  // TODO: Enable after packages are built and exported properly
  // 'dropshipping-core': dropshippingCoreManifest as any,
  // 'dropshipping-cosmetics': cosmeticsExtensionManifest as any,
  // 'lms-core': lmsCoreManifest as any,
  // 'organization-core': organizationCoreManifest as any,
  // 'organization-dropshipping': organizationDropshippingManifest as any,
  // 'organization-forum': organizationForumManifest as any,
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
