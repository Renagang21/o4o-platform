/**
 * Service Monitor Service
 * Phase 9 Task 3 — Multi-Service Monitoring & Validation Dashboard
 *
 * Provides comprehensive monitoring capabilities for all services (tenants)
 * in the O4O Platform multi-tenant environment.
 */

import { AppDataSource } from '../database/connection.js';
import { Site, SiteStatus } from '../modules/sites/site.entity.js';
import { App } from '../entities/App.js';
import { CustomPostType } from '../entities/CustomPostType.js';
import logger from '../utils/logger.js';

// Types for service monitoring
export interface TenantInfo {
  tenantId: string;
  domain: string;
  name: string;
  serviceGroup: string;
  template: string;
  installedApps: number;
  installedAppsList: string[];
  theme: string | null;
  navigationItems: number;
  viewsRegistered: number;
  status: 'healthy' | 'warning' | 'critical';
  siteStatus: SiteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppsMatrixEntry {
  tenantId: string;
  serviceGroup: string;
  apps: Record<string, boolean>;
}

export interface AppsMatrix {
  tenants: AppsMatrixEntry[];
  allApps: string[];
  coreApps: string[];
  extensionApps: string[];
}

export interface ThemeStatus {
  tenantId: string;
  serviceGroup: string;
  themeId: string | null;
  themePreset: string | null;
  hasOverrides: boolean;
  cssVariablesGenerated: boolean;
  status: 'ok' | 'warning' | 'error';
  issues: string[];
}

export interface ValidationWarning {
  tenantId: string;
  serviceGroup: string;
  issueType: 'NavigationMismatch' | 'MissingView' | 'IncorrectAppInstallation' | 'ThemePresetMismatch' | 'CrossTenantLeakage' | 'MissingCoreApp' | 'Other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: Record<string, any>;
  detectedAt: Date;
}

export interface SystemSummary {
  totalTenants: number;
  healthyTenants: number;
  warningTenants: number;
  criticalTenants: number;
  totalAppsInstalled: number;
  uniqueApps: number;
  averageAppsPerTenant: number;
  serviceGroups: Record<string, number>;
  healthScore: number;
  isolationScore: number;
  navigationMatchScore: number;
  viewResolutionAccuracy: number;
  lastValidationAt: Date | null;
  warnings: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  // Phase 9 Task 4 - Quality Score
  qualityScore: number;
  qualityIssues: {
    critical: number;
    warnings: number;
    passed: number;
  };
  perTenantScore: Record<string, number>;
}

export interface ValidationResult {
  success: boolean;
  timestamp: Date;
  duration: number;
  tenantsValidated: number;
  warnings: ValidationWarning[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface ValidationReport {
  generatedAt: Date;
  format: string;
  summary: SystemSummary;
  tenants: TenantInfo[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

/**
 * Service Monitor Service
 */
export class ServiceMonitorService {
  private siteRepository = AppDataSource.getRepository(Site);
  private appRepository = AppDataSource.getRepository(App);
  private cptRepository = AppDataSource.getRepository(CustomPostType);

  // Cache for validation warnings
  private cachedWarnings: ValidationWarning[] = [];
  private lastValidationTime: Date | null = null;

  /**
   * Get all tenants with metadata
   */
  async getAllTenants(): Promise<TenantInfo[]> {
    try {
      const sites = await this.siteRepository.find({
        order: { createdAt: 'DESC' },
      });

      return sites.map(site => this.mapSiteToTenantInfo(site));
    } catch (error) {
      logger.error('[ServiceMonitor] Error fetching tenants:', error);
      return [];
    }
  }

  /**
   * Get apps matrix for all tenants
   */
  async getAppsMatrix(): Promise<AppsMatrix> {
    try {
      const sites = await this.siteRepository.find();
      const allInstalledApps = new Set<string>();

      // Collect all unique apps
      sites.forEach(site => {
        (site.apps || []).forEach(app => allInstalledApps.add(app));
      });

      const allApps = Array.from(allInstalledApps).sort();

      // Core apps (typically required by all services)
      const coreApps = ['cms-core', 'organization-core'];
      const extensionApps = allApps.filter(app => !coreApps.includes(app));

      // Build matrix
      const tenants: AppsMatrixEntry[] = sites.map(site => {
        const apps: Record<string, boolean> = {};
        allApps.forEach(app => {
          apps[app] = (site.apps || []).includes(app);
        });

        return {
          tenantId: site.domain,
          serviceGroup: this.detectServiceGroup(site.template, site.apps || []),
          apps,
        };
      });

      return {
        tenants,
        allApps,
        coreApps,
        extensionApps,
      };
    } catch (error) {
      logger.error('[ServiceMonitor] Error building apps matrix:', error);
      return {
        tenants: [],
        allApps: [],
        coreApps: [],
        extensionApps: [],
      };
    }
  }

  /**
   * Get theme status for all tenants
   */
  async getThemesStatus(): Promise<ThemeStatus[]> {
    try {
      const sites = await this.siteRepository.find();

      return sites.map(site => {
        const config = site.config || {};
        const issues: string[] = [];

        // Check theme configuration
        const themeId = config.theme?.id || null;
        const themePreset = config.theme?.preset || null;
        const hasOverrides = !!(config.theme?.overrides && Object.keys(config.theme.overrides).length > 0);
        const cssVariablesGenerated = !!(config.variables && Object.keys(config.variables).length > 0);

        // Detect issues
        if (!themeId && !themePreset) {
          issues.push('No theme configured');
        }

        const serviceGroup = this.detectServiceGroup(site.template, site.apps || []);
        if (themePreset && !themePreset.includes(serviceGroup)) {
          issues.push(`Theme preset mismatch: ${themePreset} for ${serviceGroup} service`);
        }

        return {
          tenantId: site.domain,
          serviceGroup,
          themeId,
          themePreset,
          hasOverrides,
          cssVariablesGenerated,
          status: issues.length === 0 ? 'ok' : issues.length === 1 ? 'warning' : 'error',
          issues,
        };
      });
    } catch (error) {
      logger.error('[ServiceMonitor] Error getting themes status:', error);
      return [];
    }
  }

  /**
   * Get validation warnings
   */
  async getValidationWarnings(): Promise<ValidationWarning[]> {
    // Return cached warnings if recent (within 5 minutes)
    if (this.lastValidationTime && Date.now() - this.lastValidationTime.getTime() < 5 * 60 * 1000) {
      return this.cachedWarnings;
    }

    // Run new validation
    await this.runFullValidation();
    return this.cachedWarnings;
  }

  /**
   * Get system summary
   */
  async getSystemSummary(): Promise<SystemSummary> {
    try {
      const sites = await this.siteRepository.find();
      const warnings = await this.getValidationWarnings();

      // Count by service group
      const serviceGroups: Record<string, number> = {};
      sites.forEach(site => {
        const group = this.detectServiceGroup(site.template, site.apps || []);
        serviceGroups[group] = (serviceGroups[group] || 0) + 1;
      });

      // Count by status
      let healthyTenants = 0;
      let warningTenants = 0;
      let criticalTenants = 0;

      sites.forEach(site => {
        const tenantWarnings = warnings.filter(w => w.tenantId === site.domain);
        const hasCritical = tenantWarnings.some(w => w.severity === 'critical');
        const hasHigh = tenantWarnings.some(w => w.severity === 'high');

        if (hasCritical) {
          criticalTenants++;
        } else if (hasHigh || tenantWarnings.length > 0) {
          warningTenants++;
        } else {
          healthyTenants++;
        }
      });

      // Count apps
      const allApps = new Set<string>();
      let totalAppsInstalled = 0;

      sites.forEach(site => {
        const apps = site.apps || [];
        totalAppsInstalled += apps.length;
        apps.forEach(app => allApps.add(app));
      });

      // Count warnings by severity
      const warningCounts = {
        total: warnings.length,
        critical: warnings.filter(w => w.severity === 'critical').length,
        high: warnings.filter(w => w.severity === 'high').length,
        medium: warnings.filter(w => w.severity === 'medium').length,
        low: warnings.filter(w => w.severity === 'low').length,
      };

      // Calculate scores (0-100)
      const healthScore = sites.length > 0 ? Math.round((healthyTenants / sites.length) * 100) : 100;
      const isolationScore = this.calculateIsolationScore(sites, warnings);
      const navigationMatchScore = this.calculateNavigationScore(warnings);
      const viewResolutionAccuracy = this.calculateViewAccuracy(warnings);

      // Phase 9 Task 4 - Quality Score calculation
      // Formula: 100 - criticalErrors * 20 - warnings * 5 - missingApps * 10 - baselineDeviation * 10
      const criticalErrors = warningCounts.critical + warningCounts.high;
      const warningErrors = warningCounts.medium + warningCounts.low;
      const missingAppsCount = warnings.filter(w => w.issueType === 'MissingCoreApp' || w.issueType === 'IncorrectAppInstallation').length;
      const baselineDeviationCount = warnings.filter(w => w.issueType === 'NavigationMismatch' || w.issueType === 'ThemePresetMismatch').length;

      const qualityScore = Math.max(0, Math.min(100,
        100 -
        (criticalErrors * 20) -
        (warningErrors * 5) -
        (missingAppsCount * 10) -
        (baselineDeviationCount * 10)
      ));

      // Per-tenant quality scores
      const perTenantScore: Record<string, number> = {};
      sites.forEach(site => {
        const tenantWarnings = warnings.filter(w => w.tenantId === site.domain);
        const criticalCount = tenantWarnings.filter(w => w.severity === 'critical' || w.severity === 'high').length;
        const warningCount = tenantWarnings.filter(w => w.severity === 'medium' || w.severity === 'low').length;
        perTenantScore[site.domain] = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 5));
      });

      // Quality issues summary
      const qualityIssues = {
        critical: criticalErrors,
        warnings: warningErrors,
        passed: sites.length - criticalTenants - warningTenants,
      };

      return {
        totalTenants: sites.length,
        healthyTenants,
        warningTenants,
        criticalTenants,
        totalAppsInstalled,
        uniqueApps: allApps.size,
        averageAppsPerTenant: sites.length > 0 ? Math.round(totalAppsInstalled / sites.length * 10) / 10 : 0,
        serviceGroups,
        healthScore,
        isolationScore,
        navigationMatchScore,
        viewResolutionAccuracy,
        lastValidationAt: this.lastValidationTime,
        warnings: warningCounts,
        qualityScore,
        qualityIssues,
        perTenantScore,
      };
    } catch (error) {
      logger.error('[ServiceMonitor] Error getting system summary:', error);
      throw error;
    }
  }

  /**
   * Get detailed info for a specific tenant
   */
  async getTenantDetails(tenantId: string): Promise<TenantInfo | null> {
    try {
      const site = await this.siteRepository.findOne({
        where: { domain: tenantId },
      });

      if (!site) {
        return null;
      }

      return this.mapSiteToTenantInfo(site);
    } catch (error) {
      logger.error('[ServiceMonitor] Error getting tenant details:', error);
      return null;
    }
  }

  /**
   * Run full validation for all services
   */
  async runFullValidation(): Promise<ValidationResult> {
    const startTime = Date.now();
    const warnings: ValidationWarning[] = [];

    try {
      const sites = await this.siteRepository.find();

      for (const site of sites) {
        const tenantWarnings = await this.validateTenant(site);
        warnings.push(...tenantWarnings);
      }

      // Cross-tenant validation
      const crossTenantWarnings = await this.validateCrossTenantIsolation(sites);
      warnings.push(...crossTenantWarnings);

      // Update cache
      this.cachedWarnings = warnings;
      this.lastValidationTime = new Date();

      const duration = Date.now() - startTime;

      return {
        success: true,
        timestamp: new Date(),
        duration,
        tenantsValidated: sites.length,
        warnings,
        summary: {
          passed: sites.length - warnings.filter(w => w.severity === 'critical' || w.severity === 'high').length,
          failed: warnings.filter(w => w.severity === 'critical' || w.severity === 'high').length,
          skipped: 0,
        },
      };
    } catch (error) {
      logger.error('[ServiceMonitor] Validation failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        tenantsValidated: 0,
        warnings: [],
        summary: { passed: 0, failed: 0, skipped: 0 },
      };
    }
  }

  /**
   * Generate validation report
   */
  async generateReport(format: string = 'json'): Promise<ValidationReport | string> {
    const summary = await this.getSystemSummary();
    const tenants = await this.getAllTenants();
    const warnings = await this.getValidationWarnings();

    const recommendations = this.generateRecommendations(summary, warnings);

    const report: ValidationReport = {
      generatedAt: new Date(),
      format,
      summary,
      tenants,
      warnings,
      recommendations,
    };

    if (format === 'csv') {
      return this.convertReportToCSV(report);
    }

    return report;
  }

  // Private helper methods

  private mapSiteToTenantInfo(site: Site): TenantInfo {
    const config = site.config || {};
    const apps = site.apps || [];
    const warnings = this.cachedWarnings.filter(w => w.tenantId === site.domain);

    const hasCritical = warnings.some(w => w.severity === 'critical');
    const hasHigh = warnings.some(w => w.severity === 'high');

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (hasCritical) {
      status = 'critical';
    } else if (hasHigh || warnings.length > 0) {
      status = 'warning';
    }

    return {
      tenantId: site.domain,
      domain: site.domain,
      name: site.name || site.domain,
      serviceGroup: this.detectServiceGroup(site.template, apps),
      template: site.template,
      installedApps: apps.length,
      installedAppsList: apps,
      theme: config.theme?.id || config.theme?.preset || null,
      navigationItems: (config.navigation?.items || []).length,
      viewsRegistered: 0, // Would need view registry to calculate
      status,
      siteStatus: site.status,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  }

  private detectServiceGroup(template: string, apps: string[]): string {
    // Detect from template name
    if (template) {
      if (template.includes('cosmetics')) return 'cosmetics';
      if (template.includes('yaksa') || template.includes('pharmacy')) return 'yaksa';
      if (template.includes('forum')) return 'forum';
      if (template.includes('ecommerce') || template.includes('commerce')) return 'ecommerce';
    }

    // Detect from installed apps
    if (apps.includes('cosmetics-core') || apps.includes('cosmetics-seller')) return 'cosmetics';
    if (apps.includes('yaksa-core') || apps.includes('yaksa-member')) return 'yaksa';
    if (apps.includes('forum-core') || apps.includes('forum-yaksa')) return 'forum';

    return 'default';
  }

  private async validateTenant(site: Site): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];
    const tenantId = site.domain;
    const serviceGroup = this.detectServiceGroup(site.template, site.apps || []);
    const apps = site.apps || [];

    // Check for missing core apps
    const coreApps = ['cms-core', 'organization-core'];
    for (const coreApp of coreApps) {
      if (!apps.includes(coreApp)) {
        warnings.push({
          tenantId,
          serviceGroup,
          issueType: 'MissingCoreApp',
          severity: 'high',
          description: `Missing required core app: ${coreApp}`,
          details: { missingApp: coreApp },
          detectedAt: new Date(),
        });
      }
    }

    // Check for service-specific required apps
    const serviceRequiredApps: Record<string, string[]> = {
      cosmetics: ['cosmetics-core'],
      yaksa: ['yaksa-core'],
      forum: ['forum-core'],
    };

    if (serviceRequiredApps[serviceGroup]) {
      for (const requiredApp of serviceRequiredApps[serviceGroup]) {
        if (!apps.includes(requiredApp)) {
          warnings.push({
            tenantId,
            serviceGroup,
            issueType: 'IncorrectAppInstallation',
            severity: 'medium',
            description: `Service ${serviceGroup} missing required app: ${requiredApp}`,
            details: { missingApp: requiredApp, serviceGroup },
            detectedAt: new Date(),
          });
        }
      }
    }

    // Check for apps that shouldn't be installed for this service
    const serviceExcludedApps: Record<string, string[]> = {
      cosmetics: ['yaksa-core', 'yaksa-member'],
      yaksa: ['cosmetics-core', 'cosmetics-seller'],
    };

    if (serviceExcludedApps[serviceGroup]) {
      for (const excludedApp of serviceExcludedApps[serviceGroup]) {
        if (apps.includes(excludedApp)) {
          warnings.push({
            tenantId,
            serviceGroup,
            issueType: 'IncorrectAppInstallation',
            severity: 'medium',
            description: `Service ${serviceGroup} has incompatible app: ${excludedApp}`,
            details: { incompatibleApp: excludedApp, serviceGroup },
            detectedAt: new Date(),
          });
        }
      }
    }

    // Check theme configuration
    const config = site.config || {};
    if (!config.theme) {
      warnings.push({
        tenantId,
        serviceGroup,
        issueType: 'ThemePresetMismatch',
        severity: 'low',
        description: 'No theme configured for tenant',
        detectedAt: new Date(),
      });
    }

    return warnings;
  }

  private async validateCrossTenantIsolation(sites: Site[]): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Group sites by service group
    const sitesByGroup: Record<string, Site[]> = {};
    sites.forEach(site => {
      const group = this.detectServiceGroup(site.template, site.apps || []);
      if (!sitesByGroup[group]) {
        sitesByGroup[group] = [];
      }
      sitesByGroup[group].push(site);
    });

    // Check for potential cross-tenant data leakage patterns
    // This is a simplified check - real implementation would check actual data

    return warnings;
  }

