/**
 * Service Template Version Schema
 * Phase 10 Task 1 — Service Template Versioning System
 *
 * Introduces versioning for service templates to enable:
 * - Evolution of templates over time
 * - Safe upgrades for existing services
 * - Migration scripts for data/schema changes
 * - Changelog tracking
 */

import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

// =============================================================================
// Version-related Types
// =============================================================================

/**
 * Semantic version string (e.g., "1.0.0", "2.1.3")
 */
export type SemanticVersion = string;

/**
 * Version comparison operators for dependencies
 */
export type VersionOperator = '>=' | '>' | '<=' | '<' | '=' | '^' | '~';

/**
 * Version constraint (e.g., ">=1.0.0", "^2.0.0")
 */
export interface VersionConstraint {
  operator: VersionOperator;
  version: SemanticVersion;
}

// =============================================================================
// Template Version Schema
// =============================================================================

/**
 * Versioned Service Template
 *
 * Extends the base template with versioning capabilities
 */
export interface VersionedServiceTemplate {
  /** Unique template identifier */
  templateId: string;

  /** Semantic version (e.g., "1.0.0") */
  version: SemanticVersion;

  /** Display name for the template */
  label: string;

  /** Description of what this service template provides */
  description: string;

  /** Service group this template belongs to */
  serviceGroup: ServiceGroup;

  /** Core apps that must be installed */
  coreApps: string[];

  /** Optional extension apps */
  extensionApps?: string[];

  /** Global core apps always included */
  globalCoreApps?: string[];

  /** Associated InitPack ID */
  initPack: string;

  /** Auto-install apps on service creation */
  autoInstall: boolean;

  /** Changelog entries for this version */
  changelog: ChangelogEntry[];

  /** Migration scripts for upgrading from previous versions */
  migrationScripts?: MigrationScript[];

  /** Minimum required platform version */
  minPlatformVersion?: SemanticVersion;

  /** Previous version this was upgraded from */
  previousVersion?: SemanticVersion;

  /** Whether this version is deprecated */
  deprecated?: boolean;

  /** Deprecation message if deprecated */
  deprecationMessage?: string;

  /** Recommended upgrade version if deprecated */
  recommendedUpgradeVersion?: SemanticVersion;

  /** Release date */
  releasedAt: Date;

  /** Whether this template version is active and available */
  isActive: boolean;

  /** Template metadata */
  metadata?: {
    author?: string;
    category?: string;
    icon?: string;
    tags?: string[];
  };
}

// =============================================================================
// Changelog Types
// =============================================================================

/**
 * Changelog entry type
 */
export type ChangelogType =
  | 'added'      // New features
  | 'changed'    // Changes in existing functionality
  | 'deprecated' // Features to be removed
  | 'removed'    // Removed features
  | 'fixed'      // Bug fixes
  | 'security';  // Security patches

/**
 * Single changelog entry
 */
export interface ChangelogEntry {
  type: ChangelogType;
  description: string;
  details?: string;
  relatedApps?: string[];
}

// =============================================================================
// Migration Script Types
// =============================================================================

/**
 * Migration script type
 */
export type MigrationScriptType =
  | 'app-install'    // Install new app
  | 'app-remove'     // Remove deprecated app
  | 'app-upgrade'    // Upgrade app version
  | 'data-migrate'   // Migrate data structure
  | 'config-update'  // Update configuration
  | 'theme-update'   // Update theme/preset
  | 'nav-update'     // Update navigation
  | 'custom';        // Custom migration script

/**
 * Migration script definition
 */
export interface MigrationScript {
  /** Unique migration ID */
  id: string;

  /** Migration type */
  type: MigrationScriptType;

  /** Description of what this migration does */
  description: string;

  /** Source version this migration applies from */
  fromVersion: SemanticVersion;

  /** Target version after migration */
  toVersion: SemanticVersion;

  /** Migration script path or inline script */
  script: string;

  /** Whether this migration can be rolled back */
  reversible: boolean;

  /** Rollback script if reversible */
  rollbackScript?: string;

  /** Order of execution (lower = first) */
  order: number;

  /** Estimated duration in seconds */
  estimatedDuration?: number;

