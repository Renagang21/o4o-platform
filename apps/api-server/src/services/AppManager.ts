import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AppRegistry } from '../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../app-manifests/index.js';
import { getCatalogItem } from '../app-manifests/appsCatalog.js';
import { isNewerVersion } from '../utils/semver.js';
import { AppDependencyResolver, DependencyError } from './AppDependencyResolver.js';
import type { AppManifest } from '@o4o/types';

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

  constructor() {
    this.repo = AppDataSource.getRepository(AppRegistry);
    this.dependencyResolver = new AppDependencyResolver();
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

    // TODO: Run lifecycle.install hook
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

    entry.status = 'active';
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    // TODO: Future - Update route/menu registration based on app status
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

    entry.status = 'inactive';
    entry.updatedAt = new Date();

    await this.repo.save(entry);

    // TODO: Future - Update route/menu registration based on app status
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

    // Deactivate first if active
    if (entry.status === 'active') {
      await this.deactivate(appId);
    }

    // TODO: Run lifecycle.uninstall hook
    // TODO: Handle data cleanup if purgeData (CPT records, ACF data, etc.)

    // Remove from registry
    await this.repo.remove(entry);
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
}
