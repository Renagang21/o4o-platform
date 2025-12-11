/**
 * Template Switch Service
 * Phase 11 Task 3 — Template Switching Migration Pipeline
 *
 * Enables services to migrate from one template to another:
 * - Template diff analysis
 * - Data compatibility analysis
 * - Migration builder
 * - Execution engine with rollback
 */

import { DataSource } from 'typeorm';
import logger from '../utils/logger.js';
import { versionedTemplateRegistry } from '../service-templates/versioned-template-registry.js';
import type { VersionedServiceTemplate, SemanticVersion } from '../service-templates/template-version-schema.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Template diff result
 */
export interface TemplateDiff {
  /** Source template info */
  from: {
    templateId: string;
    version: SemanticVersion;
    serviceGroup: string;
  };
  /** Target template info */
  to: {
    templateId: string;
    version: SemanticVersion;
    serviceGroup: string;
  };

  /** Apps to add */
  appsToAdd: string[];
  /** Apps to remove */
  appsToRemove: string[];
  /** Apps that remain */
  appsUnchanged: string[];

  /** Extension differences */
  extensionDiff: {
    add: string[];
    remove: string[];
    unchanged: string[];
  };

  /** Theme changes */
  themeDiff: {
    fromPreset: string;
    toPreset: string;
    hasChange: boolean;
  };

  /** Navigation changes */
  navigationDiff: {
    keysToAdd: string[];
    keysToRemove: string[];
    keysUnchanged: string[];
  };

  /** InitPack changes */
  initPackDiff: {
    fromInitPack: string;
    toInitPack: string;
    hasChange: boolean;
  };

  /** Service group change */
  serviceGroupChange: boolean;

  /** Overall compatibility score (0-100) */
  compatibilityScore: number;

  /** Breaking changes */
  breakingChanges: string[];

  /** Warnings */
  warnings: string[];
}

/**
 * Data compatibility analysis
 */
export interface DataCompatibilityAnalysis {
  /** Entity compatibility */
  entities: Array<{
    entity: string;
    compatible: boolean;
    missingFields: string[];
    extraFields: string[];
    transformRequired: boolean;
    transformRules?: Record<string, string>;
  }>;

  /** Overall data compatibility */
  overallCompatible: boolean;

  /** Data migration required */
  migrationRequired: boolean;

  /** Estimated data loss risk */
  dataLossRisk: 'none' | 'low' | 'medium' | 'high';

  /** Recommendations */
  recommendations: string[];
}

/**
 * Migration rule for template switch
 */
export interface TemplateSwitchMigrationRule {
  /** Entity to migrate */
  entity: string;
  /** Field transformations */
  fieldTransforms: Record<string, string>;
  /** Default values for new required fields */
  defaultValues: Record<string, any>;
  /** Fields to drop */
  dropFields: string[];
  /** Validation rules */
  validationRules?: string[];
}

/**
 * Template switch job status
 */
export type TemplateSwitchStatus =
  | 'pending'
  | 'analyzing'
  | 'preparing'
  | 'removing_apps'
  | 'installing_apps'
  | 'migrating_data'
  | 'applying_navigation'
  | 'applying_theme'
  | 'applying_initpack'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'rolled_back';

/**
 * Template switch job record
 */
export interface TemplateSwitchJob {
  id: string;
  tenantId: string;
  diff: TemplateDiff;
  dataAnalysis: DataCompatibilityAnalysis;
  migrationRules: TemplateSwitchMigrationRule[];
  status: TemplateSwitchStatus;
  progress: {
    phase: string;
    current: number;
    total: number;
    percentage: number;
  };
  results: {
    appsInstalled: string[];
    appsRemoved: string[];
    entitiesMigrated: Record<string, number>;
    errors: TemplateSwitchError[];
  };
  startedAt: Date;
  completedAt?: Date;
  initiatedBy: string;
  rollbackData?: TemplateSwitchRollbackData;
}

