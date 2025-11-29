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
  /** Unique app identifier (e.g., 'forum-core', 'forum-neture') */
  appId: string;

  /** Display name */
  name: string;

  /** Semver version */
  version: string;

  /** App type (for Core/Extension pattern) */
  type?: 'core' | 'extension' | 'standalone';

  /** Short description */
  description?: string;

  /** Uninstall policy */
  uninstallPolicy?: {
    /** Default mode when uninstalling */
    defaultMode?: 'keep-data' | 'purge-data';
    /** Allow users to purge data */
    allowPurge?: boolean;
    /** Auto backup before purge */
    autoBackup?: boolean;
  };

  /** Database tables this app owns (for purge) */
  ownsTables?: string[];

  /** CPT types this app owns */
  ownsCPT?: string[];

  /** ACF field groups this app owns */
  ownsACF?: string[];

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

  /**
   * Dependencies (supports two formats):
   * 1. Legacy format: { apps?: string[], minVersions?: Record<string, string> }
   * 2. Core/Extension format: { "app-id": "version-range" }
   */
  dependencies?: {
    /** Other apps this app depends on (legacy format) */
    apps?: string[];
    /** Minimum version requirements (legacy format) */
    minVersions?: Record<string, string>;
  } | Record<string, string>;

  /** Any additional properties for extensibility */
  [key: string]: any;
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
