/**
 * AppManager — Lifecycle hooks & migrations
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1
 * Extracted from AppManager.ts
 */

import { join } from 'path';
import { pathToFileURL } from 'url';
import { AppDataSource } from '../../database/connection.js';
import type { AppManifest } from '@o4o/types';
import logger from '../../utils/logger.js';
import { PACKAGE_MAP, PACKAGES_ROOT } from './app-manager.types.js';

/**
 * Get the package root path for an app
 * Resolves appId to the actual package folder path in the workspace
 */
export function getPackageRoot(appId: string): string {
  const packageFolder = PACKAGE_MAP[appId];
  if (!packageFolder) {
    throw new Error(`Package not mapped for appId: ${appId}. Add it to PACKAGE_MAP.`);
  }

  const packagePath = join(PACKAGES_ROOT, packageFolder, 'dist');

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
 */
export async function runLifecycleHook(
  appId: string,
  manifest: AppManifest,
  hookPath: string,
  hookType: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'update' | 'rollback',
  options?: Record<string, any>
): Promise<void> {
  logger.info(`[Install] Starting ${hookType} hook for app: ${appId}`);

  try {
    // Get package root path
    const pkgRoot = getPackageRoot(appId);

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
 * Run app-specific migrations
 * Migrations are defined in manifest.migrations array
 *
 * @param appId - App identifier
 * @param manifest - App manifest
 * @param fromVersion - Starting version
 * @param toVersion - Target version
 * @param direction - Migration direction ('up' for upgrade, 'down' for rollback)
 */
export async function runAppMigrations(
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
    const pkgRoot = getPackageRoot(appId);
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
