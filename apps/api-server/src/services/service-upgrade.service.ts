/**
 * Service Upgrade Service
 * Phase 10 Task 2 — Service Upgrade Pipeline
 *
 * Provides safe upgrade capabilities for running services:
 * - Diff analysis between current and target template versions
 * - Migration execution engine
 * - Rollback support
 * - Upgrade status tracking
 */

import { DataSource } from 'typeorm';
import logger from '../utils/logger.js';
import { versionedTemplateRegistry } from '../service-templates/versioned-template-registry.js';
import {
  type VersionedServiceTemplate,
  type SemanticVersion,
  type MigrationScript,
  compareVersions,
  isUpgradeRequired,
} from '../service-templates/template-version-schema.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Upgrade diff result
 */
export interface UpgradeDiff {
  templateId: string;
  fromVersion: SemanticVersion;
  toVersion: SemanticVersion;

  /** Apps to be added */
  addApps: string[];

  /** Apps to be removed */
  removeApps: string[];

  /** Apps to be updated */
  updateApps: Array<{
    appId: string;
    reason: string;
  }>;

  /** Theme changes */
  themeChanges: Array<{
    type: 'preset' | 'config' | 'css';
    from?: string;
    to: string;
    description: string;
  }>;

  /** Navigation updates */
  navigationUpdates: Array<{
    type: 'add' | 'remove' | 'update';
    key: string;
    description: string;
  }>;

  /** InitPack changes */
  initPackChanges?: {
    from: string;
    to: string;
    categories?: number;
    menus?: number;
    pages?: number;
  };

  /** Migration scripts to run */
  migrations: MigrationScript[];

  /** Warnings about the upgrade */
  warnings: string[];

  /** Breaking changes that require attention */
  breakingChanges: string[];

  /** Whether upgrade is safe to proceed */
  isSafeUpgrade: boolean;

  /** Estimated duration in seconds */
  estimatedDuration: number;
}

/**
 * Upgrade execution status
 */
export type UpgradeStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';

/**
 * Upgrade execution step
 */
export interface UpgradeStep {
  id: string;
  type: 'app_install' | 'app_remove' | 'app_update' | 'migration' | 'theme' | 'navigation' | 'initpack';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  canRollback: boolean;
  rollbackData?: any;
}

/**
 * Upgrade execution record
 */
export interface UpgradeRecord {
  id: string;
  tenantId: string;
  templateId: string;
  fromVersion: SemanticVersion;
  toVersion: SemanticVersion;
  status: UpgradeStatus;
  diff: UpgradeDiff;
  steps: UpgradeStep[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  initiatedBy: string;
  rollbackAvailable: boolean;
}

/**
 * Upgrade options
 */
export interface UpgradeOptions {
  /** Skip app installation */
  skipApps?: boolean;

  /** Skip theme updates */
  skipTheme?: boolean;

  /** Skip navigation updates */
  skipNavigation?: boolean;

  /** Skip InitPack application */
  skipInitPack?: boolean;

  /** Force upgrade even with warnings */
  force?: boolean;

  /** Dry run (don't execute, just plan) */
  dryRun?: boolean;

  /** Create backup before upgrade */
  createBackup?: boolean;
}

// =============================================================================
// Service Upgrade Service
// =============================================================================

export class ServiceUpgradeService {
  private dataSource: DataSource;
  private upgradeRecords = new Map<string, UpgradeRecord>();
  private currentUpgrades = new Map<string, string>(); // tenantId -> upgradeId

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // ===========================================================================
  // Upgrade Diff Analyzer
  // ===========================================================================

