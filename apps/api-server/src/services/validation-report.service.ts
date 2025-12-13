/**
 * Validation Report Service
 * Phase 9 Task 3.3 — Cross-Service Validation Report Generator
 *
 * Generates comprehensive validation reports for multi-tenant services,
 * classifying issues by service group and providing export capabilities.
 */

import { ServiceMonitorService, ValidationWarning, SystemSummary, TenantInfo } from './service-monitor.service.js';
import logger from '../utils/logger.js';

export interface ReportSection {
  title: string;
  items: ReportItem[];
}

export interface ReportItem {
  label: string;
  value: string | number;
  status?: 'ok' | 'warning' | 'error';
}

export interface ServiceGroupReport {
  serviceGroup: string;
  tenantCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  installedApps: string[];
  commonIssues: Array<{
    issueType: string;
    count: number;
    severity: string;
  }>;
  recommendations: string[];
}

export interface FullValidationReport {
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
    format: 'full' | 'summary' | 'issues-only';
  };
  executive: {
    overallHealth: string;
    healthScore: number;
    totalTenants: number;
    criticalIssues: number;
    keyFindings: string[];
  };
  summary: SystemSummary;
  serviceGroups: ServiceGroupReport[];
  tenants: TenantInfo[];
  warnings: ValidationWarning[];
  recommendations: string[];
  appendix: {
    appsCoverage: Record<string, number>;
    issueDistribution: Record<string, number>;
    trendData?: any;
  };
}

/**
 * Validation Report Service
 */
export class ValidationReportService {
  private serviceMonitor: ServiceMonitorService;

  constructor() {
    this.serviceMonitor = new ServiceMonitorService();
  }