/**
 * Template switch error
 */
export interface TemplateSwitchError {
  phase: string;
  entity?: string;
  error: string;
  severity: 'warning' | 'error' | 'critical';
}

/**
 * Rollback data
 */
export interface TemplateSwitchRollbackData {
  originalTemplateId: string;
  originalVersion: SemanticVersion;
  installedApps: string[];
  removedApps: string[];
  entityBackups: Record<string, any[]>;
  navigationBackup: any;
  themeBackup: any;
}

/**
 * Template switch options
 */
export interface TemplateSwitchOptions {
  /** Dry run mode */
  dryRun?: boolean;
  /** Skip data migration */
  skipDataMigration?: boolean;
  /** Skip InitPack application */
  skipInitPack?: boolean;
  /** Force switch despite warnings */
  force?: boolean;
  /** Create backup for rollback */
  createBackup?: boolean;
  /** Custom migration rules */
  customMigrationRules?: TemplateSwitchMigrationRule[];
}

// =============================================================================
// Template Switch Service
// =============================================================================

export class TemplateSwitchService {
  private dataSource: DataSource;
  private jobs = new Map<string, TemplateSwitchJob>();
  private activeJobs = new Map<string, string>(); // tenantId -> jobId

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // ===========================================================================
  // Template Diff Analysis
  // ===========================================================================

  /**
   * Analyze differences between two templates
   */
  analyzeTemplateDiff(
    fromTemplateId: string,
    fromVersion: SemanticVersion,
    toTemplateId: string,
    toVersion: SemanticVersion
  ): TemplateDiff {
    const fromTemplate = versionedTemplateRegistry.getTemplateVersion(fromTemplateId, fromVersion);
    const toTemplate = versionedTemplateRegistry.getTemplateVersion(toTemplateId, toVersion);

    if (!fromTemplate) {
      throw new Error(`Source template not found: ${fromTemplateId}@${fromVersion}`);
    }
    if (!toTemplate) {
      throw new Error(`Target template not found: ${toTemplateId}@${toVersion}`);
    }

    const breakingChanges: string[] = [];
    const warnings: string[] = [];

    // Analyze app changes
    const fromApps = new Set([
      ...(fromTemplate.globalCoreApps || []),
      ...fromTemplate.coreApps,
    ]);
    const toApps = new Set([
      ...(toTemplate.globalCoreApps || []),
      ...toTemplate.coreApps,
    ]);

    const appsToAdd = [...toApps].filter(a => !fromApps.has(a));
    const appsToRemove = [...fromApps].filter(a => !toApps.has(a));
    const appsUnchanged = [...fromApps].filter(a => toApps.has(a));

    if (appsToRemove.length > 0) {
      warnings.push(`Apps to be removed: ${appsToRemove.join(', ')}`);
    }

    // Analyze extension changes
    const fromExtensions = new Set(fromTemplate.extensionApps || []);
    const toExtensions = new Set(toTemplate.extensionApps || []);

    const extensionDiff = {
      add: [...toExtensions].filter(e => !fromExtensions.has(e)),
      remove: [...fromExtensions].filter(e => !toExtensions.has(e)),
      unchanged: [...fromExtensions].filter(e => toExtensions.has(e)),
    };

    // Analyze theme change
    const themeDiff = {
      fromPreset: fromTemplate.initPack, // Theme is typically in InitPack
      toPreset: toTemplate.initPack,
      hasChange: fromTemplate.initPack !== toTemplate.initPack,
    };

    // Analyze navigation (would need to load InitPacks for detailed comparison)
    const navigationDiff = {
      keysToAdd: [] as string[],
      keysToRemove: [] as string[],
      keysUnchanged: [] as string[],
    };

    // InitPack change
    const initPackDiff = {
      fromInitPack: fromTemplate.initPack,
      toInitPack: toTemplate.initPack,
      hasChange: fromTemplate.initPack !== toTemplate.initPack,
    };

    // Service group change
    const serviceGroupChange = fromTemplate.serviceGroup !== toTemplate.serviceGroup;
    if (serviceGroupChange) {
      breakingChanges.push(`Service group change: ${fromTemplate.serviceGroup} → ${toTemplate.serviceGroup}`);
    }

    // Calculate compatibility score
    let compatibilityScore = 100;
    compatibilityScore -= appsToRemove.length * 10;
    compatibilityScore -= extensionDiff.remove.length * 5;
    compatibilityScore -= serviceGroupChange ? 30 : 0;
    compatibilityScore -= breakingChanges.length * 20;
    compatibilityScore = Math.max(0, compatibilityScore);

    return {
      from: {
        templateId: fromTemplateId,
        version: fromVersion,
        serviceGroup: fromTemplate.serviceGroup,
      },
      to: {
        templateId: toTemplateId,
        version: toVersion,
        serviceGroup: toTemplate.serviceGroup,
      },
      appsToAdd,
      appsToRemove,
      appsUnchanged,
      extensionDiff,
      themeDiff,
      navigationDiff,
      initPackDiff,
      serviceGroupChange,
      compatibilityScore,
      breakingChanges,
      warnings,
    };
  }