  /** Whether to run in transaction */
  transactional?: boolean;

  /** Dependencies on other migrations */
  dependsOn?: string[];
}

// =============================================================================
// Version Resolution Types
// =============================================================================

/**
 * Version resolution strategy
 */
export type VersionResolutionStrategy =
  | 'latest'     // Always use latest version
  | 'pinned'     // Use exact pinned version
  | 'compatible' // Use latest compatible version
  | 'stable';    // Use latest stable (non-deprecated) version

/**
 * Version resolution request
 */
export interface VersionResolutionRequest {
  templateId: string;
  strategy: VersionResolutionStrategy;
  currentVersion?: SemanticVersion;
  constraints?: VersionConstraint[];
}

/**
 * Version resolution result
 */
export interface VersionResolutionResult {
  templateId: string;
  resolvedVersion: SemanticVersion;
  strategy: VersionResolutionStrategy;
  availableVersions: SemanticVersion[];
  upgradePath?: SemanticVersion[];
  warnings?: string[];
}

// =============================================================================
// Template Version Registry Entry
// =============================================================================

/**
 * Registry entry for a versioned template
 */
export interface VersionedTemplateRegistryEntry {
  templateId: string;
  versions: Map<SemanticVersion, VersionedServiceTemplate>;
  latestVersion: SemanticVersion;
  latestStableVersion: SemanticVersion;
  loadedAt: Date;
}

// =============================================================================
// Service Version Binding
// =============================================================================

/**
 * Binding between a tenant/service and its template version
 */
export interface ServiceVersionBinding {
  tenantId: string;
  templateId: string;
  pinnedVersion: SemanticVersion;
  installedVersion: SemanticVersion;
  lastUpgradeAt?: Date;
  autoUpgrade: boolean;
  upgradeChannel: 'stable' | 'latest' | 'manual';
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse semantic version string
 */
export function parseVersion(version: SemanticVersion): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;

  // Handle prerelease versions (prerelease < release)
  if (va.prerelease && !vb.prerelease) return -1;
  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && vb.prerelease) {
    return va.prerelease.localeCompare(vb.prerelease);
  }

  return 0;
}

/**
 * Check if version satisfies constraint
 */
export function satisfiesConstraint(
  version: SemanticVersion,
  constraint: VersionConstraint
): boolean {
  const cmp = compareVersions(version, constraint.version);

  switch (constraint.operator) {
    case '>=': return cmp >= 0;
    case '>': return cmp > 0;
    case '<=': return cmp <= 0;
    case '<': return cmp < 0;
    case '=': return cmp === 0;
    case '^': {
      // Compatible with (same major, >= minor.patch)
      const v = parseVersion(version);
      const c = parseVersion(constraint.version);
      return v.major === c.major && cmp >= 0;
    }
    case '~': {
      // Approximately equivalent (same major.minor, >= patch)
      const v = parseVersion(version);
      const c = parseVersion(constraint.version);
      return v.major === c.major && v.minor === c.minor && cmp >= 0;
    }
    default:
      return false;
  }
}

/**
 * Get latest version from list
 */
export function getLatestVersion(versions: SemanticVersion[]): SemanticVersion | undefined {
  if (versions.length === 0) return undefined;
  return versions.sort(compareVersions).reverse()[0];
}

/**
 * Sort versions (ascending)
 */
export function sortVersions(versions: SemanticVersion[]): SemanticVersion[] {
  return [...versions].sort(compareVersions);
}

/**
 * Check if upgrade is required
 */
export function isUpgradeRequired(
  currentVersion: SemanticVersion,
  targetVersion: SemanticVersion
): boolean {
  return compareVersions(currentVersion, targetVersion) < 0;
}

/**
 * Increment version
 */
export function incrementVersion(
  version: SemanticVersion,
  type: 'major' | 'minor' | 'patch'
): SemanticVersion {
  const v = parseVersion(version);
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

// =============================================================================
// Exports
// =============================================================================

export default {
  parseVersion,
  compareVersions,
  satisfiesConstraint,
  getLatestVersion,
  sortVersions,
  isUpgradeRequired,
  incrementVersion,
};