  /**
   * Analyze differences between current and target template versions
   */
  async analyzeDiff(
    tenantId: string,
    templateId: string,
    fromVersion: SemanticVersion,
    toVersion: SemanticVersion,
    currentState?: {
      installedApps: string[];
      themePreset?: string;
      navigationKeys?: string[];
    }
  ): Promise<UpgradeDiff> {
    const fromTemplate = versionedTemplateRegistry.getTemplateVersion(templateId, fromVersion);
    const toTemplate = versionedTemplateRegistry.getTemplateVersion(templateId, toVersion);

    if (!fromTemplate) {
      throw new Error(`Template ${templateId}@${fromVersion} not found`);
    }
    if (!toTemplate) {
      throw new Error(`Template ${templateId}@${toVersion} not found`);
    }

    const warnings: string[] = [];
    const breakingChanges: string[] = [];

    // === App Changes ===
    const fromApps = new Set([
      ...(fromTemplate.globalCoreApps || []),
      ...fromTemplate.coreApps,
      ...(fromTemplate.extensionApps || []),
    ]);
    const toApps = new Set([
      ...(toTemplate.globalCoreApps || []),
      ...toTemplate.coreApps,
      ...(toTemplate.extensionApps || []),
    ]);

    const addApps: string[] = [];
    const removeApps: string[] = [];
    const updateApps: Array<{ appId: string; reason: string }> = [];

    // Apps to add
    for (const app of toApps) {
      if (!fromApps.has(app)) {
        addApps.push(app);
      }
    }

    // Apps to remove
    for (const app of fromApps) {
      if (!toApps.has(app)) {
        removeApps.push(app);
        // Removing core apps is a breaking change
        if (fromTemplate.coreApps.includes(app)) {
          breakingChanges.push(`Core app '${app}' will be removed`);
        }
      }
    }

    // === Theme Changes ===
    const themeChanges: UpgradeDiff['themeChanges'] = [];
    // Theme changes would be detected from InitPack comparison
    // For now, flag if InitPack changed
    if (fromTemplate.initPack !== toTemplate.initPack) {
      themeChanges.push({
        type: 'preset',
        from: fromTemplate.initPack,
        to: toTemplate.initPack,
        description: 'InitPack changed, theme preset may be updated',
      });
    }

    // === Navigation Updates ===
    const navigationUpdates: UpgradeDiff['navigationUpdates'] = [];
    // Navigation changes come from InitPack - would need to compare InitPack contents

    // === InitPack Changes ===
    let initPackChanges: UpgradeDiff['initPackChanges'] | undefined;
    if (fromTemplate.initPack !== toTemplate.initPack) {
      initPackChanges = {
        from: fromTemplate.initPack,
        to: toTemplate.initPack,
      };
      warnings.push('InitPack has changed - review new default data structures');
    }

    // === Migration Scripts ===
    const migrations = versionedTemplateRegistry.getMigrationScripts(
      templateId,
      fromVersion,
      toVersion
    );

    // === Changelog Analysis ===
    const upgradePath = versionedTemplateRegistry.calculateUpgradePath(
      templateId,
      fromVersion,
      toVersion
    );

    for (const version of upgradePath) {
      const template = versionedTemplateRegistry.getTemplateVersion(templateId, version);
      if (template?.changelog) {
        for (const entry of template.changelog) {
          if (entry.type === 'removed') {
            breakingChanges.push(`v${version}: ${entry.description}`);
          }
          if (entry.type === 'deprecated') {
            warnings.push(`v${version}: ${entry.description}`);
          }
        }
      }
    }

    // === Safety Check ===
    const isSafeUpgrade = breakingChanges.length === 0 &&
      removeApps.length === 0 &&
      !migrations.some(m => !m.reversible);

    // === Duration Estimate ===
    let estimatedDuration = 10; // Base 10 seconds
    estimatedDuration += addApps.length * 5; // 5s per app install
    estimatedDuration += removeApps.length * 2; // 2s per app remove
    estimatedDuration += migrations.reduce((sum, m) => sum + (m.estimatedDuration || 5), 0);

    return {
      templateId,
      fromVersion,
      toVersion,
      addApps,
      removeApps,
      updateApps,
      themeChanges,
      navigationUpdates,
      initPackChanges,
      migrations,
      warnings,
      breakingChanges,
      isSafeUpgrade,
      estimatedDuration,
    };
  }

  // ===========================================================================
  // Upgrade Execution Engine
  // ===========================================================================

