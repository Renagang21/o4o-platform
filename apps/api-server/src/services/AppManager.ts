import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AppRegistry } from '../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../app-manifests/index.js';
import { getCatalogItem } from '../app-manifests/appsCatalog.js';
import { isNewerVersion } from '../utils/semver.js';
import { AppDependencyResolver, DependencyError } from './AppDependencyResolver.js';
import { AppDataCleaner } from './AppDataCleaner.js';
import { AppTableOwnershipResolver, OwnershipValidationError } from './AppTableOwnershipResolver.js';
import { permissionService } from '../modules/auth/services/permission.service.js';
import { acfRegistry } from './ACFRegistry.js';
import { registry as cptRegistry } from '@o4o/cpt-registry';
import type { AppManifest, InstallContext, ActivateContext, DeactivateContext, UninstallContext } from '@o4o/types';
import logger from '../utils/logger.js';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * AppManager Service
 *
 * Manages feature-level app installation, activation, deactivation, and uninstallation
 * Works with AppRegistry entity and local manifests
 * Supports Core/Extension pattern with dependency management
 */
export class AppManager {
  private repo: Repository<AppRegistry>;
  private dependencyResolver: AppDependencyResolver;
  private dataCleaner: AppDataCleaner;
  private ownershipResolver: AppTableOwnershipResolver;

  constructor() {
    this.repo = AppDataSource.getRepository(AppRegistry);
    this.dependencyResolver = new AppDependencyResolver();
    this.dataCleaner = new AppDataCleaner();
    this.ownershipResolver = new AppTableOwnershipResolver();
  }

  /**
   * Install an app with dependency resolution
   * Automatically installs dependencies in correct order
   *
   * @param appId - App identifier (e.g., 'forum-neture')
   * @param options - Installation options
   */
  async install(
    appId: string,
    options?: { autoActivate?: boolean; skipDependencies?: boolean }
  ): Promise<void> {
    // Resolve installation order (includes dependencies)
    const installOrder = options?.skipDependencies
      ? [appId]
      : await this.dependencyResolver.resolveInstallOrder(appId);

    // Install apps in dependency order
    for (const targetAppId of installOrder) {
      const isInstalled = await this.isInstalled(targetAppId);

      if (!isInstalled) {
        await this.installSingleApp(targetAppId);
      }
    }

    // Auto-activate if requested (default: true)
    if (options?.autoActivate !== false) {
      for (const targetAppId of installOrder) {
        const app = await this.repo.findOne({ where: { appId: targetAppId } });
        if (app && app.status !== 'active') {
          await this.activate(targetAppId);
        }
      }
    }
  }

