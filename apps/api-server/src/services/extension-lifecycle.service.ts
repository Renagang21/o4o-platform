/**
 * Extension Lifecycle Service
 * Phase 10 Task 3 — Extension Lifecycle Upgrade System
 *
 * Manages extension versioning and lifecycle:
 * - Extension version management
 * - Core compatibility checking
 * - Upgrade API for extensions
 * - Deprecation handling
 */

import { DataSource } from 'typeorm';
import logger from '../utils/logger.js';
import {
  type SemanticVersion,
  compareVersions,
  satisfiesConstraint,
  type VersionConstraint,
} from '../service-templates/template-version-schema.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Extension Manifest v2
 */
export interface ExtensionManifestV2 {
  /** Unique extension identifier */
  extensionId: string;

  /** Extension name for display */
  name: string;

  /** Extension description */
  description: string;

  /** Semantic version */
  version: SemanticVersion;

  /** Required core app version constraint */
  requiredCoreVersion: string; // e.g., ">=2.0.0"

  /** Required platform version */
  requiredPlatformVersion?: string;

  /** Dependencies on other extensions */
  extensionDependencies?: Array<{
    extensionId: string;
    version: string;
  }>;

  /** Service groups this extension is compatible with */
  compatibleServiceGroups: string[];

  /** Migration scripts for upgrades */
  migrations: ExtensionMigration[];

  /** Whether this extension is deprecated */
  deprecated: boolean;

  /** Deprecation message */
  deprecationMessage?: string;

  /** Recommended replacement extension */
  replacementExtension?: string;

  /** End of life date */
  endOfLifeDate?: Date;

  /** Extension type */
  type: 'feature' | 'integration' | 'utility' | 'theme' | 'analytics';

  /** Author information */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };

  /** License */
  license?: string;

  /** Repository URL */
  repository?: string;

  /** Keywords/tags */
  keywords?: string[];

  /** Release date */
  releasedAt: Date;

  /** Changelog for this version */
  changelog?: Array<{
    type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security';
    description: string;
  }>;
}

/**
 * Extension migration script
 */
export interface ExtensionMigration {
  id: string;
  fromVersion: SemanticVersion;
  toVersion: SemanticVersion;
  description: string;
  script: string;
  reversible: boolean;
  rollbackScript?: string;
  order: number;
}

/**
 * Installed extension record
 */
export interface InstalledExtension {
  tenantId: string;
  extensionId: string;
  installedVersion: SemanticVersion;
  installedAt: Date;
  lastUpdatedAt?: Date;
  status: 'active' | 'disabled' | 'error' | 'upgrading';
  config?: Record<string, any>;
}

/**
 * Extension compatibility result
 */
export interface ExtensionCompatibilityResult {
  extensionId: string;
  extensionVersion: SemanticVersion;
  isCompatible: boolean;
  issues: Array<{
    type: 'core_version' | 'platform_version' | 'service_group' | 'dependency' | 'deprecated';
    severity: 'error' | 'warning';
    message: string;
  }>;
  recommendations?: string[];
}

/**
 * Extension upgrade result
 */
export interface ExtensionUpgradeResult {
  extensionId: string;
  fromVersion: SemanticVersion;
  toVersion: SemanticVersion;
  success: boolean;
  migrationsRun: string[];
  error?: string;
  rollbackAvailable: boolean;
}

// =============================================================================
// Extension Lifecycle Service
// =============================================================================

export class ExtensionLifecycleService {
  private dataSource: DataSource;

  /** Map of extensionId -> versions */
  private extensionRegistry = new Map<string, Map<SemanticVersion, ExtensionManifestV2>>();

  /** Map of tenantId -> installed extensions */
  private installedExtensions = new Map<string, Map<string, InstalledExtension>>();

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // ===========================================================================
  // Registry Management
  // ===========================================================================

  /**
   * Register an extension manifest
   */
  registerExtension(manifest: ExtensionManifestV2): void {
    if (!this.extensionRegistry.has(manifest.extensionId)) {
      this.extensionRegistry.set(manifest.extensionId, new Map());
    }

    this.extensionRegistry.get(manifest.extensionId)!.set(manifest.version, manifest);
    logger.info(`[ExtensionLifecycle] Registered: ${manifest.extensionId}@${manifest.version}`);
  }

  /**
   * Get extension manifest by version
   */
  getExtension(extensionId: string, version?: SemanticVersion): ExtensionManifestV2 | undefined {
    const versions = this.extensionRegistry.get(extensionId);
    if (!versions) return undefined;

    if (version) {
      return versions.get(version);
    }

    // Return latest version
    const latestVersion = this.getLatestVersion(extensionId);
    return latestVersion ? versions.get(latestVersion) : undefined;
  }

