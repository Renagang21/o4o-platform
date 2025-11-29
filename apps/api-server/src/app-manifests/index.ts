import { AppManifest } from '@o4o/types';
import { forumManifest } from './forum.manifest.js';
import { digitalsignageManifest } from './digitalsignage.manifest.js';

/**
 * App Manifest Registry
 *
 * Central registry of all available app manifests
 */
const manifestRegistry: Record<string, AppManifest> = {
  forum: forumManifest,
  digitalsignage: digitalsignageManifest,
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