  /**
   * Execute upgrade for a tenant
   */
  async executeUpgrade(
    tenantId: string,
    templateId: string,
    toVersion: SemanticVersion,
    initiatedBy: string,
    options: UpgradeOptions = {}
  ): Promise<UpgradeRecord> {
    // Check if upgrade already in progress
    if (this.currentUpgrades.has(tenantId)) {
      throw new Error(`Upgrade already in progress for tenant ${tenantId}`);
    }

    // Get current binding
    const binding = versionedTemplateRegistry.getServiceBinding(tenantId);
    if (!binding) {
      throw new Error(`No version binding found for tenant ${tenantId}`);
    }

    const fromVersion = binding.installedVersion;

    // Validate upgrade is needed
    if (!isUpgradeRequired(fromVersion, toVersion)) {
      throw new Error(`No upgrade needed: ${fromVersion} >= ${toVersion}`);
    }

    // Analyze diff
    const diff = await this.analyzeDiff(tenantId, templateId, fromVersion, toVersion);

    // Check for breaking changes
    if (!options.force && !diff.isSafeUpgrade) {
      throw new Error(
        `Unsafe upgrade detected. Breaking changes: ${diff.breakingChanges.join(', ')}. Use force option to proceed.`
      );
    }

    // Create upgrade record
    const upgradeId = `upgrade-${tenantId}-${Date.now()}`;
    const record: UpgradeRecord = {
      id: upgradeId,
      tenantId,
      templateId,
      fromVersion,
      toVersion,
      status: 'pending',
      diff,
      steps: this.buildUpgradeSteps(diff, options),
      startedAt: new Date(),
      initiatedBy,
      rollbackAvailable: diff.migrations.every(m => m.reversible),
    };

    this.upgradeRecords.set(upgradeId, record);
    this.currentUpgrades.set(tenantId, upgradeId);

    // Dry run - return plan without executing
    if (options.dryRun) {
      record.status = 'completed';
      record.completedAt = new Date();
      this.currentUpgrades.delete(tenantId);
      return record;
    }

    try {
      // Execute upgrade
      record.status = 'in_progress';
      await this.runUpgradeSteps(record, options);

      // Update binding
      versionedTemplateRegistry.updateServiceBinding(tenantId, {
        installedVersion: toVersion,
        lastUpgradeAt: new Date(),
      });

      record.status = 'completed';
      record.completedAt = new Date();
      logger.info(`[ServiceUpgrade] Upgrade completed: ${tenantId} ${fromVersion} -> ${toVersion}`);
    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : String(error);
      record.completedAt = new Date();
      logger.error(`[ServiceUpgrade] Upgrade failed: ${tenantId}`, error);

      // Attempt rollback if available
      if (record.rollbackAvailable && !options.dryRun) {
        await this.rollback(upgradeId);
      }
    } finally {
      this.currentUpgrades.delete(tenantId);
    }

    return record;
  }

  /**
   * Build upgrade steps from diff
   */
  private buildUpgradeSteps(diff: UpgradeDiff, options: UpgradeOptions): UpgradeStep[] {
    const steps: UpgradeStep[] = [];
    let stepIndex = 0;

    // App installs
    if (!options.skipApps) {
      for (const appId of diff.addApps) {
        steps.push({
          id: `step-${++stepIndex}`,
          type: 'app_install',
          description: `Install app: ${appId}`,
          status: 'pending',
          canRollback: true,
        });
      }

      // App removes
      for (const appId of diff.removeApps) {
        steps.push({
          id: `step-${++stepIndex}`,
          type: 'app_remove',
          description: `Remove app: ${appId}`,
          status: 'pending',
          canRollback: false, // App removal is not easily reversible
        });
      }
    }

    // Migrations
    for (const migration of diff.migrations) {
      steps.push({
        id: `step-${++stepIndex}`,
        type: 'migration',
        description: migration.description,
        status: 'pending',
        canRollback: migration.reversible,
      });
    }

    // Theme updates
    if (!options.skipTheme && diff.themeChanges.length > 0) {
      steps.push({
        id: `step-${++stepIndex}`,
        type: 'theme',
        description: `Update theme: ${diff.themeChanges.map(c => c.description).join(', ')}`,
        status: 'pending',
        canRollback: true,
      });
    }

    // Navigation updates
    if (!options.skipNavigation && diff.navigationUpdates.length > 0) {
      steps.push({
        id: `step-${++stepIndex}`,
        type: 'navigation',
        description: `Update navigation: ${diff.navigationUpdates.length} changes`,
        status: 'pending',
        canRollback: true,
      });
    }

    // InitPack application
    if (!options.skipInitPack && diff.initPackChanges) {
      steps.push({
        id: `step-${++stepIndex}`,
        type: 'initpack',
        description: `Apply InitPack: ${diff.initPackChanges.to}`,
        status: 'pending',
        canRollback: false,
      });
    }

    return steps;
  }