  /**
   * Get latest version of an extension
   */
  getLatestVersion(extensionId: string): SemanticVersion | undefined {
    const versions = this.extensionRegistry.get(extensionId);
    if (!versions || versions.size === 0) return undefined;

    return Array.from(versions.keys()).sort(compareVersions).reverse()[0];
  }

  /**
   * Get latest non-deprecated version
   */
  getLatestStableVersion(extensionId: string): SemanticVersion | undefined {
    const versions = this.extensionRegistry.get(extensionId);
    if (!versions) return undefined;

    const stableVersions = Array.from(versions.entries())
      .filter(([_, manifest]) => !manifest.deprecated)
      .map(([version]) => version);

    if (stableVersions.length === 0) return undefined;
    return stableVersions.sort(compareVersions).reverse()[0];
  }

  /**
   * Get all versions of an extension
   */
  getAllVersions(extensionId: string): SemanticVersion[] {
    const versions = this.extensionRegistry.get(extensionId);
    if (!versions) return [];
    return Array.from(versions.keys()).sort(compareVersions);
  }

  /**
   * Get all registered extensions
   */
  getAllExtensions(): ExtensionManifestV2[] {
    const extensions: ExtensionManifestV2[] = [];
    for (const versions of this.extensionRegistry.values()) {
      // Get latest version of each
      const sorted = Array.from(versions.entries()).sort((a, b) => compareVersions(b[0], a[0]));
      if (sorted.length > 0) {
        extensions.push(sorted[0][1]);
      }
    }
    return extensions;
  }

  /**
   * Get deprecated extensions
   */
  getDeprecatedExtensions(): ExtensionManifestV2[] {
    return this.getAllExtensions().filter(e => e.deprecated);
  }

  // ===========================================================================
  // Compatibility Checking
  // ===========================================================================

