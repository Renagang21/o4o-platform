/**
 * AppManager — Facade (orchestration layer)
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1
 * Preserves original AppManager public API.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AppRegistry } from '../../entities/AppRegistry.js';
import { AppDependencyResolver, DependencyError } from '../AppDependencyResolver.js';
import { AppDataCleaner } from '../AppDataCleaner.js';
import { AppTableOwnershipResolver } from '../AppTableOwnershipResolver.js';
import { getExtensionMergeService } from '../ExtensionMergeService.js';
import { installSingleApp } from './app-manager.loader.js';
import {
  activateApp,
  deactivateApp,
  uninstallSingleApp,
  updateApp,
  rollbackApp,
} from './app-manager.execution.js';
import {
  isInstalled,
  listInstalled,
  getAppStatus,
  isAppActive,
  listActiveApps,
  canUninstall,
  getVersionInfo,
} from './app-manager.registry.js';

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
      const installed = await isInstalled(this.repo, targetAppId);

      if (!installed) {
        await installSingleApp(this.repo, this.ownershipResolver, this.extensionMergeService, targetAppId);
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

  async activate(appId: string): Promise<void> {
    return activateApp(this.repo, appId);
  }

  async deactivate(appId: string): Promise<void> {
    return deactivateApp(this.repo, appId);
  }

  /**
   * Check if an app can be uninstalled
   * Returns list of dependent apps if any
   */
  async canUninstall(appId: string): Promise<string[]> {
    return canUninstall(this.dependencyResolver, appId);
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
        await uninstallSingleApp(
          this.repo, this.ownershipResolver, this.dataCleaner, this.extensionMergeService,
          targetAppId, options
        );
      }
    } else {
      await uninstallSingleApp(
        this.repo, this.ownershipResolver, this.dataCleaner, this.extensionMergeService,
        appId, options
      );
    }
  }

  async update(appId: string): Promise<void> {
    return updateApp(this.repo, appId);
  }

  async listInstalled(): Promise<AppRegistry[]> {
    return listInstalled(this.repo);
  }

  async getAppStatus(appId: string): Promise<AppRegistry | null> {
    return getAppStatus(this.repo, appId);
  }

  async isAppActive(appId: string): Promise<boolean> {
    return isAppActive(this.repo, appId);
  }

  async listActiveApps(): Promise<AppRegistry[]> {
    return listActiveApps(this.repo);
  }

  async rollback(appId: string): Promise<{ ok: boolean; revertedTo: string }> {
    return rollbackApp(this.repo, appId);
  }

  async getVersionInfo(appId: string): Promise<{
    appId: string;
    currentVersion: string;
    previousVersion: string | null;
    availableVersion: string | null;
    hasUpdate: boolean;
    canRollback: boolean;
  }> {
    return getVersionInfo(this.repo, appId);
  }
}