  private calculateIsolationScore(sites: Site[], warnings: ValidationWarning[]): number {
    if (sites.length === 0) return 100;

    const isolationWarnings = warnings.filter(w =>
      w.issueType === 'CrossTenantLeakage' ||
      w.issueType === 'IncorrectAppInstallation'
    );

    const penalty = isolationWarnings.length * 10;
    return Math.max(0, 100 - penalty);
  }

  private calculateNavigationScore(warnings: ValidationWarning[]): number {
    const navWarnings = warnings.filter(w => w.issueType === 'NavigationMismatch');
    const penalty = navWarnings.length * 15;
    return Math.max(0, 100 - penalty);
  }

  private calculateViewAccuracy(warnings: ValidationWarning[]): number {
    const viewWarnings = warnings.filter(w => w.issueType === 'MissingView');
    const penalty = viewWarnings.length * 10;
    return Math.max(0, 100 - penalty);
  }

  private generateRecommendations(summary: SystemSummary, warnings: ValidationWarning[]): string[] {
    const recommendations: string[] = [];

    if (summary.healthScore < 80) {
      recommendations.push('Overall health score is below 80%. Review critical and high severity warnings.');
    }

    if (summary.isolationScore < 90) {
      recommendations.push('Isolation score indicates potential cross-service contamination. Audit app installations.');
    }

    if (summary.warnings.critical > 0) {
      recommendations.push(`${summary.warnings.critical} critical issues require immediate attention.`);
    }

    const missingCoreApps = warnings.filter(w => w.issueType === 'MissingCoreApp');
    if (missingCoreApps.length > 0) {
      recommendations.push(`${missingCoreApps.length} tenants are missing required core apps. Run app installation.`);
    }

    const themeIssues = warnings.filter(w => w.issueType === 'ThemePresetMismatch');
    if (themeIssues.length > 0) {
      recommendations.push(`${themeIssues.length} tenants have theme configuration issues. Review theme presets.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All services are operating normally. No immediate action required.');
    }

    return recommendations;
  }

  private convertReportToCSV(report: ValidationReport): string {
    const lines: string[] = [];

    // Header
    lines.push('Service Validation Report');
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push('');

    // Summary
    lines.push('=== Summary ===');
    lines.push(`Total Tenants,${report.summary.totalTenants}`);
    lines.push(`Healthy,${report.summary.healthyTenants}`);
    lines.push(`Warning,${report.summary.warningTenants}`);
    lines.push(`Critical,${report.summary.criticalTenants}`);
    lines.push(`Health Score,${report.summary.healthScore}%`);
    lines.push(`Isolation Score,${report.summary.isolationScore}%`);
    lines.push('');

    // Tenants
    lines.push('=== Tenants ===');
    lines.push('Tenant ID,Service Group,Status,Installed Apps,Theme');
    report.tenants.forEach(tenant => {
      lines.push(`${tenant.tenantId},${tenant.serviceGroup},${tenant.status},${tenant.installedApps},${tenant.theme || 'none'}`);
    });
    lines.push('');

    // Warnings
    lines.push('=== Warnings ===');
    lines.push('Tenant ID,Issue Type,Severity,Description');
    report.warnings.forEach(warning => {
      lines.push(`${warning.tenantId},${warning.issueType},${warning.severity},"${warning.description}"`);
    });
    lines.push('');

    // Recommendations
    lines.push('=== Recommendations ===');
    report.recommendations.forEach(rec => {
      lines.push(`"${rec}"`);
    });

    return lines.join('\n');
  }
}