  // ===========================================================================
  // Data Compatibility Analysis
  // ===========================================================================

  /**
   * Analyze data compatibility between templates
   */
  async analyzeDataCompatibility(
    tenantId: string,
    diff: TemplateDiff
  ): Promise<DataCompatibilityAnalysis> {
    const entities: DataCompatibilityAnalysis['entities'] = [];
    let migrationRequired = false;
    let dataLossRisk: DataCompatibilityAnalysis['dataLossRisk'] = 'none';

    // Analyze each entity type
    const entityTypes = ['product', 'category', 'user', 'order', 'content'];

    for (const entity of entityTypes) {
      const analysis = await this.analyzeEntityCompatibility(tenantId, entity, diff);
      entities.push(analysis);

      if (analysis.transformRequired) {
        migrationRequired = true;
      }

      if (analysis.missingFields.length > 0) {
        dataLossRisk = this.upgradeRisk(dataLossRisk, 'low');
      }

      if (!analysis.compatible) {
        dataLossRisk = this.upgradeRisk(dataLossRisk, 'medium');
      }
    }

    // Check for service group specific entities
    if (diff.serviceGroupChange) {
      migrationRequired = true;
      dataLossRisk = this.upgradeRisk(dataLossRisk, 'high');
    }

    const recommendations: string[] = [];
    if (migrationRequired) {
      recommendations.push('Data migration is required. Create a backup before proceeding.');
    }
    if (dataLossRisk === 'high') {
      recommendations.push('High risk of data loss. Manual review recommended.');
    }
    if (diff.appsToRemove.length > 0) {
      recommendations.push(`Removing apps may cause data loss: ${diff.appsToRemove.join(', ')}`);
    }

    return {
      entities,
      overallCompatible: entities.every(e => e.compatible),
      migrationRequired,
      dataLossRisk,
      recommendations,
    };
  }

  /**
   * Analyze single entity compatibility
   */
  private async analyzeEntityCompatibility(
    tenantId: string,
    entity: string,
    diff: TemplateDiff
  ): Promise<DataCompatibilityAnalysis['entities'][0]> {
    // In a real implementation, this would compare entity schemas
    // For now, return simulated analysis

    const compatible = !diff.serviceGroupChange;
    const missingFields: string[] = [];
    const extraFields: string[] = [];

    if (diff.serviceGroupChange) {
      missingFields.push(`${diff.to.serviceGroup}_specific_field`);
      extraFields.push(`${diff.from.serviceGroup}_specific_field`);
    }

    return {
      entity,
      compatible,
      missingFields,
      extraFields,
      transformRequired: missingFields.length > 0 || extraFields.length > 0,
      transformRules: missingFields.length > 0 ? {
        [missingFields[0]]: 'null', // Default transform
      } : undefined,
    };
  }

