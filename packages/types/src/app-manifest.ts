/**
 * App Manifest Types
 *
 * Types for feature-level app manifests (forum, digitalsignage, etc.)
 * This is separate from the integration/block app manifests in App.ts
 */

/**
 * CPT Field Type
 */
export type CPTFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'array'
  | 'object'
  | 'json';

/**
 * CPT Definition in Manifest
 */
export interface ManifestCPTDefinition {
  /** CPT name (e.g., 'forum_post') */
  name: string;

  /** Storage type */
  storage: 'entity' | 'json-cpt';

  /** Primary key field */
  primaryKey: string;

  /** Display label */
  label: string;

  /** Supported features */
  supports?: string[];

  /** Additional metadata */
  [key: string]: any;
}

/**
 * ACF Field Definition
 */
export interface ACFFieldDefinition {
  /** Field key */
  key: string;

  /** Field type */
  type: CPTFieldType;

  /** Field label */
  label: string;

  /** Field options (for select/multiselect) */
  options?: string[] | Record<string, string>;

  /** Required field */
  required?: boolean;

  /** Default value */
  defaultValue?: any;

  /** Additional metadata */
  [key: string]: any;
}

/**
 * ACF Group Definition
 */
export interface ACFGroupDefinition {
  /** Group ID */
  groupId: string;

  /** Group label */
  label: string;

  /** Fields in this group */
  fields: ACFFieldDefinition[];

  /** CPT this group applies to (optional) */
  appliesTo?: string;

  /** Additional metadata */
  [key: string]: any;
}

/**
 * Lifecycle Hooks Definition
 */
export interface LifecycleHooks {
  /** Install hook - relative path to module */
  install?: string;

  /** Activate hook - relative path to module */
  activate?: string;

  /** Deactivate hook - relative path to module */
  deactivate?: string;

  /** Uninstall hook - relative path to module */
  uninstall?: string;

  /** Update hook - relative path to module (receives oldVersion, newVersion in options) */
  update?: string;

  /** Rollback hook - relative path to module (receives currentVersion, previousVersion in options) */
  rollback?: string;
}

/**
 * App Manifest for Feature-Level Apps
 *
 * V2: Extended with CPT/ACF definitions and lifecycle hooks
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

  /** App source - local or remote */
  source?: 'local' | 'remote';

  /** Remote manifest URL (when source is 'remote') */
  url?: string;

  /** Vendor/author info for remote apps */
  vendor?: string;

  /** SHA-256 hash of the manifest for integrity verification */
  hash?: string;

  /** Remote block scripts to load */
  blockScripts?: string[];

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

  /** CPT definitions (V2) */
  cpt?: ManifestCPTDefinition[];

  /** ACF field group definitions (V2) */
  acf?: ACFGroupDefinition[];

  /** Lifecycle hooks (V2) */
  lifecycle?: LifecycleHooks;

  /** Migration scripts */
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
 * Disabled App Status
 *
 * @see docs/platform/disabled-app-policy.md
 */
export type DisabledAppStatus = 'broken' | 'incomplete' | 'paused' | 'deprecated';

/**
 * Disabled App Metadata
 *
 * Information about why an app is disabled and what needs to happen
 * for it to be re-enabled.
 */
export interface DisabledAppMetadata {
  /** Why this app is disabled */
  status: DisabledAppStatus;
  /** Human-readable reason */
  reason: string;
  /** What needs to happen next */
  nextAction: string;
  /** When this was disabled (ISO date string) */
  disabledAt: string;
  /** Related issue or tracking ID */
  trackingId?: string;
}

/**
 * Disabled App Entry
 *
 * Entry in the disabled apps registry
 */
export interface DisabledAppEntry {
  /** App identifier */
  appId: string;
  /** Display name */
  name: string;
  /** Disabled metadata */
  disabled: DisabledAppMetadata;
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