  /**
   * Run upgrade steps
   */
  private async runUpgradeSteps(
    record: UpgradeRecord,
    options: UpgradeOptions
  ): Promise<void> {
    for (const step of record.steps) {
      try {
        step.status = 'running';
        step.startedAt = new Date();

        await this.executeStep(record, step);

        step.status = 'completed';
        step.completedAt = new Date();
      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : String(error);
        step.completedAt = new Date();
        throw error;
      }
    }
  }

  /**
   * Execute a single upgrade step
   */
  private async executeStep(record: UpgradeRecord, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Executing step: ${step.description}`);

    switch (step.type) {
      case 'app_install':
        await this.executeAppInstall(record.tenantId, step);
        break;

      case 'app_remove':
        await this.executeAppRemove(record.tenantId, step);
        break;

      case 'migration':
        await this.executeMigration(record, step);
        break;

      case 'theme':
        await this.executeThemeUpdate(record.tenantId, step);
        break;

      case 'navigation':
        await this.executeNavigationUpdate(record.tenantId, step);
        break;

      case 'initpack':
        await this.executeInitPackApplication(record.tenantId, step);
        break;

      default:
        logger.warn(`[ServiceUpgrade] Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute app installation step
   */
  private async executeAppInstall(tenantId: string, step: UpgradeStep): Promise<void> {
    // In a real implementation, this would use AppManager to install the app
    // For now, we'll simulate the operation
    logger.info(`[ServiceUpgrade] Installing app for tenant ${tenantId}: ${step.description}`);
    await this.simulateOperation(500);
  }

  /**
   * Execute app removal step
   */
  private async executeAppRemove(tenantId: string, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Removing app for tenant ${tenantId}: ${step.description}`);
    await this.simulateOperation(300);
  }

  /**
   * Execute migration step
   */
  private async executeMigration(record: UpgradeRecord, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Running migration: ${step.description}`);
    // In a real implementation, this would run the migration script
    await this.simulateOperation(1000);
  }

  /**
   * Execute theme update step
   */
  private async executeThemeUpdate(tenantId: string, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Updating theme for tenant ${tenantId}`);
    await this.simulateOperation(200);
  }

  /**
   * Execute navigation update step
   */
  private async executeNavigationUpdate(tenantId: string, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Updating navigation for tenant ${tenantId}`);
    await this.simulateOperation(200);
  }

