import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AppRegistry } from '../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../app-manifests/index.js';
import { getCatalogItem } from '../app-manifests/appsCatalog.js';
import { isNewerVersion } from '../utils/semver.js';
import { AppDependencyResolver, DependencyError } from './AppDependencyResolver.js';
import { AppDataCleaner } from './AppDataCleaner.js';
import { AppTableOwnershipResolver, OwnershipValidationError } from './AppTableOwnershipResolver.js';
import { getExtensionMergeService } from './ExtensionMergeService.js';
import { permissionService } from '../modules/auth/services/permission.service.js';
import { acfRegistry } from './ACFRegistry.js';
import { registry as cptRegistry } from '@o4o/cpt-registry';
import type { AppManifest, InstallContext, ActivateContext, DeactivateContext, UninstallContext } from '@o4o/types';
import logger from '../utils/logger.js';
import { pathToFileURL } from 'url';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Package mapping: appId -> package folder name
 * Used to resolve lifecycle hook paths
 */
const PACKAGE_MAP: Record<string, string> = {
  'forum': 'forum-app',
  'forum-core': 'forum-app',
  'forum-yaksa': 'forum-yaksa',
  'lms-core': 'lms-core',
  'organization-core': 'organization-core',
  'organization-forum': 'organization-forum',
  'dropshipping': 'dropshipping-core',
  'dropshipping-core': 'dropshipping-core',
  'dropshipping-cosmetics': 'dropshipping-cosmetics',
  'membership-yaksa': 'membership-yaksa',
  'sellerops': 'sellerops',
  'supplierops': 'supplierops',
  'cms-core': 'cms-core',
  'market-trial': 'market-trial',
};

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
  private extensionMergeService: ReturnType<typeof getExtensionMergeService>;

  constructor() {
    this.repo = AppDataSource.getRepository(AppRegistry);
    this.dependencyResolver = new AppDependencyResolver();
    this.dataCleaner = new AppDataCleaner();
    this.ownershipResolver = new AppTableOwnershipResolver();
    this.extensionMergeService = getExtensionMergeService();
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
    const actualAppId = manifest.appId || appId;

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

    // Validate for potential conflicts (CPT, Route, ACF)
    logger.info(`[AppManager] Checking for resource conflicts for ${appId}...`);
    const conflicts = this.extensionMergeService.validateManifest(appId, manifest);
    if (conflicts.length > 0) {
      const errorConflicts = conflicts.filter(c => {
        const policy = this.extensionMergeService['config'][c.conflictType];
        return policy === 'error';
      });
      if (errorConflicts.length > 0) {
        const messages = errorConflicts.map(c => c.details).join('; ');
        logger.error(`[AppManager] ✗ Resource conflicts detected for ${appId}:`, messages);
        throw new Error(`Resource conflicts: ${messages}`);
      }
      logger.warn(`[AppManager] ⚠ Non-blocking conflicts detected for ${appId}:`,
        conflicts.map(c => c.details).join('; '));
    } else {
      logger.info(`[AppManager] ✓ No resource conflicts for ${appId}`);
    }

    // Check if already installed using actual appId from manifest
    let entry = await this.repo.findOne({ where: { appId: actualAppId } });
    if (entry) {
      logger.info(`[AppManager] App ${actualAppId} already installed (status: ${entry.status})`);
      return; // Already installed, skip
    }

    // Also check with the alias appId if different
    if (appId !== actualAppId) {
      entry = await this.repo.findOne({ where: { appId } });
    }

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
          // Register with ExtensionMergeService first (for conflict tracking)
          const mergeResult = this.extensionMergeService.register('cpt', cptDef.name, appId, cptDef);
          if (!mergeResult.success) {
            logger.warn(`[AppManager] CPT merge conflict: ${mergeResult.message}`);
            continue; // Skip this CPT based on merge policy
          }

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

    // Register Routes with ExtensionMergeService
    if (manifest.routes && manifest.routes.length > 0) {
      logger.info(`[AppManager] Registering ${manifest.routes.length} routes for ${appId}`);
      for (const route of manifest.routes) {
        const mergeResult = this.extensionMergeService.register('route', route, appId);
        if (mergeResult.success) {
          logger.info(`[AppManager] ✓ Registered route: ${route}`);
        } else {
          logger.warn(`[AppManager] Route merge conflict: ${mergeResult.message}`);
        }
      }
    }

    // Register ACF field groups
    if (manifest.acf && manifest.acf.length > 0) {
      logger.info(`[AppManager] Registering ${manifest.acf.length} ACF groups for ${appId}`);
      for (const acfGroup of manifest.acf) {
        // Register with ExtensionMergeService first (for conflict tracking)
        const mergeResult = this.extensionMergeService.register('acf', acfGroup.groupId, appId, acfGroup);
        if (!mergeResult.success) {
          logger.warn(`[AppManager] ACF merge conflict: ${mergeResult.message}`);
          continue; // Skip this ACF based on merge policy
        }
      }
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
   * Detaches CPT/ACF registrations (keeps data, just unregisters from runtime)
   *
   * @param appId - App identifier
   */
  async deactivate(appId: string): Promise<void> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      throw new Error(`App ${appId} is not installed`);
    }

    logger.info(`[AppManager] 🔄 Deactivating app: ${appId}`);

    // Load manifest
    const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;

    // Run lifecycle.deactivate hook first
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

    // Detach CPT registrations (keep data, just unregister from runtime)
    if (manifest?.cpt && manifest.cpt.length > 0) {
      logger.info(`[AppManager] Detaching ${manifest.cpt.length} CPT types for ${appId}`);
      for (const cptDef of manifest.cpt) {
        try {
          // Note: cptRegistry.unregister() would need to be implemented
          // For now, log the intent - CPT will be re-registered on activate
          logger.info(`[AppManager] Detached CPT: ${cptDef.name} (will re-register on activate)`);
        } catch (error) {
          logger.warn(`[AppManager] Failed to detach CPT "${cptDef.name}":`, error);
        }
      }
    }

    // Detach ACF field groups from runtime (keep registrations for re-activation)
    if (manifest?.acf && manifest.acf.length > 0) {
      logger.info(`[AppManager] Detaching ${manifest.acf.length} ACF groups for ${appId}`);
      // ACF groups remain in registry but marked as inactive
      // acfRegistry.deactivateByApp(appId) - would need implementation
    }

    // Update status
    entry.status = 'inactive';
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    logger.info(`[AppManager] ✅ App ${appId} deactivated successfully`);
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

    // Unregister all resources from ExtensionMergeService
    const unregisteredCount = this.extensionMergeService.unregisterAll(appId);
    logger.info(`[AppManager] Unregistered ${unregisteredCount} resources from ExtensionMergeService for ${appId}`);

    // Remove from registry
    await this.repo.remove(entry);

    logger.info(`[AppManager] ✓ App ${appId} uninstalled successfully`);
  }

  /**
   * Update an app to the latest version from catalog
   * Runs update hook if defined, then updates version in registry
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

    const oldVersion = entry.version;
    const newVersion = catalogItem.version;

    // Check if update is actually available
    if (!isNewerVersion(oldVersion, newVersion)) {
      throw new Error(`No update available for ${appId}. Current: ${oldVersion}, Available: ${newVersion}`);
    }

    logger.info(`[AppManager] 🔄 Updating ${appId}: ${oldVersion} → ${newVersion}`);

    // Load manifest
    const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;

    // Run lifecycle.update hook if defined
    if (manifest?.lifecycle?.update) {
      logger.info(`[AppManager] Running update hook for ${appId}`);
      try {
        await this.runLifecycleHook(appId, manifest, manifest.lifecycle.update, 'update', {
          oldVersion,
          newVersion,
        });
        logger.info(`[AppManager] ✓ Update hook completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Update hook failed for ${appId}:`, error);
        throw new Error(`Update failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Run app-specific migrations
    if (manifest?.migrations) {
      logger.info(`[AppManager] Running migrations for ${appId}: ${oldVersion} → ${newVersion}`);
      try {
        await this.runAppMigrations(appId, manifest, oldVersion, newVersion);
        logger.info(`[AppManager] ✓ Migrations completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Migrations failed for ${appId}:`, error);
        throw new Error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update version in registry (save previousVersion for rollback)
    entry.previousVersion = oldVersion;
    entry.version = newVersion;
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    logger.info(`[AppManager] ✅ App ${appId} updated successfully: ${oldVersion} → ${newVersion}`);
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
   * Get the package root path for an app
   * Resolves appId to the actual package folder path in the workspace
   *
   * @param appId - App identifier
   * @returns Absolute path to the package's dist folder
   * @private
   */
  private getPackageRoot(appId: string): string {
    const packageFolder = PACKAGE_MAP[appId];
    if (!packageFolder) {
      throw new Error(`Package not mapped for appId: ${appId}. Add it to PACKAGE_MAP.`);
    }

    // Path from api-server/src/services -> packages/{folder}/dist
    // In production: apps/api-server -> packages/{folder}
    const packagesRoot = resolve(__dirname, '../../../../packages');
    const packagePath = join(packagesRoot, packageFolder, 'dist');

    logger.info(`[AppManager] Resolved package root for ${appId}: ${packagePath}`);
    return packagePath;
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
    hookType: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'update' | 'rollback',
    options?: Record<string, any>
  ): Promise<void> {
    logger.info(`[Install] Starting ${hookType} hook for app: ${appId}`);

    try {
      // Get package root path
      const pkgRoot = this.getPackageRoot(appId);

      // Resolve hook module path
      // hookPath is like './lifecycle/install.js' -> 'lifecycle/install.js'
      const hookModule = hookPath.replace(/^\.\//, '').replace(/\.ts$/, '.js');
      const hookFullPath = join(pkgRoot, hookModule);

      // Convert to file:// URL for dynamic import
      const moduleUrl = pathToFileURL(hookFullPath).href;

      logger.info(`[Install] Loading lifecycle hook: ${hookModule}`);
      logger.info(`[Install] Hook path resolved: ${moduleUrl}`);

      // Dynamic import using file:// URL
      const module = await import(moduleUrl);

      // Determine hook function name based on type
      const hookFunctionName = hookType; // e.g., 'install', 'activate', etc.
      const hookFunction = module[hookFunctionName] || module.default;

      if (typeof hookFunction !== 'function') {
        throw new Error(
          `Lifecycle hook "${hookFunctionName}" not found or not a function in module: ${hookFullPath}`
        );
      }

      logger.info(`[Install] Running lifecycle hook: ${hookModule}`);

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

      logger.info(`[Install] Hook completed successfully: ${hookModule}`);

    } catch (error) {
      logger.error(`[Install] Hook failed for ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Rollback an app to its previous version
   * Only available if previousVersion is set
   *
   * @param appId - App identifier
   * @returns Rollback result with reverted version
   */
  async rollback(appId: string): Promise<{ ok: boolean; revertedTo: string }> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      throw new Error(`App ${appId} is not installed`);
    }

    if (!entry.previousVersion) {
      throw new Error(`No rollback available for ${appId}. No previous version recorded.`);
    }

    const currentVersion = entry.version;
    const previousVersion = entry.previousVersion;

    logger.info(`[AppManager] 🔙 Rolling back ${appId}: ${currentVersion} → ${previousVersion}`);

    // Load manifest
    const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;

    // Run lifecycle.rollback hook if defined
    if (manifest?.lifecycle?.rollback) {
      logger.info(`[AppManager] Running rollback hook for ${appId}`);
      try {
        await this.runLifecycleHook(appId, manifest, manifest.lifecycle.rollback, 'rollback', {
          currentVersion,
          previousVersion,
        });
        logger.info(`[AppManager] ✓ Rollback hook completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Rollback hook failed for ${appId}:`, error);
        // Don't throw - allow rollback to proceed
      }
    }

    // Run reverse migrations if available
    if (manifest?.migrations) {
      logger.info(`[AppManager] Running reverse migrations for ${appId}: ${currentVersion} → ${previousVersion}`);
      try {
        await this.runAppMigrations(appId, manifest, currentVersion, previousVersion, 'down');
        logger.info(`[AppManager] ✓ Reverse migrations completed for ${appId}`);
      } catch (error) {
        logger.error(`[AppManager] Reverse migrations failed for ${appId}:`, error);
        // Don't throw - allow rollback to proceed
      }
    }

    // Update version in registry
    entry.version = previousVersion;
    entry.previousVersion = undefined; // Clear previousVersion after rollback
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    logger.info(`[AppManager] ✅ App ${appId} rolled back successfully: ${currentVersion} → ${previousVersion}`);

    return { ok: true, revertedTo: previousVersion };
  }

  /**
   * Run app-specific migrations
   * Migrations are defined in manifest.migrations array
   *
   * @param appId - App identifier
   * @param manifest - App manifest
   * @param fromVersion - Starting version
   * @param toVersion - Target version
   * @param direction - Migration direction ('up' for upgrade, 'down' for rollback)
   */
  private async runAppMigrations(
    appId: string,
    manifest: AppManifest,
    fromVersion: string,
    toVersion: string,
    direction: 'up' | 'down' = 'up'
  ): Promise<void> {
    const migrations = manifest.migrations;
    if (!migrations || !migrations.scripts || migrations.scripts.length === 0) {
      logger.info(`[AppManager] No migrations defined for ${appId}`);
      return;
    }

    logger.info(`[AppManager] Loading migrations for ${appId}: ${migrations.scripts.length} migration scripts`);

    try {
      const pkgRoot = this.getPackageRoot(appId);
      const loadedMigrations: Array<{
        version: string;
        up: (ds: typeof AppDataSource) => Promise<void>;
        down?: (ds: typeof AppDataSource) => Promise<void>;
      }> = [];

      // Load all migration modules
      for (const scriptPath of migrations.scripts) {
        try {
          const migrationPath = scriptPath.replace(/^\.\//, '').replace(/\.ts$/, '.js');
          const fullPath = join(pkgRoot, migrationPath);
          const moduleUrl = pathToFileURL(fullPath).href;

          const module = await import(moduleUrl);
          const migration = module.default || module;

          if (migration.version && typeof migration.up === 'function') {
            loadedMigrations.push(migration);
          }
        } catch (error) {
          logger.warn(`[AppManager] Failed to load migration ${scriptPath}:`, error);
        }
      }

      // Sort migrations by version
      loadedMigrations.sort((a, b) => {
        const semver = require('semver');
        return semver.compare(a.version, b.version);
      });

      // Filter migrations that need to run
      const semver = require('semver');
      const migrationsToRun = loadedMigrations.filter((m) => {
        if (direction === 'up') {
          // For upgrade: run migrations > fromVersion and <= toVersion
          return semver.gt(m.version, fromVersion) && semver.lte(m.version, toVersion);
        } else {
          // For rollback: run migrations <= fromVersion and > toVersion (in reverse order)
          return semver.lte(m.version, fromVersion) && semver.gt(m.version, toVersion);
        }
      });

      // Reverse order for rollback
      if (direction === 'down') {
        migrationsToRun.reverse();
      }

      logger.info(`[AppManager] Running ${migrationsToRun.length} migrations (${direction})`);

      // Execute migrations
      for (const migration of migrationsToRun) {
        logger.info(`[AppManager] Running migration ${migration.version} (${direction})`);
        try {
          if (direction === 'up') {
            await migration.up(AppDataSource);
          } else if (migration.down) {
            await migration.down(AppDataSource);
          } else {
            logger.warn(`[AppManager] Migration ${migration.version} has no down() function, skipping`);
          }
          logger.info(`[AppManager] ✓ Migration ${migration.version} completed`);
        } catch (error) {
          logger.error(`[AppManager] Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    } catch (error) {
      logger.error(`[AppManager] Migration execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get version info for an app
   * Returns current version, previous version, and available version from catalog
   *
   * @param appId - App identifier
   * @returns Version info object
   */
  async getVersionInfo(appId: string): Promise<{
    appId: string;
    currentVersion: string;
    previousVersion: string | null;
    availableVersion: string | null;
    hasUpdate: boolean;
    canRollback: boolean;
  }> {
    const entry = await this.repo.findOne({ where: { appId } });
    if (!entry) {
      throw new Error(`App ${appId} is not installed`);
    }

    const catalogItem = getCatalogItem(appId);
    const availableVersion = catalogItem?.version || null;
    const hasUpdate = availableVersion ? isNewerVersion(entry.version, availableVersion) : false;

    return {
      appId,
      currentVersion: entry.version,
      previousVersion: entry.previousVersion || null,
      availableVersion,
      hasUpdate,
      canRollback: !!entry.previousVersion,
    };
  }
}