  /**
   * Generate full validation report
   */
  async generateFullReport(): Promise<FullValidationReport> {
    const summary = await this.serviceMonitor.getSystemSummary();
    const tenants = await this.serviceMonitor.getAllTenants();
    const warnings = await this.serviceMonitor.getValidationWarnings();
    const appsMatrix = await this.serviceMonitor.getAppsMatrix();

    // Group by service group
    const serviceGroups = this.generateServiceGroupReports(tenants, warnings);

    // Generate executive summary
    const executive = this.generateExecutiveSummary(summary, warnings);

    // Generate recommendations
    const recommendations = this.generateDetailedRecommendations(summary, warnings, serviceGroups);

    // Generate appendix data
    const appendix = this.generateAppendix(tenants, warnings, appsMatrix);

    return {
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'O4O Platform Validation Report Service',
        version: '1.0.0',
        format: 'full',
      },
      executive,
      summary,
      serviceGroups,
      tenants,
      warnings,
      recommendations,
      appendix,
    };
  }

  /**
   * Generate summary-only report
   */
  async generateSummaryReport(): Promise<Partial<FullValidationReport>> {
    const summary = await this.serviceMonitor.getSystemSummary();
    const warnings = await this.serviceMonitor.getValidationWarnings();
    const tenants = await this.serviceMonitor.getAllTenants();

    const executive = this.generateExecutiveSummary(summary, warnings);
    const serviceGroups = this.generateServiceGroupReports(tenants, warnings);

    return {
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'O4O Platform Validation Report Service',
        version: '1.0.0',
        format: 'summary',
      },
      executive,
      summary,
      serviceGroups,
      recommendations: this.generateDetailedRecommendations(summary, warnings, serviceGroups),
    };
  }

  /**
   * Generate issues-only report
   */
  async generateIssuesReport(): Promise<Partial<FullValidationReport>> {
    const warnings = await this.serviceMonitor.getValidationWarnings();
    const tenants = await this.serviceMonitor.getAllTenants();

    // Group warnings by service group
    const serviceGroups = this.generateServiceGroupReports(tenants, warnings);

    return {
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'O4O Platform Validation Report Service',
        version: '1.0.0',
        format: 'issues-only',
      },
      warnings,
      serviceGroups: serviceGroups.filter(g => g.warningCount > 0 || g.criticalCount > 0),
    };
  }

  /**
   * Export report to JSON
   */
  async exportJSON(): Promise<string> {
    const report = await this.generateFullReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to CSV
   */
  async exportCSV(): Promise<string> {
    const report = await this.generateFullReport();
    return this.convertToCSV(report);
  }

  // Private helper methods

  private generateServiceGroupReports(tenants: TenantInfo[], warnings: ValidationWarning[]): ServiceGroupReport[] {
    // Group tenants by service group
    const groups = new Map<string, TenantInfo[]>();

    tenants.forEach(tenant => {
      const group = tenant.serviceGroup;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(tenant);
    });

    const reports: ServiceGroupReport[] = [];

    groups.forEach((groupTenants, serviceGroup) => {
      const groupWarnings = warnings.filter(w => w.serviceGroup === serviceGroup);

      // Count by status
      let healthyCount = 0;
      let warningCount = 0;
      let criticalCount = 0;

      groupTenants.forEach(tenant => {
        if (tenant.status === 'healthy') healthyCount++;
        else if (tenant.status === 'warning') warningCount++;
        else criticalCount++;
      });

      // Get all installed apps
      const installedApps = new Set<string>();
      groupTenants.forEach(tenant => {
        tenant.installedAppsList.forEach(app => installedApps.add(app));
      });

      // Count common issues
      const issueTypeCounts = new Map<string, { count: number; severity: string }>();
      groupWarnings.forEach(warning => {
        const key = warning.issueType;
        if (!issueTypeCounts.has(key)) {
          issueTypeCounts.set(key, { count: 0, severity: warning.severity });
        }
        issueTypeCounts.get(key)!.count++;
      });

      const commonIssues = Array.from(issueTypeCounts.entries())
        .map(([issueType, data]) => ({
          issueType,
          count: data.count,
          severity: data.severity,
        }))
        .sort((a, b) => b.count - a.count);

      // Generate recommendations for this group
      const recommendations = this.generateGroupRecommendations(serviceGroup, groupWarnings, groupTenants);

      reports.push({
        serviceGroup,
        tenantCount: groupTenants.length,
        healthyCount,
        warningCount,
        criticalCount,
        installedApps: Array.from(installedApps),
        commonIssues,
        recommendations,
      });
    });

    return reports.sort((a, b) => b.tenantCount - a.tenantCount);
  }

  private generateExecutiveSummary(
    summary: SystemSummary,
    warnings: ValidationWarning[]
  ): FullValidationReport['executive'] {
    let overallHealth: string;

    if (summary.healthScore >= 90) {
      overallHealth = 'Excellent';
    } else if (summary.healthScore >= 75) {
      overallHealth = 'Good';
    } else if (summary.healthScore >= 50) {
      overallHealth = 'Fair';
    } else {
      overallHealth = 'Critical';
    }

    const keyFindings: string[] = [];

    if (summary.criticalTenants > 0) {
      keyFindings.push(`${summary.criticalTenants} tenant(s) in critical state requiring immediate attention`);
    }

    if (summary.warnings.critical > 0) {
      keyFindings.push(`${summary.warnings.critical} critical issue(s) detected across all services`);
    }

    if (summary.isolationScore < 90) {
      keyFindings.push(`Tenant isolation score (${summary.isolationScore}%) below recommended threshold`);
    }

    if (summary.navigationMatchScore < 95) {
      keyFindings.push(`Navigation configuration issues detected in some tenants`);
    }

    const missingCoreApps = warnings.filter(w => w.issueType === 'MissingCoreApp').length;
    if (missingCoreApps > 0) {
      keyFindings.push(`${missingCoreApps} tenant(s) missing required core applications`);
    }

    if (keyFindings.length === 0) {
      keyFindings.push('All services operating within normal parameters');
    }

    return {
      overallHealth,
      healthScore: summary.healthScore,
      totalTenants: summary.totalTenants,
      criticalIssues: summary.warnings.critical,
      keyFindings,
    };
  }

  private generateDetailedRecommendations(
    summary: SystemSummary,
    warnings: ValidationWarning[],
    serviceGroups: ServiceGroupReport[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical issues first
    if (summary.warnings.critical > 0) {
      recommendations.push(
        `URGENT: Address ${summary.warnings.critical} critical issue(s) immediately to prevent service disruption.`
      );
    }

    // Missing core apps
    const missingCoreApps = warnings.filter(w => w.issueType === 'MissingCoreApp');
    if (missingCoreApps.length > 0) {
      const affectedTenants = [...new Set(missingCoreApps.map(w => w.tenantId))];
      recommendations.push(
        `Install missing core applications for ${affectedTenants.length} tenant(s): Run 'pnpm run apps:install-core' for affected services.`
      );
    }

    // App installation issues
    const appIssues = warnings.filter(w => w.issueType === 'IncorrectAppInstallation');
    if (appIssues.length > 0) {
      recommendations.push(
        `Review app installations: ${appIssues.length} potential misconfigurations detected. Verify service templates are correctly applied.`
      );
    }

    // Theme issues
    const themeIssues = warnings.filter(w => w.issueType === 'ThemePresetMismatch');
    if (themeIssues.length > 0) {
      recommendations.push(
        `Configure themes for ${themeIssues.length} tenant(s). Use appropriate theme presets for each service group.`
      );
    }

    // Isolation issues
    if (summary.isolationScore < 90) {
      recommendations.push(
        `Improve tenant isolation: Current score ${summary.isolationScore}%. Audit cross-service data access patterns.`
      );
    }

    // Per service group recommendations
    serviceGroups.forEach(group => {
      if (group.criticalCount > 0) {
        recommendations.push(
          `[${group.serviceGroup}] ${group.criticalCount} critical tenant(s) need immediate review.`
        );
      }
    });

    // General recommendations
    if (summary.totalTenants > 10 && summary.averageAppsPerTenant < 3) {
      recommendations.push(
        `Consider reviewing service templates: Average apps per tenant (${summary.averageAppsPerTenant}) is low for multi-service platform.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate actions required. Continue monitoring service health.');
    }

    return recommendations;
  }

  private generateGroupRecommendations(
    serviceGroup: string,
    warnings: ValidationWarning[],
    tenants: TenantInfo[]
  ): string[] {
    const recommendations: string[] = [];

    const criticalCount = warnings.filter(w => w.severity === 'critical').length;
    const highCount = warnings.filter(w => w.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical issue(s) for ${serviceGroup} services`);
    }

    if (highCount > 0) {
      recommendations.push(`Review ${highCount} high-priority issue(s)`);
    }

    // Check for common patterns
    const missingApps = warnings.filter(w => w.issueType === 'MissingCoreApp' || w.issueType === 'IncorrectAppInstallation');
    if (missingApps.length > tenants.length / 2) {
      recommendations.push(`Consider updating service template for ${serviceGroup} - widespread app configuration issues`);
    }

    return recommendations;
  }

  private generateAppendix(
    tenants: TenantInfo[],
    warnings: ValidationWarning[],
    appsMatrix: any
  ): FullValidationReport['appendix'] {
    // Apps coverage (how many tenants have each app)
    const appsCoverage: Record<string, number> = {};
    appsMatrix.allApps.forEach((app: string) => {
      appsCoverage[app] = appsMatrix.tenants.filter((t: any) => t.apps[app]).length;
    });

    // Issue distribution by type
    const issueDistribution: Record<string, number> = {};
    warnings.forEach(w => {
      issueDistribution[w.issueType] = (issueDistribution[w.issueType] || 0) + 1;
    });

    return {
      appsCoverage,
      issueDistribution,
    };
  }

  private convertToCSV(report: FullValidationReport): string {
    const lines: string[] = [];

    // Report Header
    lines.push('O4O Platform - Service Validation Report');
    lines.push(`Generated: ${report.metadata.generatedAt.toISOString()}`);
    lines.push(`Version: ${report.metadata.version}`);
    lines.push('');

    // Executive Summary
    lines.push('=== EXECUTIVE SUMMARY ===');
    lines.push(`Overall Health,${report.executive.overallHealth}`);
    lines.push(`Health Score,${report.executive.healthScore}%`);
    lines.push(`Total Tenants,${report.executive.totalTenants}`);
    lines.push(`Critical Issues,${report.executive.criticalIssues}`);
    lines.push('');
    lines.push('Key Findings:');
    report.executive.keyFindings.forEach((finding, i) => {
      lines.push(`${i + 1},"${finding}"`);
    });
    lines.push('');

    // Service Groups
    lines.push('=== SERVICE GROUPS ===');
    lines.push('Service Group,Tenant Count,Healthy,Warning,Critical,Installed Apps');
    report.serviceGroups.forEach(group => {
      lines.push(`${group.serviceGroup},${group.tenantCount},${group.healthyCount},${group.warningCount},${group.criticalCount},"${group.installedApps.join(', ')}"`);
    });
    lines.push('');

    // Tenants Detail
    lines.push('=== TENANTS ===');
    lines.push('Tenant ID,Domain,Service Group,Status,Installed Apps,Theme,Site Status');
    report.tenants.forEach(tenant => {
      lines.push(`${tenant.tenantId},"${tenant.domain}",${tenant.serviceGroup},${tenant.status},${tenant.installedApps},"${tenant.theme || 'none'}",${tenant.siteStatus}`);
    });
    lines.push('');

    // Warnings
    lines.push('=== WARNINGS ===');
    lines.push('Tenant ID,Service Group,Issue Type,Severity,Description,Detected At');
    report.warnings.forEach(warning => {
      lines.push(`${warning.tenantId},${warning.serviceGroup},${warning.issueType},${warning.severity},"${warning.description}",${warning.detectedAt.toISOString()}`);
    });
    lines.push('');

    // Recommendations
    lines.push('=== RECOMMENDATIONS ===');
    report.recommendations.forEach((rec, i) => {
      lines.push(`${i + 1},"${rec}"`);
    });
    lines.push('');

    // Appendix - Apps Coverage
    lines.push('=== APPENDIX: APPS COVERAGE ===');
    lines.push('App ID,Tenants Using');
    Object.entries(report.appendix.appsCoverage).forEach(([app, count]) => {
      lines.push(`${app},${count}`);
    });
    lines.push('');

    // Appendix - Issue Distribution
    lines.push('=== APPENDIX: ISSUE DISTRIBUTION ===');
    lines.push('Issue Type,Count');
    Object.entries(report.appendix.issueDistribution).forEach(([type, count]) => {
      lines.push(`${type},${count}`);
    });

    return lines.join('\n');
  }
}

// Export singleton instance
export const validationReportService = new ValidationReportService();