  /**
   * Execute InitPack application step
   */
  private async executeInitPackApplication(tenantId: string, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Applying InitPack for tenant ${tenantId}`);
    await this.simulateOperation(500);
  }

  /**
   * Simulate an async operation (for development)
   */
  private async simulateOperation(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Rollback
  // ===========================================================================

  /**
   * Rollback a failed upgrade
   */
  async rollback(upgradeId: string): Promise<void> {
    const record = this.upgradeRecords.get(upgradeId);
    if (!record) {
      throw new Error(`Upgrade record not found: ${upgradeId}`);
    }

    if (!record.rollbackAvailable) {
      throw new Error(`Rollback not available for upgrade ${upgradeId}`);
    }

    logger.info(`[ServiceUpgrade] Starting rollback for ${upgradeId}`);

    // Rollback completed steps in reverse order
    const completedSteps = record.steps
      .filter(s => s.status === 'completed' && s.canRollback)
      .reverse();

    for (const step of completedSteps) {
      try {
        await this.rollbackStep(record, step);
        logger.info(`[ServiceUpgrade] Rolled back step: ${step.description}`);
      } catch (error) {
        logger.error(`[ServiceUpgrade] Failed to rollback step: ${step.description}`, error);
      }
    }

    record.status = 'rolled_back';
    logger.info(`[ServiceUpgrade] Rollback completed for ${upgradeId}`);
  }

  /**
   * Rollback a single step
   */
  private async rollbackStep(record: UpgradeRecord, step: UpgradeStep): Promise<void> {
    logger.info(`[ServiceUpgrade] Rolling back: ${step.description}`);

    switch (step.type) {
      case 'app_install':
        // Uninstall the app that was installed
        await this.simulateOperation(300);
        break;

      case 'migration':
        // Run rollback script if available
        await this.simulateOperation(500);
        break;

      case 'theme':
        // Restore previous theme
        await this.simulateOperation(200);
        break;

      case 'navigation':
        // Restore previous navigation
        await this.simulateOperation(200);
        break;
    }
  }

  // ===========================================================================
  // Status & Query Methods
  // ===========================================================================

  /**
   * Get upgrade record by ID
   */
  getUpgradeRecord(upgradeId: string): UpgradeRecord | undefined {
    return this.upgradeRecords.get(upgradeId);
  }

  /**
   * Get current upgrade for tenant
   */
  getCurrentUpgrade(tenantId: string): UpgradeRecord | undefined {
    const upgradeId = this.currentUpgrades.get(tenantId);
    return upgradeId ? this.upgradeRecords.get(upgradeId) : undefined;
  }

  /**
   * Get upgrade history for tenant
   */
  getUpgradeHistory(tenantId: string): UpgradeRecord[] {
    return Array.from(this.upgradeRecords.values())
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Check if tenant has pending upgrades
   */
  async checkForUpgrades(tenantId: string): Promise<{
    hasUpgrade: boolean;
    currentVersion?: SemanticVersion;
    latestVersion?: SemanticVersion;
    upgradeType?: 'major' | 'minor' | 'patch';
  }> {
    const binding = versionedTemplateRegistry.getServiceBinding(tenantId);
    if (!binding) {
      return { hasUpgrade: false };
    }

    const targetVersion = binding.upgradeChannel === 'stable'
      ? versionedTemplateRegistry.getLatestStableVersion(binding.templateId)?.version
      : versionedTemplateRegistry.getLatestVersion(binding.templateId)?.version;

    if (!targetVersion || !isUpgradeRequired(binding.installedVersion, targetVersion)) {
      return { hasUpgrade: false };
    }

    // Determine upgrade type
    const current = binding.installedVersion.split('.').map(Number);
    const latest = targetVersion.split('.').map(Number);

    let upgradeType: 'major' | 'minor' | 'patch' = 'patch';
    if (latest[0] > current[0]) upgradeType = 'major';
    else if (latest[1] > current[1]) upgradeType = 'minor';

    return {
      hasUpgrade: true,
      currentVersion: binding.installedVersion,
      latestVersion: targetVersion,
      upgradeType,
    };
  }

  /**
   * Cancel a pending upgrade
   */
  cancelUpgrade(upgradeId: string): boolean {
    const record = this.upgradeRecords.get(upgradeId);
    if (!record || record.status !== 'pending') {
      return false;
    }

    record.status = 'cancelled';
    record.completedAt = new Date();
    this.currentUpgrades.delete(record.tenantId);
    return true;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let serviceUpgradeServiceInstance: ServiceUpgradeService | null = null;

export function getServiceUpgradeService(dataSource: DataSource): ServiceUpgradeService {
  if (!serviceUpgradeServiceInstance) {
    serviceUpgradeServiceInstance = new ServiceUpgradeService(dataSource);
  }
  return serviceUpgradeServiceInstance;
}

export default ServiceUpgradeService;
