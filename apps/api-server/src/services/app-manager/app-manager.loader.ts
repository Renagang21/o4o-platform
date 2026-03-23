/**
 * AppManager — App installation (manifest loading, validation, registration)
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1
 * Extracted from AppManager.ts
 */

import type { Repository } from 'typeorm';
import type { AppRegistry } from '../../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../../app-manifests/index.js';
import { AppTableOwnershipResolver, OwnershipValidationError } from '../AppTableOwnershipResolver.js';
import { getExtensionMergeService } from '../ExtensionMergeService.js';
import { permissionService } from '../../modules/auth/services/permission.service.js';
import { acfRegistry } from '../ACFRegistry.js';
import { registry as cptRegistry } from '@o4o/cpt-registry';
import logger from '../../utils/logger.js';
import { runLifecycleHook } from './app-manager.lifecycle.js';

/**
 * Install a single app (internal method)
 * Does not handle dependencies - use AppManager.install() for public API
 *
 * @param repo - AppRegistry repository
 * @param ownershipResolver - AppTableOwnershipResolver instance
 * @param extensionMergeService - ExtensionMergeService instance
 * @param appId - App identifier
 */
export async function installSingleApp(
  repo: Repository<AppRegistry>,
  ownershipResolver: AppTableOwnershipResolver,
  extensionMergeService: ReturnType<typeof getExtensionMergeService>,
  appId: string
): Promise<void> {
  // Load manifest - throws if not found
  if (!hasManifest(appId)) {
    throw new Error(`No manifest found for app: ${appId}`);
  }

  const manifest = loadLocalManifest(appId);
  const actualAppId = manifest.appId || appId;

  // Validate ownership claims before installation
  logger.info(`[AppManager] Validating ownership for ${appId}...`);
  try {
    await ownershipResolver.validateOwnership(manifest);
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
  const conflicts = extensionMergeService.validateManifest(appId, manifest);
  if (conflicts.length > 0) {
    const errorConflicts = conflicts.filter(c => {
      const policy = extensionMergeService['config'][c.conflictType];
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
  let entry = await repo.findOne({ where: { appId: actualAppId } });
  if (entry) {
    logger.info(`[AppManager] App ${actualAppId} already installed (status: ${entry.status})`);
    return; // Already installed, skip
  }

  // Also check with the alias appId if different
  if (appId !== actualAppId) {
    entry = await repo.findOne({ where: { appId } });
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
    entry = repo.create({
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

  await repo.save(entry);

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
        const mergeResult = extensionMergeService.register('cpt', cptDef.name, appId, cptDef);
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
      const mergeResult = extensionMergeService.register('route', route, appId);
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
      const mergeResult = extensionMergeService.register('acf', acfGroup.groupId, appId, acfGroup);
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
      await runLifecycleHook(appId, manifest, manifest.lifecycle.install, 'install');
      logger.info(`[AppManager] ✓ Install hook completed for ${appId}`);
    } catch (error) {
      logger.error(`[AppManager] Install hook failed for ${appId}:`, error);
      throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // TODO: Run migrations (if core app)
}
