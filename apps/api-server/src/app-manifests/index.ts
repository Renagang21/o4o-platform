import { AppManifest } from '@o4o/types';

// ============================================================================
// DOMAIN MANIFESTS REMOVED (Phase R1: Execution Boundary Cleanup)
// ============================================================================
// All domain/extension app manifests have been removed from api-server.
// api-server is now a Core API only - it does not load or register domain apps.
//
// Removed manifests:
// - Forum: forum, forum-core, forum-yaksa
// - Display: signage, digitalsignage
// - LMS: lms-core, lms-yaksa, lms-marketing
// - Organization: organization-core, organization-forum, membership-yaksa
// - Dropshipping: dropshipping, dropshipping-core, dropshipping-cosmetics
// - Cosmetics: cosmetics-seller-extension, cosmetics-partner-extension, cosmetics-supplier-extension
// - Operations: sellerops, supplierops, partnerops
// - CMS: cms-core
// - E-commerce: ecommerce-core
// - Yaksa: annualfee-yaksa, yaksa-scheduler
// - Platform: platform-core, auth-core, health-extension
//
// These will be handled in Phase R2 (domain service separation).
// ============================================================================

/**
 * App Manifest Registry - EMPTY (Phase R1)
 *
 * api-server no longer manages domain app manifests.
 * This registry is kept for backward compatibility but contains no entries.
 */
const manifestRegistry: Record<string, AppManifest> = {
  // No manifests - Phase R1 Core API only
};

/**
 * Load manifest for a given appId
 * @deprecated Phase R1 - api-server does not load domain manifests
 */
export function loadLocalManifest(appId: string): AppManifest {
  const manifest = manifestRegistry[appId];

  if (!manifest) {
    throw new Error(`[Phase R1] Manifest not found: ${appId}. Domain manifests are disabled.`);
  }

  return manifest;
}

/**
 * Get list of all available app IDs
 */
export function getAvailableAppIds(): string[] {
  return Object.keys(manifestRegistry);
}

/**
 * Check if an app manifest exists
 */
export function hasManifest(appId: string): boolean {
  return appId in manifestRegistry;
}
