/**
 * Service Installer
 * Phase 7 — Service Templates & App Installer Automation
 * Phase 8 — Extended with Service Initialization
 *
 * Handles automated app installation based on service templates.
 * Includes dependency resolution, installation ordering, and environment initialization.
 */

import logger from '../utils/logger.js';
import { appStoreService } from '../services/AppStoreService.js';
import { moduleLoader } from '../modules/module-loader.js';
import { getCatalogItem, isInCatalog, type AppCatalogItem } from '../app-manifests/appsCatalog.js';
import { templateRegistry } from './template-registry.js';
import { serviceInitializer } from './service-initializer.js';
import { initPackRegistry } from './init-pack-registry.js';
import type {
  ServiceTemplate,
  ServiceProvisioningRequest,
  ServiceProvisioningResult,
  DependencyResolutionResult,
  AppInstallationOrder,
  GLOBAL_CORE_APPS,
} from './template-schema.js';
import type { ServiceInitResult } from './init-schema.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

/**
 * Extended Service Provisioning Result (Phase 8)
 */
export interface ExtendedServiceProvisioningResult extends ServiceProvisioningResult {
  /** Initialization result (Phase 8) */
  initResult?: ServiceInitResult;
}

/**
 * Service Installer Class
 *
 * Automates app installation based on service templates
 */
export class ServiceInstaller {
  /**
   * Resolve dependencies for a list of apps
   * Returns apps in correct installation order
   */
  resolveDependencies(appIds: string[]): DependencyResolutionResult {
    const visited = new Set<string>();
    const resolved = new Set<string>();
    const installOrder: string[] = [];
    const circularDependencies: string[] = [];
    const missingDependencies: string[] = [];

    const resolve = (appId: string, ancestors: Set<string>): boolean => {
      if (resolved.has(appId)) return true;

      if (ancestors.has(appId)) {
        // Circular dependency detected
        circularDependencies.push(appId);
        return false;
      }

      if (visited.has(appId)) return true;
      visited.add(appId);

      const catalogItem = getCatalogItem(appId);
      if (!catalogItem) {
        missingDependencies.push(appId);
        return false;
      }

      // Resolve dependencies first
      if (catalogItem.dependencies) {
        const newAncestors = new Set(ancestors);
        newAncestors.add(appId);

        for (const depId of Object.keys(catalogItem.dependencies)) {
          if (!resolve(depId, newAncestors)) {
            // Dependency resolution failed
            return false;
          }
        }
      }

      // Add to resolved order
      if (!resolved.has(appId)) {
        installOrder.push(appId);
        resolved.add(appId);
      }

      return true;
    };

    // Resolve all requested apps
    for (const appId of appIds) {
      resolve(appId, new Set());
    }

    return {
      installOrder,
      circularDependencies,
      missingDependencies,
      success: circularDependencies.length === 0 && missingDependencies.length === 0,
    };
  }