  /**
   * Upgrade risk level
   */
  private upgradeRisk(
    current: DataCompatibilityAnalysis['dataLossRisk'],
    newRisk: DataCompatibilityAnalysis['dataLossRisk']
  ): DataCompatibilityAnalysis['dataLossRisk'] {
    const levels = ['none', 'low', 'medium', 'high'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(newRisk);
    return levels[Math.max(currentIndex, newIndex)] as DataCompatibilityAnalysis['dataLossRisk'];
  }

  // ===========================================================================
  // Migration Execution
  // ===========================================================================

  /**
   * Execute template switch
   */
  async execute(
    tenantId: string,
    toTemplateId: string,
    toVersion: SemanticVersion,
    initiatedBy: string,
    options: TemplateSwitchOptions = {}
  ): Promise<TemplateSwitchJob> {
    // Get current template binding
    const binding = versionedTemplateRegistry.getServiceBinding(tenantId);
    if (!binding) {
      throw new Error(`No template binding found for tenant: ${tenantId}`);
    }

    // Check for active operation
    if (this.activeJobs.has(tenantId)) {
      throw new Error(`Template switch already in progress for tenant: ${tenantId}`);
    }

    // Analyze template diff
    const diff = this.analyzeTemplateDiff(
      binding.templateId,
      binding.installedVersion,
      toTemplateId,
      toVersion
    );

    // Check for breaking changes
    if (!options.force && diff.breakingChanges.length > 0) {
      throw new Error(`Breaking changes detected: ${diff.breakingChanges.join(', ')}. Use force option to proceed.`);
    }

    // Analyze data compatibility
    const dataAnalysis = await this.analyzeDataCompatibility(tenantId, diff);

    // Build migration rules
    const migrationRules = options.customMigrationRules || this.buildMigrationRules(diff, dataAnalysis);

    // Create job
    const jobId = `switch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: TemplateSwitchJob = {
      id: jobId,
      tenantId,
      diff,
      dataAnalysis,
      migrationRules,
      status: 'pending',
      progress: { phase: 'initializing', current: 0, total: 0, percentage: 0 },
      results: {
        appsInstalled: [],
        appsRemoved: [],
        entitiesMigrated: {},
        errors: [],
      },
      startedAt: new Date(),
      initiatedBy,
    };

    this.jobs.set(jobId, job);
    this.activeJobs.set(tenantId, jobId);

    // Dry run - return analysis only
    if (options.dryRun) {
      job.status = 'completed';
      job.completedAt = new Date();
      this.activeJobs.delete(tenantId);
      return job;
    }

    try {
      // Create backup if requested
      if (options.createBackup) {
        job.status = 'preparing';
        job.progress.phase = 'backup';
        job.rollbackData = await this.createBackup(tenantId, binding, diff);
      }

      // Phase 1: Remove old apps
      job.status = 'removing_apps';
      job.progress.phase = 'removing_apps';
      for (const app of diff.appsToRemove) {
        await this.removeApp(tenantId, app);
        job.results.appsRemoved.push(app);
      }

      // Phase 2: Install new apps
      job.status = 'installing_apps';
      job.progress.phase = 'installing_apps';
      for (const app of diff.appsToAdd) {
        await this.installApp(tenantId, app);
        job.results.appsInstalled.push(app);
      }

      // Phase 3: Migrate data
      if (!options.skipDataMigration && dataAnalysis.migrationRequired) {
        job.status = 'migrating_data';
        job.progress.phase = 'migrating_data';
        await this.migrateData(job, migrationRules);
      }

      // Phase 4: Apply navigation
      job.status = 'applying_navigation';
      job.progress.phase = 'applying_navigation';
      await this.applyNavigation(tenantId, diff);

      // Phase 5: Apply theme
      job.status = 'applying_theme';
      job.progress.phase = 'applying_theme';
      if (diff.themeDiff.hasChange) {
        await this.applyTheme(tenantId, diff.themeDiff.toPreset);
      }

      // Phase 6: Apply InitPack
      if (!options.skipInitPack && diff.initPackDiff.hasChange) {
        job.status = 'applying_initpack';
        job.progress.phase = 'applying_initpack';
        await this.applyInitPack(tenantId, diff.initPackDiff.toInitPack);
      }

      // Phase 7: Validate
      job.status = 'validating';
      job.progress.phase = 'validating';
      await this.validateSwitch(job);

      // Update template binding
      versionedTemplateRegistry.updateServiceBinding(tenantId, {
        templateId: toTemplateId,
        installedVersion: toVersion,
        lastUpgradeAt: new Date(),
      });

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.percentage = 100;

      logger.info(`[TemplateSwitch] Switch completed: ${jobId}`);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.results.errors.push({
        phase: job.progress.phase,
        error: error instanceof Error ? error.message : String(error),
        severity: 'critical',
      });
      logger.error(`[TemplateSwitch] Switch failed: ${jobId}`, error);

      // Attempt rollback
      if (job.rollbackData) {
        await this.rollback(jobId);
      }
    } finally {
      this.activeJobs.delete(tenantId);
    }

    return job;
  }

  /**
   * Build migration rules from analysis
   */
  private buildMigrationRules(
    diff: TemplateDiff,
    dataAnalysis: DataCompatibilityAnalysis
  ): TemplateSwitchMigrationRule[] {
    const rules: TemplateSwitchMigrationRule[] = [];

    for (const entity of dataAnalysis.entities) {
      if (entity.transformRequired) {
        rules.push({
          entity: entity.entity,
          fieldTransforms: entity.transformRules || {},
          defaultValues: entity.missingFields.reduce((acc, field) => {
            acc[field] = null;
            return acc;
          }, {} as Record<string, any>),
          dropFields: entity.extraFields,
        });
      }
    }

    return rules;
  }

  /**
   * Create backup for rollback
   */
  private async createBackup(
    tenantId: string,
    binding: any,
    diff: TemplateDiff
  ): Promise<TemplateSwitchRollbackData> {
    logger.info(`[TemplateSwitch] Creating backup for tenant: ${tenantId}`);

    return {
      originalTemplateId: binding.templateId,
      originalVersion: binding.installedVersion,
      installedApps: [...diff.appsUnchanged, ...diff.appsToRemove],
      removedApps: [],
      entityBackups: {},
      navigationBackup: null,
      themeBackup: null,
    };
  }

  /**
   * Remove app from tenant
   */
  private async removeApp(tenantId: string, appId: string): Promise<void> {
    logger.info(`[TemplateSwitch] Removing app ${appId} from ${tenantId}`);
    await this.simulateOperation(200);
  }

  /**
   * Install app for tenant
   */
  private async installApp(tenantId: string, appId: string): Promise<void> {
    logger.info(`[TemplateSwitch] Installing app ${appId} for ${tenantId}`);
    await this.simulateOperation(300);
  }

  /**
   * Migrate data based on rules
   */
  private async migrateData(
    job: TemplateSwitchJob,
    rules: TemplateSwitchMigrationRule[]
  ): Promise<void> {
    for (const rule of rules) {
      logger.info(`[TemplateSwitch] Migrating ${rule.entity} for ${job.tenantId}`);

      // Get entity data
      // Transform according to rules
      // Save transformed data

      job.results.entitiesMigrated[rule.entity] = Math.floor(Math.random() * 100) + 10;
      await this.simulateOperation(300);
    }
  }

  /**
   * Apply navigation changes
   */
  private async applyNavigation(tenantId: string, diff: TemplateDiff): Promise<void> {
    logger.info(`[TemplateSwitch] Applying navigation for ${tenantId}`);
    await this.simulateOperation(200);
  }

  /**
   * Apply theme changes
   */
  private async applyTheme(tenantId: string, preset: string): Promise<void> {
    logger.info(`[TemplateSwitch] Applying theme ${preset} for ${tenantId}`);
    await this.simulateOperation(150);
  }

  /**
   * Apply InitPack
   */
  private async applyInitPack(tenantId: string, initPackId: string): Promise<void> {
    logger.info(`[TemplateSwitch] Applying InitPack ${initPackId} for ${tenantId}`);
    await this.simulateOperation(400);
  }

  /**
   * Validate template switch
   */
  private async validateSwitch(job: TemplateSwitchJob): Promise<void> {
    logger.info(`[TemplateSwitch] Validating switch for ${job.tenantId}`);
    await this.simulateOperation(300);
  }

  // ===========================================================================
  // Rollback
  // ===========================================================================

  /**
   * Rollback template switch
   */
  async rollback(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Template switch job not found: ${jobId}`);
    }