  /**
   * Check extension compatibility
   */
  checkCompatibility(
    extensionId: string,
    version: SemanticVersion,
    context: {
      coreVersion: SemanticVersion;
      platformVersion?: SemanticVersion;
      serviceGroup: string;
      installedExtensions?: Map<string, SemanticVersion>;
    }
  ): ExtensionCompatibilityResult {
    const manifest = this.getExtension(extensionId, version);

    if (!manifest) {
      return {
        extensionId,
        extensionVersion: version,
        isCompatible: false,
        issues: [{
          type: 'core_version',
          severity: 'error',
          message: `Extension ${extensionId}@${version} not found`,
        }],
      };
    }

    const issues: ExtensionCompatibilityResult['issues'] = [];
    const recommendations: string[] = [];

    // Check core version requirement
    if (manifest.requiredCoreVersion) {
      const constraint = this.parseVersionConstraint(manifest.requiredCoreVersion);
      if (constraint && !satisfiesConstraint(context.coreVersion, constraint)) {
        issues.push({
          type: 'core_version',
          severity: 'error',
          message: `Requires core version ${manifest.requiredCoreVersion}, but ${context.coreVersion} is installed`,
        });
      }
    }

    // Check platform version requirement
    if (manifest.requiredPlatformVersion && context.platformVersion) {
      const constraint = this.parseVersionConstraint(manifest.requiredPlatformVersion);
      if (constraint && !satisfiesConstraint(context.platformVersion, constraint)) {
        issues.push({
          type: 'platform_version',
          severity: 'error',
          message: `Requires platform version ${manifest.requiredPlatformVersion}`,
        });
      }
    }

    // Check service group compatibility
    if (!manifest.compatibleServiceGroups.includes(context.serviceGroup) &&
        !manifest.compatibleServiceGroups.includes('*')) {
      issues.push({
        type: 'service_group',
        severity: 'error',
        message: `Not compatible with service group '${context.serviceGroup}'`,
      });
    }

    // Check extension dependencies
    if (manifest.extensionDependencies && context.installedExtensions) {
      for (const dep of manifest.extensionDependencies) {
        const installedVersion = context.installedExtensions.get(dep.extensionId);
        if (!installedVersion) {
          issues.push({
            type: 'dependency',
            severity: 'error',
            message: `Requires extension ${dep.extensionId}@${dep.version}`,
          });
        } else {
          const constraint = this.parseVersionConstraint(dep.version);
          if (constraint && !satisfiesConstraint(installedVersion, constraint)) {
            issues.push({
              type: 'dependency',
              severity: 'error',
              message: `Requires ${dep.extensionId}@${dep.version}, but ${installedVersion} is installed`,
            });
          }
        }
      }
    }

    // Check deprecation
    if (manifest.deprecated) {
      issues.push({
        type: 'deprecated',
        severity: 'warning',
        message: manifest.deprecationMessage || 'This extension is deprecated',
      });

      if (manifest.replacementExtension) {
        recommendations.push(`Consider migrating to: ${manifest.replacementExtension}`);
      }

      if (manifest.endOfLifeDate) {
        const eol = new Date(manifest.endOfLifeDate);
        if (eol < new Date()) {
          issues.push({
            type: 'deprecated',
            severity: 'error',
            message: `Extension reached end of life on ${eol.toISOString().split('T')[0]}`,
          });
        } else {
          recommendations.push(`End of life: ${eol.toISOString().split('T')[0]}`);
        }
      }
    }

    return {
      extensionId,
      extensionVersion: version,
      isCompatible: !issues.some(i => i.severity === 'error'),
      issues,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Parse version constraint string
   */
  private parseVersionConstraint(constraintStr: string): VersionConstraint | null {
    const match = constraintStr.match(/^(>=|>|<=|<|=|\^|~)?(\d+\.\d+\.\d+)$/);
    if (!match) return null;

    return {
      operator: (match[1] as VersionConstraint['operator']) || '=',
      version: match[2],
    };
  }

  // ===========================================================================
  // Installation Management
  // ===========================================================================

  /**
   * Install extension for tenant
   */
  async installExtension(
    tenantId: string,
    extensionId: string,
    version: SemanticVersion,
    config?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    const manifest = this.getExtension(extensionId, version);
    if (!manifest) {
      return { success: false, error: `Extension ${extensionId}@${version} not found` };
    }

    // Create tenant extension map if needed
    if (!this.installedExtensions.has(tenantId)) {
      this.installedExtensions.set(tenantId, new Map());
    }

    const installed: InstalledExtension = {
      tenantId,
      extensionId,
      installedVersion: version,
      installedAt: new Date(),
      status: 'active',
      config,
    };

    this.installedExtensions.get(tenantId)!.set(extensionId, installed);
    logger.info(`[ExtensionLifecycle] Installed ${extensionId}@${version} for tenant ${tenantId}`);

    return { success: true };
  }

  /**
   * Get installed extension
   */
  getInstalledExtension(tenantId: string, extensionId: string): InstalledExtension | undefined {
    return this.installedExtensions.get(tenantId)?.get(extensionId);
  }

  /**
   * Get all installed extensions for tenant
   */
  getInstalledExtensions(tenantId: string): InstalledExtension[] {
    const extensions = this.installedExtensions.get(tenantId);
    if (!extensions) return [];
    return Array.from(extensions.values());
  }

  // ===========================================================================
  // Extension Upgrade
  // ===========================================================================

  /**
   * Upgrade extension for tenant
   */
  async upgradeExtension(
    tenantId: string,
    extensionId: string,
    toVersion: SemanticVersion,
    context: {
      coreVersion: SemanticVersion;
      serviceGroup: string;
    }
  ): Promise<ExtensionUpgradeResult> {
    const installed = this.getInstalledExtension(tenantId, extensionId);
    if (!installed) {
      return {
        extensionId,
        fromVersion: '0.0.0',
        toVersion,
        success: false,
        migrationsRun: [],
        error: `Extension ${extensionId} not installed for tenant ${tenantId}`,
        rollbackAvailable: false,
      };
    }

    const fromVersion = installed.installedVersion;

    // Check if upgrade is needed
    if (compareVersions(fromVersion, toVersion) >= 0) {
      return {
        extensionId,
        fromVersion,
        toVersion,
        success: true,
        migrationsRun: [],
        rollbackAvailable: false,
      };
    }

    // Check compatibility
    const compatibility = this.checkCompatibility(extensionId, toVersion, {
      ...context,
      installedExtensions: new Map(
        this.getInstalledExtensions(tenantId).map(e => [e.extensionId, e.installedVersion])
      ),
    });

    if (!compatibility.isCompatible) {
      return {
        extensionId,
        fromVersion,
        toVersion,
        success: false,
        migrationsRun: [],
        error: `Compatibility check failed: ${compatibility.issues.map(i => i.message).join(', ')}`,
        rollbackAvailable: false,
      };
    }

    // Get migrations to run
    const migrations = this.getMigrationPath(extensionId, fromVersion, toVersion);
    const migrationsRun: string[] = [];

    try {
      // Update status
      installed.status = 'upgrading';

      // Run migrations
      for (const migration of migrations) {
        logger.info(`[ExtensionLifecycle] Running migration: ${migration.id}`);
        await this.runMigration(migration);
        migrationsRun.push(migration.id);
      }

      // Update installed version
      installed.installedVersion = toVersion;
      installed.lastUpdatedAt = new Date();
      installed.status = 'active';

      logger.info(`[ExtensionLifecycle] Upgraded ${extensionId} from ${fromVersion} to ${toVersion} for tenant ${tenantId}`);

      return {
        extensionId,
        fromVersion,
        toVersion,
        success: true,
        migrationsRun,
        rollbackAvailable: migrations.every(m => m.reversible),
      };
    } catch (error) {
      installed.status = 'error';

      return {
        extensionId,
        fromVersion,
        toVersion,
        success: false,
        migrationsRun,
        error: error instanceof Error ? error.message : String(error),
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Get migration path between versions
   */
  private getMigrationPath(
    extensionId: string,
    fromVersion: SemanticVersion,
    toVersion: SemanticVersion
  ): ExtensionMigration[] {
    const migrations: ExtensionMigration[] = [];
    const versions = this.extensionRegistry.get(extensionId);
    if (!versions) return migrations;

    // Get all versions in upgrade path
    const allVersions = Array.from(versions.keys())
      .sort(compareVersions)
      .filter(v => {
        const cmpFrom = compareVersions(v, fromVersion);
        const cmpTo = compareVersions(v, toVersion);
        return cmpFrom > 0 && cmpTo <= 0;
      });

    // Collect migrations from each version
    let prevVersion = fromVersion;
    for (const version of allVersions) {
      const manifest = versions.get(version);
      if (manifest?.migrations) {
        const relevantMigrations = manifest.migrations.filter(
          m => m.fromVersion === prevVersion && m.toVersion === version
        );
        migrations.push(...relevantMigrations);
      }
      prevVersion = version;
    }

    // Sort by order
    return migrations.sort((a, b) => a.order - b.order);
  }

  /**
   * Run a migration
   */
  private async runMigration(migration: ExtensionMigration): Promise<void> {
    // In a real implementation, this would execute the migration script
    logger.info(`[ExtensionLifecycle] Executing migration ${migration.id}: ${migration.description}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // ===========================================================================
  // Deprecation Management
  // ===========================================================================

  /**
   * Get extensions with deprecation warnings for tenant
   */
  getDeprecationWarnings(tenantId: string): Array<{
    extensionId: string;
    version: SemanticVersion;
    message: string;
    replacement?: string;
    endOfLife?: Date;
  }> {
    const warnings: ReturnType<typeof this.getDeprecationWarnings> = [];
    const installed = this.getInstalledExtensions(tenantId);

    for (const ext of installed) {
      const manifest = this.getExtension(ext.extensionId, ext.installedVersion);
      if (manifest?.deprecated) {
        warnings.push({
          extensionId: ext.extensionId,
          version: ext.installedVersion,
          message: manifest.deprecationMessage || 'This extension is deprecated',
          replacement: manifest.replacementExtension,
          endOfLife: manifest.endOfLifeDate,
        });
      }
    }

    return warnings;
  }

  /**
   * Get available upgrades for tenant
   */
  getAvailableUpgrades(tenantId: string): Array<{
    extensionId: string;
    currentVersion: SemanticVersion;
    latestVersion: SemanticVersion;
    isStable: boolean;
  }> {
    const upgrades: ReturnType<typeof this.getAvailableUpgrades> = [];
    const installed = this.getInstalledExtensions(tenantId);

    for (const ext of installed) {
      const latestVersion = this.getLatestVersion(ext.extensionId);
      const latestStableVersion = this.getLatestStableVersion(ext.extensionId);

      if (latestVersion && compareVersions(ext.installedVersion, latestVersion) < 0) {
        upgrades.push({
          extensionId: ext.extensionId,
          currentVersion: ext.installedVersion,
          latestVersion,
          isStable: latestStableVersion === latestVersion,
        });
      }
    }

    return upgrades;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get registry statistics
   */
  getStats(): {
    totalExtensions: number;
    totalVersions: number;
    deprecatedCount: number;
    byType: Record<string, number>;
    totalInstallations: number;
  } {
    let totalVersions = 0;
    let deprecatedCount = 0;
    const byType: Record<string, number> = {};

    for (const versions of this.extensionRegistry.values()) {
      totalVersions += versions.size;

      for (const manifest of versions.values()) {
        if (manifest.deprecated) deprecatedCount++;
        byType[manifest.type] = (byType[manifest.type] || 0) + 1;
      }
    }

    let totalInstallations = 0;
    for (const tenantExtensions of this.installedExtensions.values()) {
      totalInstallations += tenantExtensions.size;
    }

    return {
      totalExtensions: this.extensionRegistry.size,
      totalVersions,
      deprecatedCount,
      byType,
      totalInstallations,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let extensionLifecycleServiceInstance: ExtensionLifecycleService | null = null;

export function getExtensionLifecycleService(dataSource: DataSource): ExtensionLifecycleService {
  if (!extensionLifecycleServiceInstance) {
    extensionLifecycleServiceInstance = new ExtensionLifecycleService(dataSource);
  }
  return extensionLifecycleServiceInstance;
}

export default ExtensionLifecycleService;
