/**
 * AppStore Service
 * Phase 5 — AppStore + Module Loader
 *
 * High-level service for app installation and lifecycle management
 */

import logger from '../utils/logger.js';
import { moduleLoader } from '../modules/module-loader.js';
import { getCatalogItem, isInCatalog } from '../app-manifests/appsCatalog.js';
import type { AppModule, ModuleRegistryEntry } from '../modules/types.js';
import type { AppCatalogItem } from '../app-manifests/appsCatalog.js';

/**
 * AppStore Service
 *
 * Manages app installation, activation, deactivation, and uninstallation
 */
export class AppStoreService {
  /**
   * Install an app
   *
   * @param appId - App identifier from catalog
   */
  async installApp(appId: string): Promise<void> {
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

    // Run install lifecycle hook
    if (appModule.lifecycle?.install) {
      try {
        await appModule.lifecycle.install();
        logger.info(`[AppStore] Ran install hook for ${appId}`);
      } catch (installError) {
        logger.error(`[AppStore] Install hook failed for ${appId}:`, installError);
        throw installError;
      }
    }

    // Activate the app
    await this.activateApp(appId);

    logger.info(`[AppStore] ✅ App ${appId} installed successfully`);
  }

  /**
   * Uninstall an app
   *
   * @param appId - App identifier
   */
  async uninstallApp(appId: string): Promise<void> {
    logger.info(`[AppStore] Uninstalling app: ${appId}`);

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`App ${appId} not installed`);
    }

    const { module: appModule } = module;

    // Deactivate first
    if (module.status === 'active') {
      await this.deactivateApp(appId);
    }

    // Run uninstall lifecycle hook
    if (appModule.lifecycle?.uninstall) {
      try {
        await appModule.lifecycle.uninstall();
        logger.info(`[AppStore] Ran uninstall hook for ${appId}`);
      } catch (uninstallError) {
        logger.error(`[AppStore] Uninstall hook failed for ${appId}:`, uninstallError);
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
   * @param appId - App identifier
   */
  async activateApp(appId: string): Promise<void> {
    logger.info(`[AppStore] Activating app: ${appId}`);

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`App ${appId} not installed`);
    }

    if (module.status === 'active') {
      logger.info(`[AppStore] App ${appId} already active`);
      return;
    }

    await moduleLoader.activateModule(appId);

    logger.info(`[AppStore] ✅ App ${appId} activated`);
  }

  /**
   * Deactivate an app
   *
   * @param appId - App identifier
   */
  async deactivateApp(appId: string): Promise<void> {
    logger.info(`[AppStore] Deactivating app: ${appId}`);

    const module = moduleLoader.getModule(appId);
    if (!module) {
      throw new Error(`App ${appId} not installed`);
    }

    if (module.status !== 'active') {
      logger.info(`[AppStore] App ${appId} not active`);
      return;
    }

    await moduleLoader.deactivateModule(appId);

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
}

/**
 * Singleton AppStore Service instance
 */
export const appStoreService = new AppStoreService();
