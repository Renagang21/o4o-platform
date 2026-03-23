/**
 * AppManager — Registry queries (read-only operations)
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1
 * Extracted from AppManager.ts
 */

import type { Repository } from 'typeorm';
import type { AppRegistry } from '../../entities/AppRegistry.js';
import { getCatalogItem } from '../../app-manifests/appsCatalog.js';
import { isNewerVersion } from '../../utils/semver.js';
import type { AppDependencyResolver } from '../AppDependencyResolver.js';

/**
 * Check if an app is installed
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 * @returns true if app is installed
 */
export async function isInstalled(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<boolean> {
  const entry = await repo.findOne({ where: { appId } });
  return !!entry;
}

/**
 * List all installed apps
 *
 * @param repo - AppRegistry repository
 * @returns Array of AppRegistry entries
 */
export async function listInstalled(
  repo: Repository<AppRegistry>
): Promise<AppRegistry[]> {
  return repo.find({
    order: {
      installedAt: 'DESC',
    },
  });
}

/**
 * Get app status
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 * @returns AppRegistry entry or null if not installed
 */
export async function getAppStatus(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<AppRegistry | null> {
  return repo.findOne({ where: { appId } });
}

/**
 * Check if an app is active
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 * @returns true if app is installed and active
 */
export async function isAppActive(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<boolean> {
  const entry = await repo.findOne({ where: { appId } });
  return entry?.status === 'active';
}

/**
 * List all active apps
 *
 * @param repo - AppRegistry repository
 * @returns Array of active AppRegistry entries
 */
export async function listActiveApps(
  repo: Repository<AppRegistry>
): Promise<AppRegistry[]> {
  return repo.find({
    where: { status: 'active' },
    order: {
      installedAt: 'DESC',
    },
  });
}

/**
 * Check if an app can be uninstalled
 * Returns list of dependent apps if any
 *
 * @param dependencyResolver - AppDependencyResolver instance
 * @param appId - App identifier
 * @returns Array of dependent appIds (empty if can uninstall)
 */
export async function canUninstall(
  dependencyResolver: AppDependencyResolver,
  appId: string
): Promise<string[]> {
  return dependencyResolver.findDependents(appId);
}

/**
 * Get version info for an app
 * Returns current version, previous version, and available version from catalog
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 * @returns Version info object
 */
export async function getVersionInfo(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<{
  appId: string;
  currentVersion: string;
  previousVersion: string | null;
  availableVersion: string | null;
  hasUpdate: boolean;
  canRollback: boolean;
}> {
  const entry = await repo.findOne({ where: { appId } });
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
