/**
 * Versioned Service Template Registry
 * Phase 10 Task 1 — Service Template Versioning System
 *
 * Extended registry that supports multiple versions of templates.
 * Provides version resolution, upgrade path calculation, and
 * compatibility checking.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';
import {
  type VersionedServiceTemplate,
  type SemanticVersion,
  type VersionResolutionRequest,
  type VersionResolutionResult,
  type VersionedTemplateRegistryEntry,
  type ServiceVersionBinding,
  type MigrationScript,
  type VersionResolutionStrategy,
  compareVersions,
  getLatestVersion,
  sortVersions,
  isUpgradeRequired,
} from './template-version-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Versioned Template Registry Class
// =============================================================================

export class VersionedTemplateRegistry {
  /** Map of templateId -> VersionedTemplateRegistryEntry */
  private registry = new Map<string, VersionedTemplateRegistryEntry>();

  /** Map of tenantId -> ServiceVersionBinding */
  private bindings = new Map<string, ServiceVersionBinding>();

  /** Templates directory */
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, 'templates');
  }

  // ===========================================================================
  // Loading Methods
  // ===========================================================================

  /**
   * Load all versioned templates from directory
   */
  async loadAll(): Promise<void> {
    if (!existsSync(this.templatesDir)) {
      logger.warn(`[VersionedTemplateRegistry] Templates directory not found: ${this.templatesDir}`);
      return;
    }

    const files = readdirSync(this.templatesDir).filter(
      f => f.endsWith('.json') || f.endsWith('.template.json')
    );

    for (const file of files) {
      try {
        const filePath = path.join(this.templatesDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const template: VersionedServiceTemplate = JSON.parse(content);

        // Convert releasedAt string to Date if needed
        if (typeof template.releasedAt === 'string') {
          template.releasedAt = new Date(template.releasedAt);
        }

        if (this.validateTemplate(template)) {
          this.registerVersion(template);
          logger.info(`[VersionedTemplateRegistry] Loaded: ${template.templateId}@${template.version}`);
        } else {
          logger.warn(`[VersionedTemplateRegistry] Invalid template in ${file}`);
        }
      } catch (error) {
        logger.error(`[VersionedTemplateRegistry] Failed to load ${file}:`, error);
      }
    }

    logger.info(`[VersionedTemplateRegistry] Loaded ${this.registry.size} template families`);
  }

  /**
   * Register a template version
   */
  registerVersion(template: VersionedServiceTemplate): boolean {
    if (!this.validateTemplate(template)) {
      return false;
    }

    let entry = this.registry.get(template.templateId);

    if (!entry) {
      entry = {
        templateId: template.templateId,
        versions: new Map(),
        latestVersion: template.version,
        latestStableVersion: template.deprecated ? '' : template.version,
        loadedAt: new Date(),
      };
      this.registry.set(template.templateId, entry);
    }

    // Add version to map
    entry.versions.set(template.version, template);

    // Update latest version
    const allVersions = Array.from(entry.versions.keys());
    entry.latestVersion = getLatestVersion(allVersions) || template.version;

    // Update latest stable version (non-deprecated)
    const stableVersions = allVersions.filter(v => {
      const t = entry!.versions.get(v);
      return t && !t.deprecated;
    });
    entry.latestStableVersion = getLatestVersion(stableVersions) || '';

    logger.debug(`[VersionedTemplateRegistry] Registered ${template.templateId}@${template.version}`);
    return true;
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate a versioned template
   */
  private validateTemplate(template: VersionedServiceTemplate): boolean {
    if (!template.templateId || typeof template.templateId !== 'string') return false;
    if (!template.version || typeof template.version !== 'string') return false;
    if (!template.label || typeof template.label !== 'string') return false;
    if (!template.serviceGroup) return false;
    if (!Array.isArray(template.coreApps)) return false;
    if (!template.initPack) return false;
    if (typeof template.autoInstall !== 'boolean') return false;
    if (!Array.isArray(template.changelog)) return false;
    return true;
  }

  // ===========================================================================
  // Retrieval Methods
  // ===========================================================================

  /**
   * Get a specific version of a template
   */
  getTemplateVersion(
    templateId: string,
    version: SemanticVersion
  ): VersionedServiceTemplate | undefined {
    const entry = this.registry.get(templateId);
    return entry?.versions.get(version);
  }

  /**
   * Get latest version of a template
   */
  getLatestVersion(templateId: string): VersionedServiceTemplate | undefined {
    const entry = this.registry.get(templateId);
    if (!entry) return undefined;
    return entry.versions.get(entry.latestVersion);
  }

  /**
   * Get latest stable (non-deprecated) version
   */
  getLatestStableVersion(templateId: string): VersionedServiceTemplate | undefined {
    const entry = this.registry.get(templateId);
    if (!entry || !entry.latestStableVersion) return undefined;
    return entry.versions.get(entry.latestStableVersion);
  }

  /**
   * Get all versions of a template
   */
  getAllVersions(templateId: string): VersionedServiceTemplate[] {
    const entry = this.registry.get(templateId);
    if (!entry) return [];
    return Array.from(entry.versions.values());
  }

  /**
   * Get all template IDs
   */
  getAllTemplateIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all latest templates
   */
  getAllLatestTemplates(): VersionedServiceTemplate[] {
    return this.getAllTemplateIds()
      .map(id => this.getLatestVersion(id))
      .filter((t): t is VersionedServiceTemplate => t !== undefined);
  }

  /**
   * Get templates by service group
   */
  getTemplatesByServiceGroup(serviceGroup: ServiceGroup): VersionedServiceTemplate[] {
    return this.getAllLatestTemplates().filter(t => t.serviceGroup === serviceGroup);
  }

  // ===========================================================================
  // Version Resolution
  // ===========================================================================

  /**
   * Resolve version based on strategy
   */
  resolveVersion(request: VersionResolutionRequest): VersionResolutionResult {
    const entry = this.registry.get(request.templateId);

    if (!entry) {
      return {
        templateId: request.templateId,
        resolvedVersion: '',
        strategy: request.strategy,
        availableVersions: [],
        warnings: [`Template '${request.templateId}' not found`],
      };
    }

    const availableVersions = sortVersions(Array.from(entry.versions.keys()));
    let resolvedVersion: SemanticVersion = '';
    const warnings: string[] = [];

    switch (request.strategy) {
      case 'latest':
        resolvedVersion = entry.latestVersion;
        break;

      case 'stable':
        resolvedVersion = entry.latestStableVersion || entry.latestVersion;
        if (!entry.latestStableVersion) {
          warnings.push('No stable version available, falling back to latest');
        }
        break;

      case 'pinned':
        if (request.currentVersion && entry.versions.has(request.currentVersion)) {
          resolvedVersion = request.currentVersion;
        } else {
          resolvedVersion = entry.latestStableVersion || entry.latestVersion;
          warnings.push(`Pinned version '${request.currentVersion}' not found, using latest`);
        }
        break;

      case 'compatible':
        // Find latest version that satisfies all constraints
        if (request.constraints && request.constraints.length > 0) {
          const compatibleVersions = availableVersions.filter(v => {
            return request.constraints!.every(c => {
              const cmp = compareVersions(v, c.version);
              switch (c.operator) {
                case '>=': return cmp >= 0;
                case '>': return cmp > 0;
                case '<=': return cmp <= 0;
                case '<': return cmp < 0;
                case '=': return cmp === 0;
                default: return true;
              }
            });
          });
          resolvedVersion = getLatestVersion(compatibleVersions) || entry.latestVersion;
        } else {
          resolvedVersion = entry.latestVersion;
        }
        break;
    }

    // Calculate upgrade path if current version provided
    let upgradePath: SemanticVersion[] | undefined;
    if (request.currentVersion && isUpgradeRequired(request.currentVersion, resolvedVersion)) {
      upgradePath = this.calculateUpgradePath(
        request.templateId,
        request.currentVersion,
        resolvedVersion
      );
    }

    // Check for deprecation warning
    const template = entry.versions.get(resolvedVersion);
    if (template?.deprecated) {
      warnings.push(`Version ${resolvedVersion} is deprecated: ${template.deprecationMessage || 'No reason provided'}`);
      if (template.recommendedUpgradeVersion) {
        warnings.push(`Recommended upgrade to: ${template.recommendedUpgradeVersion}`);
      }
    }

    return {
      templateId: request.templateId,
      resolvedVersion,
      strategy: request.strategy,
      availableVersions,
      upgradePath,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Calculate upgrade path between versions
   */
  calculateUpgradePath(
    templateId: string,
    fromVersion: SemanticVersion,
    toVersion: SemanticVersion
  ): SemanticVersion[] {
    const entry = this.registry.get(templateId);
    if (!entry) return [];

    const allVersions = sortVersions(Array.from(entry.versions.keys()));

    // Filter versions between from and to (exclusive of from, inclusive of to)
    const upgradePath = allVersions.filter(v => {
      const cmpFrom = compareVersions(v, fromVersion);
      const cmpTo = compareVersions(v, toVersion);
      return cmpFrom > 0 && cmpTo <= 0;
    });

    return upgradePath;
  }

  /**
   * Get migration scripts for upgrade path
   */
  getMigrationScripts(
    templateId: string,
    fromVersion: SemanticVersion,
    toVersion: SemanticVersion
  ): MigrationScript[] {
    const upgradePath = this.calculateUpgradePath(templateId, fromVersion, toVersion);
    const scripts: MigrationScript[] = [];

    let prevVersion = fromVersion;
    for (const version of upgradePath) {
      const template = this.getTemplateVersion(templateId, version);
      if (template?.migrationScripts) {
        // Filter scripts that apply from prevVersion
        const relevantScripts = template.migrationScripts.filter(
          s => s.fromVersion === prevVersion && s.toVersion === version
        );
        scripts.push(...relevantScripts);
      }
      prevVersion = version;
    }

    // Sort by order
    return scripts.sort((a, b) => a.order - b.order);
  }

  // ===========================================================================
  // Service Binding Methods
  // ===========================================================================

  /**
   * Bind a tenant to a template version
   */
  bindServiceVersion(binding: ServiceVersionBinding): void {
    this.bindings.set(binding.tenantId, binding);
    logger.info(`[VersionedTemplateRegistry] Bound ${binding.tenantId} to ${binding.templateId}@${binding.pinnedVersion}`);
  }

  /**
   * Get service binding for tenant
   */
  getServiceBinding(tenantId: string): ServiceVersionBinding | undefined {
    return this.bindings.get(tenantId);
  }

  /**
   * Update service binding
   */
  updateServiceBinding(
    tenantId: string,
    updates: Partial<ServiceVersionBinding>
  ): ServiceVersionBinding | undefined {
    const binding = this.bindings.get(tenantId);
    if (!binding) return undefined;

    const updated = { ...binding, ...updates };
    this.bindings.set(tenantId, updated);
    return updated;
  }

  /**
   * Get all services using a specific template version
   */
  getServicesUsingVersion(
    templateId: string,
    version: SemanticVersion
  ): ServiceVersionBinding[] {
    return Array.from(this.bindings.values()).filter(
      b => b.templateId === templateId && b.installedVersion === version
    );
  }

  /**
   * Get services that need upgrade
   */
  getServicesNeedingUpgrade(): ServiceVersionBinding[] {
    return Array.from(this.bindings.values()).filter(binding => {
      const entry = this.registry.get(binding.templateId);
      if (!entry) return false;

      const targetVersion = binding.upgradeChannel === 'stable'
        ? entry.latestStableVersion
        : entry.latestVersion;

      return isUpgradeRequired(binding.installedVersion, targetVersion);
    });
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTemplates: number;
    totalVersions: number;
    byServiceGroup: Record<string, number>;
    deprecatedVersions: number;
    boundServices: number;
    servicesNeedingUpgrade: number;
  } {
    let totalVersions = 0;
    let deprecatedVersions = 0;
    const byServiceGroup: Record<string, number> = {};

    for (const entry of this.registry.values()) {
      totalVersions += entry.versions.size;

      for (const template of entry.versions.values()) {
        if (template.deprecated) deprecatedVersions++;

        const group = template.serviceGroup;
        byServiceGroup[group] = (byServiceGroup[group] || 0) + 1;
      }
    }

    return {
      totalTemplates: this.registry.size,
      totalVersions,
      byServiceGroup,
      deprecatedVersions,
      boundServices: this.bindings.size,
      servicesNeedingUpgrade: this.getServicesNeedingUpgrade().length,
    };
  }

  /**
   * Clear registry (for testing)
   */
  clear(): void {
    this.registry.clear();
    this.bindings.clear();
    logger.info('[VersionedTemplateRegistry] Cleared all data');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const versionedTemplateRegistry = new VersionedTemplateRegistry();

export default versionedTemplateRegistry;
