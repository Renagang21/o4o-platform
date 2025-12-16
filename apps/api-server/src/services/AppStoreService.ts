/**
 * AppStore Service
 * Phase 5 — AppStore + Module Loader
 * Phase 6 — ServiceGroup-based filtering
 *
 * High-level service for app installation and lifecycle management
 */

import logger from '../utils/logger.js';
import { moduleLoader } from '../modules/module-loader.js';
import {
  getCatalogItem,
  isInCatalog,
  filterByServiceGroup,
  getAppsByServiceGroup,
  getAllServiceGroupMeta,
  getServiceGroupMeta,
  getCoreAppsForService,
  checkAppCompatibility,
  getIncompatibleApps,
  getCompatibleApps,
  getServiceGroupStats,
  isAppAvailableForService,
  getAppsForServiceGroupWithDependencies,
} from '../app-manifests/appsCatalog.js';
import type { AppModule, ModuleRegistryEntry } from '../modules/types.js';
import type {
  AppCatalogItem,
  ServiceGroup,
  ServiceGroupMeta,
  CompatibilityStatus,
} from '../app-manifests/appsCatalog.js';

/**
 * AppStore Service
 *
 * Manages app installation, activation, deactivation, and uninstallation
 */
export class AppStoreService {
  /**
   * Install an app
   *
   * WO-APPSTORE-CONTEXT-FIX: dataSource 선택적 파라미터 추가
   *
   * @param appId - App identifier from catalog
   * @param dataSource - Optional TypeORM DataSource for lifecycle hooks
   */
  async installApp(appId: string, dataSource?: any): Promise<void> {
    logger.info(`[AppStore] Installing app: ${appId}`);

    // Check if app exists in catalog
    if (!isInCatalog(appId)) {
      throw new Error(`App ${appId} not found in catalog`);
    }

    const catalogItem = getCatalogItem(appId);
    if (!catalogItem) {
      throw new Error(`App ${appId} not found in catalog`);
    }

    // Check if already installed
    const existingModule = moduleLoader.getModule(appId);
    if (existingModule) {
      logger.info(`[AppStore] App ${appId} already installed`);
      return;
    }

    // Load the module
    // Note: In a full implementation, this would download/clone the app package
    // For now, we assume the app package is already in the workspace
    await moduleLoader.loadAll();

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`Failed to load app ${appId} - package not found in workspace`);
    }

    // Check dependencies
    const { module: appModule } = module;
    if (appModule.dependsOn && appModule.dependsOn.length > 0) {
      for (const depId of appModule.dependsOn) {
        const depModule = moduleLoader.getModule(depId);
        if (!depModule) {
          throw new Error(`Missing dependency: ${depId} required by ${appId}`);
        }
      }
    }

    // WO-APPSTORE-CONTEXT-FIX: ModuleLoader.installModule() 사용
    await moduleLoader.installModule(appId, dataSource);

    // Activate the app
    await this.activateApp(appId, dataSource);

    logger.info(`[AppStore] ✅ App ${appId} installed successfully`);
  }

  /**
   * Uninstall an app
   *
   * WO-APPSTORE-CONTEXT-FIX: dataSource 선택적 파라미터 추가
   *
   * @param appId - App identifier
   * @param dataSource - Optional TypeORM DataSource for lifecycle hooks
   */
  async uninstallApp(appId: string, dataSource?: any): Promise<void> {
    logger.info(`[AppStore] Uninstalling app: ${appId}`);

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`App ${appId} not installed`);
    }

    const { module: appModule } = module;

    // Deactivate first
    if (module.status === 'active') {
      await this.deactivateApp(appId, dataSource);
    }

    // WO-APPSTORE-CONTEXT-FIX: Context에 dataSource, manifest, logger 포함
    if (appModule.lifecycle?.uninstall) {
      try {
        const uninstallContext = {
          appId,
          manifest: appModule,
          dataSource,
          logger,
        };
        await appModule.lifecycle.uninstall(uninstallContext);
        logger.info(`[AppStore] Ran uninstall hook for ${appId}`);
      } catch (uninstallError) {
        // WO-APPSTORE-CONTEXT-FIX: 실패 로그 강화
        logger.error(`[AppStore] Uninstall hook FAILED for ${appId}:`, {
          stage: 'uninstall',
          appId,
          error: uninstallError instanceof Error ? uninstallError.message : String(uninstallError),
          hasDataSource: !!dataSource,
        });
        throw uninstallError;
      }
    }

    // Remove from registry
    // Note: This requires a removeModule method on ModuleLoader
    // For now, we'll just mark as inactive
    logger.info(`[AppStore] ✅ App ${appId} uninstalled`);
  }

  /**
   * Activate an app
   *
   * WO-APPSTORE-CONTEXT-FIX: dataSource 선택적 파라미터 추가
   *
   * @param appId - App identifier
   * @param dataSource - Optional TypeORM DataSource for lifecycle hooks
   */
  async activateApp(appId: string, dataSource?: any): Promise<void> {
    logger.info(`[AppStore] Activating app: ${appId}`);

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`App ${appId} not installed`);
    }

    if (module.status === 'active') {
      logger.info(`[AppStore] App ${appId} already active`);
      return;
    }

    // WO-APPSTORE-CONTEXT-FIX: dataSource 전달
    await moduleLoader.activateModule(appId, dataSource);

    logger.info(`[AppStore] ✅ App ${appId} activated`);
  }

  /**
   * Deactivate an app
   *
   * WO-APPSTORE-CONTEXT-FIX: dataSource 선택적 파라미터 추가
   *
   * @param appId - App identifier
   * @param dataSource - Optional TypeORM DataSource for lifecycle hooks
   */
  async deactivateApp(appId: string, dataSource?: any): Promise<void> {
    logger.info(`[AppStore] Deactivating app: ${appId}`);

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`App ${appId} not installed`);
    }

    if (module.status !== 'active') {
      logger.info(`[AppStore] App ${appId} not active`);
      return;
    }

    // WO-APPSTORE-CONTEXT-FIX: dataSource 전달
    await moduleLoader.deactivateModule(appId, dataSource);

    logger.info(`[AppStore] ✅ App ${appId} deactivated`);
  }

  /**
   * Get all available apps from catalog
   */
  getAllApps(): AppCatalogItem[] {
    const { APPS_CATALOG } = require('../app-manifests/appsCatalog.js');
    return APPS_CATALOG;
  }

  /**
   * Get all active apps
   */
  getActiveApps(): string[] {
    return moduleLoader.getActiveModules();
  }

  /**
   * Get app details
   *
   * @param appId - App identifier
   * @returns Combined catalog info and module status
   */
  getAppDetails(appId: string): {
    catalog: AppCatalogItem | undefined;
    module: ModuleRegistryEntry | undefined;
  } {
    return {
      catalog: getCatalogItem(appId),
      module: moduleLoader.getModule(appId)
    };
  }

  /**
   * Check if app is installed
   *
   * @param appId - App identifier
   */
  isInstalled(appId: string): boolean {
    return !!moduleLoader.getModule(appId);
  }

  /**
   * Check if app is active
   *
   * @param appId - App identifier
   */
  isActive(appId: string): boolean {
    const module = moduleLoader.getModule(appId);
    return module?.status === 'active';
  }

  // ============================================
  // ServiceGroup Filtering Engine (Phase 6)
  // ============================================

  /**
   * Get apps by service group
   * Returns apps that belong to the specified service group
   *
   * @param serviceGroup - Service group to filter by
   * @returns Array of matching catalog items
   */
  getAppsByServiceGroup(serviceGroup: ServiceGroup): AppCatalogItem[] {
    return filterByServiceGroup(serviceGroup);
  }

  /**
   * Get all apps grouped by service group
   * @returns Map of service group to apps
   */
  getAllAppsByServiceGroup(): Map<ServiceGroup, AppCatalogItem[]> {
    return getAppsByServiceGroup();
  }

  /**
   * Get all service group metadata for UI display
   * @returns Array of ServiceGroupMeta sorted by priority
   */
  getAllServiceGroupMeta(): ServiceGroupMeta[] {
    return getAllServiceGroupMeta();
  }

  /**
   * Get service group metadata by ID
   * @param serviceGroup - Service group ID
   * @returns ServiceGroupMeta or undefined
   */
  getServiceGroupMeta(serviceGroup: ServiceGroup): ServiceGroupMeta | undefined {
    return getServiceGroupMeta(serviceGroup);
  }

  /**
   * Get apps for a service group with all dependencies resolved
   * @param serviceGroup - Service group to filter by
   * @returns Array of apps including dependencies
   */
  getAppsWithDependencies(serviceGroup: ServiceGroup): AppCatalogItem[] {
    return getAppsForServiceGroupWithDependencies(serviceGroup);
  }

  /**
   * Get core apps required for a service
   * Includes platform-core apps + service-specific apps
   *
   * @param serviceGroup - Target service group
   * @returns Array of required apps
   */
  getCoreAppsForService(serviceGroup: ServiceGroup): AppCatalogItem[] {
    return getCoreAppsForService(serviceGroup);
  }

  /**
   * Check if two apps are compatible
   *
   * @param appId1 - First app ID
   * @param appId2 - Second app ID
   * @returns Compatibility status
   */
  checkCompatibility(appId1: string, appId2: string): CompatibilityStatus {
    return checkAppCompatibility(appId1, appId2);
  }

  /**
   * Get all apps incompatible with a given app
   *
   * @param appId - App ID to check
   * @returns Array of incompatible app IDs
   */
  getIncompatibleApps(appId: string): string[] {
    return getIncompatibleApps(appId);
  }

  /**
   * Get all apps compatible with a given app
   *
   * @param appId - App ID to check
   * @returns Array of compatible apps
   */
  getCompatibleApps(appId: string): AppCatalogItem[] {
    return getCompatibleApps(appId);
  }

  /**
   * Check if an app is available for a service group
   *
   * @param appId - App ID
   * @param serviceGroup - Service group to check
   * @returns true if app is available
   */
  isAppAvailableForService(appId: string, serviceGroup: ServiceGroup): boolean {
    return isAppAvailableForService(appId, serviceGroup);
  }

  /**
   * Get service group statistics
   * @returns Array of stats per service group
   */
  getServiceGroupStats(): Array<{
    serviceGroup: ServiceGroup;
    meta: ServiceGroupMeta;
    coreCount: number;
    featureCount: number;
    extensionCount: number;
    totalCount: number;
  }> {
    return getServiceGroupStats();
  }

  /**
   * Install all core apps for a service group
   *
   * @param serviceGroup - Target service group
   */
  async installCoreAppsForService(serviceGroup: ServiceGroup): Promise<void> {
    logger.info(`[AppStore] Installing core apps for service: ${serviceGroup}`);

    const coreApps = getCoreAppsForService(serviceGroup);

    // Sort by dependencies (install dependencies first)
    const sortedApps = this.sortByDependencies(coreApps);

    for (const app of sortedApps) {
      try {
        await this.installApp(app.appId);
      } catch (error) {
        logger.error(`[AppStore] Failed to install ${app.appId}:`, error);
        throw new Error(`Failed to install core app ${app.appId} for service ${serviceGroup}`);
      }
    }

    logger.info(`[AppStore] ✅ Core apps installed for service: ${serviceGroup}`);
  }

  /**
   * Validate app installation against service group constraints
   *
   * @param appId - App to validate
   * @param serviceGroup - Target service group
   * @returns Validation result
   */
  validateInstallation(
    appId: string,
    serviceGroup: ServiceGroup
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if app exists
    const app = getCatalogItem(appId);
    if (!app) {
      errors.push(`App ${appId} not found in catalog`);
      return { valid: false, errors, warnings };
    }

    // Check if app is available for service group
    if (!isAppAvailableForService(appId, serviceGroup)) {
      errors.push(`App ${appId} is not available for service group ${serviceGroup}`);
    }

    // Check dependencies
    if (app.dependencies) {
      for (const depId of Object.keys(app.dependencies)) {
        if (!this.isInstalled(depId)) {
          errors.push(`Missing dependency: ${depId}`);
        }
      }
    }

    // Check incompatibilities
    const activeApps = this.getActiveApps();
    for (const activeAppId of activeApps) {
      const compatibility = checkAppCompatibility(appId, activeAppId);
      if (compatibility === 'incompatible') {
        errors.push(`App ${appId} is incompatible with installed app ${activeAppId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get recommended apps for a service group based on installed apps
   *
   * @param serviceGroup - Target service group
   * @returns Array of recommended apps
   */
  getRecommendedApps(serviceGroup: ServiceGroup): AppCatalogItem[] {
    const serviceApps = filterByServiceGroup(serviceGroup);
    const installedApps = this.getActiveApps();

    // Filter out installed apps and find recommendations
    return serviceApps.filter((app) => {
      // Skip if already installed
      if (installedApps.includes(app.appId)) return false;

      // Check if all dependencies are installed
      if (app.dependencies) {
        for (const depId of Object.keys(app.dependencies)) {
          if (!installedApps.includes(depId)) {
            return false;
          }
        }
      }

      // Check compatibility with installed apps
      for (const installedId of installedApps) {
        if (checkAppCompatibility(app.appId, installedId) === 'incompatible') {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort apps by dependencies (topological sort)
   * Apps with no dependencies come first
   */
  private sortByDependencies(apps: AppCatalogItem[]): AppCatalogItem[] {
    const appMap = new Map(apps.map((app) => [app.appId, app]));
    const sorted: AppCatalogItem[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (appId: string): void => {
      if (visited.has(appId)) return;
      if (visiting.has(appId)) {
        throw new Error(`Circular dependency detected: ${appId}`);
      }

      const app = appMap.get(appId);
      if (!app) return;

      visiting.add(appId);

      if (app.dependencies) {
        for (const depId of Object.keys(app.dependencies)) {
          visit(depId);
        }
      }

      visiting.delete(appId);
      visited.add(appId);
      sorted.push(app);
    };

    for (const app of apps) {
      visit(app.appId);
    }

    return sorted;
  }
}

/**
 * Singleton AppStore Service instance
 */
export const appStoreService = new AppStoreService();