  /**
   * Install a single app (internal method)
   * Does not handle dependencies - use install() for public API
   *
   * @param appId - App identifier
   */
  private async installSingleApp(appId: string): Promise<void> {
    // Load manifest - throws if not found
    if (!hasManifest(appId)) {
      throw new Error(`No manifest found for app: ${appId}`);
    }

    const manifest = loadLocalManifest(appId);

    // Validate ownership claims before installation
    logger.info(`[AppManager] Validating ownership for ${appId}...`);
    try {
      await this.ownershipResolver.validateOwnership(manifest);
      logger.info(`[AppManager] ✓ Ownership validation passed for ${appId}`);
    } catch (error) {
      if (error instanceof OwnershipValidationError) {
        logger.error(`[AppManager] ✗ Ownership validation failed for ${appId}:`, error.violations);
        throw error;
      }
      throw error;
    }

    let entry = await this.repo.findOne({ where: { appId } });

    // Get dependencies in correct format
    const manifestDeps = manifest.dependencies || {};
    let dependencies: Record<string, string> | undefined;
    if (typeof manifestDeps === 'object' && !Array.isArray(manifestDeps)) {
      if ('apps' in manifestDeps || 'services' in manifestDeps) {
        dependencies = undefined;
      } else {
        dependencies = manifestDeps as Record<string, string>;
      }
    }

    if (!entry) {
      // Create new entry with type and dependencies from manifest
      entry = this.repo.create({
        appId: manifest.appId || appId,
        name: manifest.name || appId,
        version: manifest.version || '1.0.0',
        type: manifest.type || 'standalone',
        dependencies,
        status: 'installed',
        source: 'local',
      });
    } else {
      // Update existing entry
      entry.name = manifest.name || entry.name;
      entry.version = manifest.version || entry.version;
      entry.type = manifest.type || entry.type || 'standalone';
      entry.dependencies = dependencies;
      entry.updatedAt = new Date();

      // If status was not set, set to installed
      if (!entry.status) {
        entry.status = 'installed';
      }
    }

    await this.repo.save(entry);

    // Register Permissions
    if (manifest.permissions && manifest.permissions.length > 0) {
      logger.info(`[AppManager] Registering ${manifest.permissions.length} permissions for ${appId}`);
      await permissionService.registerPermissions(appId, manifest.permissions);
    }

    // Register CPT definitions
    if (manifest.cpt && manifest.cpt.length > 0) {
      logger.info(`[AppManager] Registering ${manifest.cpt.length} CPT types for ${appId}`);
      for (const cptDef of manifest.cpt) {
        try {
          // Convert manifest CPT definition to CPT Registry schema format
          const cptSchema = {
            name: cptDef.name,
            storage: cptDef.storage || 'entity',
            fields: [], // Will be populated from entity or schema file
            metadata: {
              label: cptDef.label,
              supports: cptDef.supports,
              appId,
            },
          };
          cptRegistry.register(cptSchema as any);
          logger.info(`[AppManager] ✓ Registered CPT: ${cptDef.name}`);
        } catch (error) {
          logger.error(`[AppManager] Failed to register CPT "${cptDef.name}":`, error);
        }
      }
    }

    // Register ACF field groups
    if (manifest.acf && manifest.acf.length > 0) {
      logger.info(`[AppManager] Registering ${manifest.acf.length} ACF groups for ${appId}`);
      acfRegistry.registerMultiple(appId, manifest.acf);
    }

    // Run lifecycle.install hook
    if (manifest.lifecycle?.install) {
      logger.info(`[AppManager] Running install hook for ${appId}`);
      try {
        await this.runLifecycleHook(appId, manifest, manifest.lifecycle.install, 'install');
        logger.info(`[AppManager] ✓ Install hook completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Install hook failed for ${appId}:`, error);
        throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // TODO: Run migrations (if core app)
  }

  /**
   * Check if an app is installed
   *
   * @param appId - App identifier
   * @returns true if app is installed
   */
  private async isInstalled(appId: string): Promise<boolean> {
    const entry = await this.repo.findOne({ where: { appId } });
    return !!entry;
  }

  /**
   * Activate an app
   * Changes status to 'active'
   *
   * @param appId - App identifier
   */
  async activate(appId: string): Promise<void> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      throw new Error(`App ${appId} is not installed`);
    }

    // Load manifest
    const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;

    // Run lifecycle.activate hook
    if (manifest?.lifecycle?.activate) {
      logger.info(`[AppManager] Running activate hook for ${appId}`);
      try {
        await this.runLifecycleHook(appId, manifest, manifest.lifecycle.activate, 'activate');
        logger.info(`[AppManager] ✓ Activate hook completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Activate hook failed for ${appId}:`, error);
        throw new Error(`Activation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    entry.status = 'active';
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    logger.info(`[AppManager] ✓ App ${appId} activated successfully`);
  }

  /**
   * Deactivate an app
   * Changes status to 'inactive'
   *
   * @param appId - App identifier
   */
  async deactivate(appId: string): Promise<void> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      throw new Error(`App ${appId} is not installed`);
    }

    // Load manifest
    const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;

    // Run lifecycle.deactivate hook
    if (manifest?.lifecycle?.deactivate) {
      logger.info(`[AppManager] Running deactivate hook for ${appId}`);
      try {
        await this.runLifecycleHook(appId, manifest, manifest.lifecycle.deactivate, 'deactivate');
        logger.info(`[AppManager] ✓ Deactivate hook completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Deactivate hook failed for ${appId}:`, error);
        // Don't throw - allow deactivation to proceed
      }
    }

    entry.status = 'inactive';
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    logger.info(`[AppManager] ✓ App ${appId} deactivated successfully`);
  }

  /**
   * Check if an app can be uninstalled
   * Returns list of dependent apps if any
   *
   * @param appId - App identifier
   * @returns Array of dependent appIds (empty if can uninstall)
   */
  async canUninstall(appId: string): Promise<string[]> {
    return this.dependencyResolver.findDependents(appId);
  }

  /**
   * Uninstall an app
   * Checks for dependents and prevents uninstall if found
   *
   * @param appId - App identifier
   * @param options - Uninstall options
   * @throws DependencyError if app has dependents and force is not set
   */
  async uninstall(
    appId: string,
    options?: { force?: boolean; purgeData?: boolean }
  ): Promise<void> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      // Already uninstalled - silently succeed
      return;
    }

    // Check for dependents
    const dependents = await this.canUninstall(appId);

    if (dependents.length > 0 && !options?.force) {
      throw new DependencyError(
        `Cannot uninstall ${appId}: The following apps depend on it: ${dependents.join(', ')}. ` +
        `Please uninstall these apps first, or use force option to cascade uninstall.`,
        dependents
      );
    }

    // If force, uninstall dependents first (cascade)
    if (options?.force && dependents.length > 0) {
      const uninstallOrder = await this.dependencyResolver.resolveUninstallOrder([
        appId,
        ...dependents
      ]);

      for (const targetAppId of uninstallOrder) {
        await this.uninstallSingleApp(targetAppId, options);
      }
    } else {
      await this.uninstallSingleApp(appId, options);
    }
  }

  /**
   * Uninstall a single app (internal method)
   *
   * @param appId - App identifier
   * @param options - Uninstall options
   */
  private async uninstallSingleApp(
    appId: string,
    options?: { purgeData?: boolean }
  ): Promise<void> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      return;
    }

    // Load manifest to get uninstall policy
    const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;
    const uninstallPolicy = manifest?.uninstallPolicy || {
      defaultMode: 'keep-data',
      allowPurge: true,
      autoBackup: false,
    };

    // Determine if we should purge data
    const shouldPurge = options?.purgeData ?? (uninstallPolicy.defaultMode === 'purge-data');

    // Deactivate first if active
    if (entry.status === 'active') {
      await this.deactivate(appId);
    }

    // Purge data if requested
    if (shouldPurge && uninstallPolicy.allowPurge && manifest) {
      logger.info(`[AppManager] Purging data for ${appId}`);

      try {
        // Verify which resources actually exist before purging
        const verifiedResources = await this.ownershipResolver.getVerifiedOwnedResources(manifest);

        logger.info(
          `[AppManager] Verified owned resources for ${appId}:`,
          `${verifiedResources.tables.length} tables, ` +
          `${verifiedResources.cpt.length} CPTs, ` +
          `${verifiedResources.acf.length} ACFs`
        );

        if (verifiedResources.missingTables.length > 0) {
          logger.warn(
            `[AppManager] Skipping non-existent tables for ${appId}:`,
            verifiedResources.missingTables
          );
        }

        // Purge only verified resources
        await this.dataCleaner.purge({
          appId,
          appType: entry.type,
          ownsTables: verifiedResources.tables,
          ownsCPT: verifiedResources.cpt,
          ownsACF: verifiedResources.acf,
        });

        logger.info(`[AppManager] ✓ Data purge completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Failed to purge data for ${appId}:`, error);
        throw error;
      }
    } else {
      logger.info(`[AppManager] Keeping data for ${appId} (keep-data mode)`);
    }

    // Run lifecycle.uninstall hook
    if (manifest?.lifecycle?.uninstall) {
      logger.info(`[AppManager] Running uninstall hook for ${appId}`);
      try {
        await this.runLifecycleHook(appId, manifest, manifest.lifecycle.uninstall, 'uninstall', { purgeData: shouldPurge });
        logger.info(`[AppManager] ✓ Uninstall hook completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Uninstall hook failed for ${appId}:`, error);
        // Don't throw - allow uninstall to proceed
      }
    }

    // Remove Permissions
    logger.info(`[AppManager] Removing permissions for ${appId}`);
    await permissionService.deletePermissionsByApp(appId);

    // Unregister ACF groups
    logger.info(`[AppManager] Unregistering ACF groups for ${appId}`);
    acfRegistry.unregisterByApp(appId);

    // Note: CPT unregistration is complex (may be shared), skip for now
    // TODO: Add CPT reference counting or ownership management

    // Remove from registry
    await this.repo.remove(entry);

    logger.info(`[AppManager] ✓ App ${appId} uninstalled successfully`);
  }

  /**
   * Update an app to the latest version from catalog
   * Updates the version field in the registry
   *
   * @param appId - App identifier
   */
  async update(appId: string): Promise<void> {
    // Get catalog item
    const catalogItem = getCatalogItem(appId);
    if (!catalogItem) {
      throw new Error(`App ${appId} not found in catalog`);
    }

    // Check if app is installed
    const entry = await this.repo.findOne({ where: { appId } });
    if (!entry) {
      throw new Error(`App ${appId} is not installed`);
    }

    // Check if update is actually available
    if (!isNewerVersion(entry.version, catalogItem.version)) {
      throw new Error(`No update available for ${appId}. Current: ${entry.version}, Available: ${catalogItem.version}`);
    }

    // Update version
    entry.version = catalogItem.version;
    entry.updatedAt = new Date();

    await this.repo.save(entry);
  }

  /**
   * List all installed apps
   *
   * @returns Array of AppRegistry entries
   */
  async listInstalled(): Promise<AppRegistry[]> {
    return this.repo.find({
      order: {
        installedAt: 'DESC',
      },
    });
  }

  /**
   * Get app status
   *
   * @param appId - App identifier
   * @returns AppRegistry entry or null if not installed
   */
  async getAppStatus(appId: string): Promise<AppRegistry | null> {
    return this.repo.findOne({ where: { appId } });
  }

  /**
   * Check if an app is active
   *
   * @param appId - App identifier
   * @returns true if app is installed and active
   */
  async isAppActive(appId: string): Promise<boolean> {
    const entry = await this.repo.findOne({ where: { appId } });
    return entry?.status === 'active';
  }

  /**
   * List all active apps
   *
   * @returns Array of active AppRegistry entries
   */
  async listActiveApps(): Promise<AppRegistry[]> {
    return this.repo.find({
      where: { status: 'active' },
      order: {
        installedAt: 'DESC',
      },
    });
  }

  /**
   * Run a lifecycle hook from an app's manifest
   *
   * @param appId - App identifier
   * @param manifest - App manifest
   * @param hookPath - Relative path to hook module (from app package)
   * @param hookType - Type of hook (install/activate/deactivate/uninstall)
   * @param options - Additional options to pass to hook
   * @private
   */
  private async runLifecycleHook(
    appId: string,
    manifest: AppManifest,
    hookPath: string,
    hookType: 'install' | 'activate' | 'deactivate' | 'uninstall',
    options?: Record<string, any>
  ): Promise<void> {
    try {
      // Resolve hook module path
      // Hook path is relative to the app package (e.g., './lifecycle/install.js')
      // For now, we'll import from the published @o4o-apps/{app-name} package
      const packageName = this.getAppPackageName(appId);
      const hookModule = hookPath.replace(/^\.\//, '').replace(/\.js$/, '.js');
      const modulePath = `${packageName}/${hookModule}`;

      logger.info(`[AppManager] Loading lifecycle hook: ${modulePath}`);

      // Dynamic import
      const module = await import(modulePath);

      // Determine hook function name based on type
      const hookFunctionName = hookType; // e.g., 'install', 'activate', etc.
      const hookFunction = module[hookFunctionName] || module.default;

      if (typeof hookFunction !== 'function') {
        throw new Error(
          `Lifecycle hook "${hookFunctionName}" not found or not a function in module: ${modulePath}`
        );
      }

      // Prepare context based on hook type
      const baseContext = {
        appId,
        manifest,
        dataSource: AppDataSource,
        logger,
        options: options || {},
      };

      // Call the hook function
      await hookFunction(baseContext);

    } catch (error) {
      logger.error(`[AppManager] Failed to run ${hookType} hook for ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Get the npm package name for an app
   * Maps appId to package name (e.g., 'forum-core' -> '@o4o-apps/forum')
   *
   * @param appId - App identifier
   * @returns Package name
   * @private
   */
  private getAppPackageName(appId: string): string {
    // Map common app IDs to package names
    const packageMap: Record<string, string> = {
      'forum-core': '@o4o-apps/forum',
      'forum-neture': '@o4o-apps/forum-neture',
      // Add more mappings as needed
    };

    return packageMap[appId] || `@o4o-apps/${appId}`;
  }
}
