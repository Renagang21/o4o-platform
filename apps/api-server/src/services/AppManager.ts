import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AppRegistry } from '../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../app-manifests/index.js';
import type { AppManifest } from '@o4o/types';

/**
 * AppManager Service
 *
 * Manages feature-level app installation, activation, deactivation, and uninstallation
 * Works with AppRegistry entity and local manifests
 */
export class AppManager {
  private repo: Repository<AppRegistry>;

  constructor() {
    this.repo = AppDataSource.getRepository(AppRegistry);
  }

  /**
   * Install an app
   * If app is already installed, updates version from manifest
   *
   * @param appId - App identifier (e.g., 'forum', 'digitalsignage')
   */
  async install(appId: string): Promise<void> {
    // Load manifest - throws if not found
    if (!hasManifest(appId)) {
      throw new Error(`No manifest found for app: ${appId}`);
    }

    const manifest = loadLocalManifest(appId);

    let entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      // Create new entry
      entry = this.repo.create({
        appId: manifest.appId,
        name: manifest.name,
        version: manifest.version,
        status: 'installed',
        source: 'local',
      });
    } else {
      // Update existing entry
      entry.name = manifest.name;
      entry.version = manifest.version;
      entry.updatedAt = new Date();

      // If status was not set, set to installed
      if (!entry.status) {
        entry.status = 'installed';
      }
    }

    await this.repo.save(entry);
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
   * Uninstall an app
   * Removes the app from registry (logical delete for V1)
   *
   * @param appId - App identifier
   */
  async uninstall(appId: string): Promise<void> {
    const entry = await this.repo.findOne({ where: { appId } });

    if (!entry) {
      // Already uninstalled - silently succeed
      return;
    }

    await this.repo.remove(entry);

    // TODO: Future - Handle data cleanup (CPT records, ACF data, etc.)
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
}