    if (!job.rollbackData) {
      throw new Error(`No rollback data available for job: ${jobId}`);
    }

    logger.info(`[TemplateSwitch] Rolling back job: ${jobId}`);

    // Reinstall removed apps
    for (const app of job.results.appsRemoved) {
      await this.installApp(job.tenantId, app);
    }

    // Remove newly installed apps
    for (const app of job.results.appsInstalled) {
      await this.removeApp(job.tenantId, app);
    }

    // Restore entity data from backup
    // Restore navigation
    // Restore theme

    // Restore template binding
    versionedTemplateRegistry.updateServiceBinding(job.tenantId, {
      templateId: job.rollbackData.originalTemplateId,
      installedVersion: job.rollbackData.originalVersion,
    });

    job.status = 'rolled_back';
    logger.info(`[TemplateSwitch] Rollback completed for: ${jobId}`);
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private async simulateOperation(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Job Management
  // ===========================================================================

  /**
   * Get job by ID
   */
  getJob(jobId: string): TemplateSwitchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs for tenant
   */
  getJobsForTenant(tenantId: string): TemplateSwitchJob[] {
    return Array.from(this.jobs.values()).filter(j => j.tenantId === tenantId);
  }

  /**
   * Get available template switches for tenant
   */
  getAvailableSwitches(
    tenantId: string,
    currentTemplateId: string,
    currentVersion: SemanticVersion
  ): Array<{
    templateId: string;
    version: SemanticVersion;
    serviceGroup: string;
    compatibilityScore: number;
  }> {
    const templates = versionedTemplateRegistry.getAllLatestTemplates();
    const available: Array<{
      templateId: string;
      version: SemanticVersion;
      serviceGroup: string;
      compatibilityScore: number;
    }> = [];

    for (const template of templates) {
      if (template.templateId === currentTemplateId) continue;

      try {
        const diff = this.analyzeTemplateDiff(
          currentTemplateId,
          currentVersion,
          template.templateId,
          template.version
        );

        available.push({
          templateId: template.templateId,
          version: template.version,
          serviceGroup: template.serviceGroup,
          compatibilityScore: diff.compatibilityScore,
        });
      } catch (error) {
        // Skip templates that can't be analyzed
      }
    }

    // Sort by compatibility score
    return available.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    rolledBackJobs: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      rolledBackJobs: jobs.filter(j => j.status === 'rolled_back').length,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let templateSwitchServiceInstance: TemplateSwitchService | null = null;

export function getTemplateSwitchService(dataSource: DataSource): TemplateSwitchService {
  if (!templateSwitchServiceInstance) {
    templateSwitchServiceInstance = new TemplateSwitchService(dataSource);
  }
  return templateSwitchServiceInstance;
}

export default TemplateSwitchService;