  /**
   * Install apps in resolved order
   */
  async installAppsInOrder(appIds: string[]): Promise<{
    installed: string[];
    skipped: string[];
    failed: Array<{ appId: string; error: string }>;
  }> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ appId: string; error: string }> = [];

    for (const appId of appIds) {
      try {
        // Check if already installed
        if (appStoreService.isInstalled(appId)) {
          skipped.push(appId);
          logger.debug(`[ServiceInstaller] Skipped ${appId} (already installed)`);
          continue;
        }

        // Install the app
        await appStoreService.installApp(appId);
        installed.push(appId);
        logger.info(`[ServiceInstaller] Installed ${appId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ appId, error: errorMessage });
        logger.error(`[ServiceInstaller] Failed to install ${appId}:`, error);
      }
    }

    return { installed, skipped, failed };
  }

  /**
   * Install a service template
   *
   * @param templateId - Template ID to install
   * @param options - Installation options
   */
  async installServiceTemplate(
    templateId: string,
    options?: {
      skipApps?: string[];
      additionalExtensions?: string[];
      installExtensions?: boolean;
    }
  ): Promise<{
    success: boolean;
    installed: string[];
    skipped: string[];
    failed: Array<{ appId: string; error: string }>;
    template: ServiceTemplate | undefined;
  }> {
    const template = templateRegistry.getTemplate(templateId);

    if (!template) {
      return {
        success: false,
        installed: [],
        skipped: [],
        failed: [{ appId: templateId, error: 'Template not found' }],
        template: undefined,
      };
    }

    logger.info(`[ServiceInstaller] Installing template: ${template.label}`);

    // Collect all apps to install
    const appsToInstall = new Set<string>();

    // Add global core apps
    if (template.globalCoreApps) {
      template.globalCoreApps.forEach(app => appsToInstall.add(app));
    }

    // Add template core apps
    template.coreApps.forEach(app => appsToInstall.add(app));

    // Add extensions if requested
    if (options?.installExtensions && template.extensionApps) {
      template.extensionApps.forEach(app => appsToInstall.add(app));
    }

    // Add additional extensions
    if (options?.additionalExtensions) {
      options.additionalExtensions.forEach(app => appsToInstall.add(app));
    }

    // Remove skipped apps
    if (options?.skipApps) {
      options.skipApps.forEach(app => appsToInstall.delete(app));
    }

    // Resolve dependencies
    const resolution = this.resolveDependencies(Array.from(appsToInstall));

    if (!resolution.success) {
      logger.error(`[ServiceInstaller] Dependency resolution failed for ${templateId}`);
      return {
        success: false,
        installed: [],
        skipped: [],
        failed: [
          ...resolution.circularDependencies.map(id => ({ appId: id, error: 'Circular dependency' })),
          ...resolution.missingDependencies.map(id => ({ appId: id, error: 'Missing in catalog' })),
        ],
        template,
      };
    }

    // Install in resolved order
    const result = await this.installAppsInOrder(resolution.installOrder);

    return {
      success: result.failed.length === 0,
      installed: result.installed,
      skipped: result.skipped,
      failed: result.failed,
      template,
    };
  }

  /**
   * Provision a complete service
   *
   * @param request - Provisioning request
   */
  async provisionService(request: ServiceProvisioningRequest): Promise<ExtendedServiceProvisioningResult> {
    const startTime = Date.now();

    const template = templateRegistry.getTemplate(request.serviceTemplateId);

    if (!template) {
      return {
        success: false,
        organizationId: request.organizationId,
        tenantId: request.tenantId,
        serviceGroup: 'global',
        installedApps: [],
        skippedApps: [],
        failedApps: [{ appId: request.serviceTemplateId, error: 'Template not found' }],
        installationTimeMs: Date.now() - startTime,
        error: `Template ${request.serviceTemplateId} not found`,
      };
    }

    logger.info(`[ServiceInstaller] Provisioning service: ${template.label}`);
    logger.info(`[ServiceInstaller] Organization: ${request.organizationId}, Tenant: ${request.tenantId}`);

    // Step 1: Install apps from template
    const installResult = await this.installServiceTemplate(request.serviceTemplateId, {
      skipApps: request.skipApps,
      additionalExtensions: request.additionalExtensions,
      installExtensions: true,
    });

    // Step 2: Initialize service environment (Phase 8)
    let initResult: ServiceInitResult | undefined;

    if (installResult.success || installResult.installed.length > 0) {
      try {
        logger.info(`[ServiceInstaller] Initializing service environment for tenant: ${request.tenantId}`);

        initResult = await serviceInitializer.initializeService(
          request.tenantId,
          request.organizationId,
          request.serviceTemplateId,
          {
            settingsOverride: request.settingsOverride as any,
          }
        );

        if (initResult.errors.length > 0) {
          logger.warn(`[ServiceInstaller] Service initialization completed with ${initResult.errors.length} errors`);
        } else {
          logger.info(`[ServiceInstaller] Service initialization completed successfully`);
        }
      } catch (initError) {
        logger.error(`[ServiceInstaller] Service initialization failed:`, initError);
        initResult = {
          success: false,
          tenantId: request.tenantId,
          organizationId: request.organizationId,
          initPackId: '',
          menusCreated: 0,
          categoriesCreated: 0,
          pagesCreated: 0,
          seedDataCreated: 0,
          settingsApplied: false,
          errors: [{ step: 'initialization', error: initError instanceof Error ? initError.message : String(initError) }],
          warnings: [],
          initializationTimeMs: 0,
        };
      }
    }

    return {
      success: installResult.success,
      organizationId: request.organizationId,
      tenantId: request.tenantId,
      serviceGroup: template.serviceGroup,
      installedApps: installResult.installed,
      skippedApps: installResult.skipped,
      failedApps: installResult.failed,
      installationTimeMs: Date.now() - startTime,
      error: installResult.success ? undefined : 'Some apps failed to install',
      initResult,
    };
  }

  /**
   * Get full provisioning preview including init pack
   */
  getFullProvisioningPreview(
    templateId: string,
    options?: {
      skipApps?: string[];
      additionalExtensions?: string[];
      installExtensions?: boolean;
    }
  ): {
    template: ServiceTemplate | undefined;
    appsToInstall: string[];
    alreadyInstalled: string[];
    willBeSkipped: string[];
    dependencyOrder: string[];
    issues: string[];
    initPreview: {
      menusCount: number;
      categoriesCount: number;
      pagesCount: number;
      seedDataCount: number;
      hasTheme: boolean;
      hasSettings: boolean;
      rolesCount: number;
    };
  } {
    // Get app installation preview
    const appPreview = this.getInstallationPreview(templateId, options);

    // Get init pack preview
    const initPreview = serviceInitializer.getInitializationPreview(templateId);

    return {
      ...appPreview,
      initPreview: {
        menusCount: initPreview.menusCount,
        categoriesCount: initPreview.categoriesCount,
        pagesCount: initPreview.pagesCount,
        seedDataCount: initPreview.seedDataCount,
        hasTheme: initPreview.hasTheme,
        hasSettings: initPreview.hasSettings,
        rolesCount: initPreview.rolesCount,
      },
    };
  }

  /**
   * Get installation preview for a template
   * Shows what would be installed without actually installing
   */
  getInstallationPreview(
    templateId: string,
    options?: {
      skipApps?: string[];
      additionalExtensions?: string[];
      installExtensions?: boolean;
    }
  ): {
    template: ServiceTemplate | undefined;
    appsToInstall: string[];
    alreadyInstalled: string[];
    willBeSkipped: string[];
    dependencyOrder: string[];
    issues: string[];
  } {
    const template = templateRegistry.getTemplate(templateId);

    if (!template) {
      return {
        template: undefined,
        appsToInstall: [],
        alreadyInstalled: [],
        willBeSkipped: [],
        dependencyOrder: [],
        issues: [`Template ${templateId} not found`],
      };
    }

    // Collect all apps
    const appsToInstall = new Set<string>();
    const issues: string[] = [];

    // Add global core apps
    if (template.globalCoreApps) {
      template.globalCoreApps.forEach(app => appsToInstall.add(app));
    }

    // Add template core apps
    template.coreApps.forEach(app => appsToInstall.add(app));

    // Add extensions if requested
    if (options?.installExtensions && template.extensionApps) {
      template.extensionApps.forEach(app => appsToInstall.add(app));
    }

    // Add additional extensions
    if (options?.additionalExtensions) {
      options.additionalExtensions.forEach(app => appsToInstall.add(app));
    }

    // Remove skipped apps
    const willBeSkipped = options?.skipApps || [];
    willBeSkipped.forEach(app => appsToInstall.delete(app));

    // Check what's already installed
    const alreadyInstalled: string[] = [];
    for (const appId of appsToInstall) {
      if (appStoreService.isInstalled(appId)) {
        alreadyInstalled.push(appId);
      }
    }

    // Resolve dependencies
    const resolution = this.resolveDependencies(Array.from(appsToInstall));

    if (resolution.circularDependencies.length > 0) {
      issues.push(`Circular dependencies: ${resolution.circularDependencies.join(', ')}`);
    }

    if (resolution.missingDependencies.length > 0) {
      issues.push(`Missing apps: ${resolution.missingDependencies.join(', ')}`);
    }

    return {
      template,
      appsToInstall: Array.from(appsToInstall),
      alreadyInstalled,
      willBeSkipped,
      dependencyOrder: resolution.installOrder,
      issues,
    };
  }

  /**
   * Check if a service group is compatible with a template
   */
  isTemplateCompatible(templateId: string, serviceGroup: ServiceGroup): boolean {
    const template = templateRegistry.getTemplate(templateId);
    if (!template) return false;
    return template.serviceGroup === serviceGroup || serviceGroup === 'global';
  }

  /**
   * Get recommended templates for a service group
   */
  getRecommendedTemplates(serviceGroup: ServiceGroup): ServiceTemplate[] {
    return templateRegistry.getTemplatesByServiceGroup(serviceGroup)
      .filter(t => t.isActive);
  }
}

/**
 * Singleton instance
 */
export const serviceInstaller = new ServiceInstaller();

export default serviceInstaller;
