/**
 * App Manifest Types
 *
 * Types for feature-level app manifests (forum, digitalsignage, etc.)
 * This is separate from the integration/block app manifests in App.ts
 */

/**
 * App Manifest for Feature-Level Apps
 *
 * V1: Minimal fields for app registry
 * Future: Can extend with CPT definitions, ACF schemas, migrations, etc.
 */
export interface AppManifest {
  /** Unique app identifier (e.g., 'forum', 'digitalsignage') */
  appId: string;

  /** Display name */
  name: string;

  /** Semver version */
  version: string;

  /** Short description */
  description?: string;

  /** Routes this app handles (e.g., ['/forum', '/forum/:id']) */
  routes?: string[];

  /** Permissions this app requires (e.g., ['forum.read', 'forum.write']) */
  permissions?: string[];

  /** Future extensions (not used in V1) */
  cpt?: {
    /** Custom Post Type definitions */
    types?: any[];
  };

  acf?: {
    /** ACF field group definitions */
    fieldGroups?: any[];
  };

  migrations?: {
    /** Migration scripts */
    scripts?: string[];
  };

  dependencies?: {
    /** Other apps this app depends on */
    apps?: string[];
    /** Minimum version requirements */
    minVersions?: Record<string, string>;
  };
}

/**
 * App Registry Entry Status
 */
export type AppRegistryStatus = 'installed' | 'active' | 'inactive';

/**
 * App Registry Entry
 */
export interface AppRegistryEntry {
  id: string;
  appId: string;
  name: string;
  version: string;
  status: AppRegistryStatus;
  source: string;
  installedAt: Date;
  updatedAt: Date;
}
