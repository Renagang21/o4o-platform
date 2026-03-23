/**
 * AppManager — State-changing operations (activate, deactivate, uninstall, update, rollback)
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1
 * Extracted from AppManager.ts
 */

import type { Repository } from 'typeorm';
import type { AppRegistry } from '../../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../../app-manifests/index.js';
import { getCatalogItem } from '../../app-manifests/appsCatalog.js';
import { isNewerVersion } from '../../utils/semver.js';
import type { AppDataCleaner } from '../AppDataCleaner.js';
import type { AppTableOwnershipResolver } from '../AppTableOwnershipResolver.js';
import { getExtensionMergeService } from '../ExtensionMergeService.js';
import { permissionService } from '../../modules/auth/services/permission.service.js';
import { acfRegistry } from '../ACFRegistry.js';
import logger from '../../utils/logger.js';
import { runLifecycleHook, runAppMigrations } from './app-manager.lifecycle.js';

/**
 * Activate an app
 * Changes status to 'active'
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 */
export async function activateApp(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<void> {
  const entry = await repo.findOne({ where: { appId } });

  if (!entry) {
    throw new Error(`App ${appId} is not installed`);
  }

  // Load manifest
  const manifest = hasManifest(appId) ? loadLocalManifest(appId) : null;

  // Run lifecycle.activate hook
  if (manifest?.lifecycle?.activate) {
    logger.info(`[AppManager] Running activate hook for ${appId}`);
    try {
      await runLifecycleHook(appId, manifest, manifest.lifecycle.activate, 'activate');
      logger.info(`[AppManager] ✓ Activate hook completed for ${appId}`);
    } catch (error) {
      logger.error(`[AppManager] Activate hook failed for ${appId}:`, error);
      throw new Error(`Activation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  entry.status = 'active';
  entry.updatedAt = new Date();

  await repo.save(entry);

  logger.info(`[AppManager] ✓ App ${appId} activated successfully`);
}

/**
 * Deactivate an app
 * Changes status to 'inactive'
 * Detaches CPT/ACF registrations (keeps data, just unregisters from runtime)
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 */
export async function deactivateApp(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<void> {
  const entry = await repo.findOne({ where: { appId } });

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
      await runLifecycleHook(appId, manifest, manifest.lifecycle.deactivate, 'deactivate');
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

  await repo.save(entry);

  logger.info(`[AppManager] ✅ App ${appId} deactivated successfully`);
}

/**
 * Uninstall a single app (internal method)
 *
 * @param repo - AppRegistry repository
 * @param ownershipResolver - AppTableOwnershipResolver instance
 * @param dataCleaner - AppDataCleaner instance
 * @param extensionMergeService - ExtensionMergeService instance
 * @param appId - App identifier
 * @param options - Uninstall options
 */
export async function uninstallSingleApp(
  repo: Repository<AppRegistry>,
  ownershipResolver: AppTableOwnershipResolver,
  dataCleaner: AppDataCleaner,
  extensionMergeService: ReturnType<typeof getExtensionMergeService>,
  appId: string,
  options?: { purgeData?: boolean }
): Promise<void> {
  const entry = await repo.findOne({ where: { appId } });

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
    await deactivateApp(repo, appId);
  }

  // Purge data if requested
  if (shouldPurge && uninstallPolicy.allowPurge && manifest) {
    logger.info(`[AppManager] Purging data for ${appId}`);

    try {
      // Verify which resources actually exist before purging
      const verifiedResources = await ownershipResolver.getVerifiedOwnedResources(manifest);

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
      await dataCleaner.purge({
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
      await runLifecycleHook(appId, manifest, manifest.lifecycle.uninstall, 'uninstall', { purgeData: shouldPurge });
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
  const unregisteredCount = extensionMergeService.unregisterAll(appId);
  logger.info(`[AppManager] Unregistered ${unregisteredCount} resources from ExtensionMergeService for ${appId}`);

  // Remove from registry
  await repo.remove(entry);

  logger.info(`[AppManager] ✓ App ${appId} uninstalled successfully`);
}

/**
 * Update an app to the latest version from catalog
 * Runs update hook if defined, then updates version in registry
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 */
export async function updateApp(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<void> {
  // Get catalog item
  const catalogItem = getCatalogItem(appId);
  if (!catalogItem) {
    throw new Error(`App ${appId} not found in catalog`);
  }

  // Check if app is installed
  const entry = await repo.findOne({ where: { appId } });
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
      await runLifecycleHook(appId, manifest, manifest.lifecycle.update, 'update', {
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
      await runAppMigrations(appId, manifest, oldVersion, newVersion);
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

  await repo.save(entry);

  logger.info(`[AppManager] ✅ App ${appId} updated successfully: ${oldVersion} → ${newVersion}`);
}

/**
 * Rollback an app to its previous version
 * Only available if previousVersion is set
 *
 * @param repo - AppRegistry repository
 * @param appId - App identifier
 * @returns Rollback result with reverted version
 */
export async function rollbackApp(
  repo: Repository<AppRegistry>,
  appId: string
): Promise<{ ok: boolean; revertedTo: string }> {
  const entry = await repo.findOne({ where: { appId } });

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
      await runLifecycleHook(appId, manifest, manifest.lifecycle.rollback, 'rollback', {
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
      await runAppMigrations(appId, manifest, currentVersion, previousVersion, 'down');
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

  await repo.save(entry);

  logger.info(`[AppManager] ✅ App ${appId} rolled back successfully: ${currentVersion} → ${previousVersion}`);

  return { ok: true, revertedTo: previousVersion };
}
