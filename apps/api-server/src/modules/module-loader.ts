/**
 * Module Loader
 * Phase 5 — AppStore + Module Loader
 *
 * Dynamically discovers, loads, and activates app modules from the workspace
 */

import { Router } from 'express';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import type {
  AppModule,
  ModuleLoaderConfig,
  ModuleRegistry,
  ModuleRegistryEntry
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Module Loader Class
 *
 * Handles dynamic discovery and loading of app modules from workspace packages
 */
export class ModuleLoader {
  private registry: ModuleRegistry = new Map();
  private config: ModuleLoaderConfig;

  constructor(config?: Partial<ModuleLoaderConfig>) {
    // Default configuration
    const projectRoot = path.resolve(__dirname, '../../../../');
    this.config = {
      workspaceRoot: projectRoot,
      packagesDir: 'packages',
      autoActivate: false,
      scanPatterns: ['**/manifest.ts'],
      ...config
    };
  }

  /**
   * Get the module registry
   */
  getRegistry(): ModuleRegistry {
    return this.registry;
  }

  /**
   * Scan workspace for app manifest files
   *
   * @returns Array of absolute paths to manifest.ts files
   */
  async scanWorkspace(): Promise<string[]> {
    const packagesPath = path.join(this.config.workspaceRoot, this.config.packagesDir);

    logger.debug(`[ModuleLoader] Scanning for manifests in: ${packagesPath}`);

    const manifestPaths: string[] = [];

    for (const pattern of this.config.scanPatterns) {
      const fullPattern = path.join(packagesPath, pattern);
      const matches = await glob(fullPattern, {
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**']
      });
      manifestPaths.push(...matches);
    }

    logger.debug(`[ModuleLoader] Found ${manifestPaths.length} manifest files`);

    return manifestPaths;
  }

  /**
   * Load a module from a manifest file
   *
   * @param manifestPath - Absolute path to manifest.ts
   * @returns Loaded AppModule or null if loading failed
   */
  async loadModule(manifestPath: string): Promise<AppModule | null> {
    try {
      // Import the manifest
      const manifestUrl = `file://${manifestPath}`;
      const manifestModule = await import(manifestUrl);
      const manifest: AppModule = manifestModule.default || manifestModule.manifest;

      if (!manifest || !manifest.id) {
        logger.warn(`[ModuleLoader] Invalid manifest at ${manifestPath}: missing id`);
        return null;
      }

      // Store package path
      const packagePath = path.dirname(manifestPath);
      manifest.packagePath = packagePath;

      // Try to load backend exports
      const backendIndexPath = path.join(packagePath, 'dist', 'backend', 'index.js');
      try {
        const backendModule = await import(`file://${backendIndexPath}`);
        manifest.backend = {
          routes: backendModule.routes,
          services: backendModule.services,
          entities: backendModule.entities || [],
          middleware: backendModule.middleware || []
        };
        logger.debug(`[ModuleLoader] Loaded backend exports for ${manifest.id}`);
      } catch (backendError) {
        logger.debug(`[ModuleLoader] No backend exports for ${manifest.id}:`, backendError);
      }

      // Try to load lifecycle hooks
      const lifecyclePath = path.join(packagePath, 'dist', 'lifecycle');
      try {
        const lifecycleModule = await import(`file://${lifecyclePath}/index.js`);
        manifest.lifecycle = {
          install: lifecycleModule.install,
          activate: lifecycleModule.activate,
          deactivate: lifecycleModule.deactivate,
          uninstall: lifecycleModule.uninstall
        };
        logger.debug(`[ModuleLoader] Loaded lifecycle hooks for ${manifest.id}`);
      } catch (lifecycleError) {
        logger.debug(`[ModuleLoader] No lifecycle hooks for ${manifest.id}`);
      }

      // Register in registry
      this.registry.set(manifest.id, {
        module: manifest,
        status: 'loaded',
        loadedAt: new Date()
      });

      logger.info(`[ModuleLoader] ✅ Loaded module: ${manifest.id} v${manifest.version}`);

      return manifest;
    } catch (error) {
      logger.error(`[ModuleLoader] Failed to load module from ${manifestPath}:`, error);
      return null;
    }
  }

  /**
   * Load all modules from workspace
   */
  async loadAll(): Promise<void> {
    const manifestPaths = await this.scanWorkspace();

    logger.info(`[ModuleLoader] Loading ${manifestPaths.length} modules...`);

    const loadPromises = manifestPaths.map(path => this.loadModule(path));
    await Promise.all(loadPromises);

    logger.info(`[ModuleLoader] Loaded ${this.registry.size} modules`);
  }

  /**
   * Verify module dependencies are satisfied
   *
   * @param moduleId - Module ID to check
   * @returns true if all dependencies are loaded
   */
  private verifyDependencies(moduleId: string): boolean {
    const entry = this.registry.get(moduleId);
    if (!entry) return false;

    const { module } = entry;
    if (!module.dependsOn || module.dependsOn.length === 0) {
      return true;
    }

    for (const depId of module.dependsOn) {
      if (!this.registry.has(depId)) {
        logger.error(`[ModuleLoader] Missing dependency: ${moduleId} requires ${depId}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Activate a module (with dependency chain)
   *
   * @param moduleId - Module ID to activate
   */
  async activateModule(moduleId: string): Promise<void> {
    const entry = this.registry.get(moduleId);

    if (!entry) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    // Skip if already active
    if (entry.status === 'active') {
      logger.debug(`[ModuleLoader] Module ${moduleId} already active`);
      return;
    }

    // Verify dependencies
    if (!this.verifyDependencies(moduleId)) {
      throw new Error(`Module ${moduleId} has missing dependencies`);
    }

    // Activate dependencies first
    const { module } = entry;
    if (module.dependsOn) {
      for (const depId of module.dependsOn) {
        await this.activateModule(depId);
      }
    }

    // Run activate lifecycle hook
    if (module.lifecycle?.activate) {
      try {
        await module.lifecycle.activate();
        logger.debug(`[ModuleLoader] Ran activate hook for ${moduleId}`);
      } catch (activateError) {
        logger.error(`[ModuleLoader] Activate hook failed for ${moduleId}:`, activateError);
        entry.status = 'error';
        entry.error = String(activateError);
        throw activateError;
      }
    }

    // Mark as active
    entry.status = 'active';
    entry.activatedAt = new Date();
    module.isActive = true;

    logger.info(`[ModuleLoader] ✅ Activated module: ${moduleId}`);
  }

  /**
   * Deactivate a module
   *
   * @param moduleId - Module ID to deactivate
   */
  async deactivateModule(moduleId: string): Promise<void> {
    const entry = this.registry.get(moduleId);

    if (!entry) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    const { module } = entry;

    // Run deactivate lifecycle hook
    if (module.lifecycle?.deactivate) {
      try {
        await module.lifecycle.deactivate();
        logger.debug(`[ModuleLoader] Ran deactivate hook for ${moduleId}`);
      } catch (deactivateError) {
        logger.error(`[ModuleLoader] Deactivate hook failed for ${moduleId}:`, deactivateError);
      }
    }

    // Mark as inactive
    entry.status = 'inactive';
    module.isActive = false;

    logger.info(`[ModuleLoader] Deactivated module: ${moduleId}`);
  }

  /**
   * Get module router
   *
   * @param moduleId - Module ID
   * @returns Express Router or null
   */
  getModuleRouter(moduleId: string): Router | null {
    const entry = this.registry.get(moduleId);

    if (!entry || entry.status !== 'active') {
      return null;
    }

    const { module } = entry;

    if (module.backend?.routes) {
      try {
        return module.backend.routes();
      } catch (error) {
        logger.error(`[ModuleLoader] Failed to get router for ${moduleId}:`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * Get all entities from active modules
   *
   * @returns Array of TypeORM entity classes
   */
  getAllEntities(): any[] {
    const entities: any[] = [];

    for (const [moduleId, entry] of this.registry) {
      if (entry.status === 'active' && entry.module.backend?.entities) {
        entities.push(...entry.module.backend.entities);
        logger.debug(`[ModuleLoader] Collected ${entry.module.backend.entities.length} entities from ${moduleId}`);
      }
    }

    return entities;
  }

  /**
   * Get module details
   *
   * @param moduleId - Module ID
   * @returns Module registry entry or undefined
   */
  getModule(moduleId: string): ModuleRegistryEntry | undefined {
    return this.registry.get(moduleId);
  }

  /**
   * Get all active modules
   *
   * @returns Array of active module IDs
   */
  getActiveModules(): string[] {
    return Array.from(this.registry.entries())
      .filter(([_, entry]) => entry.status === 'active')
      .map(([id, _]) => id);
  }

  /**
   * Get all loaded modules
   *
   * @returns Array of all module IDs
   */
  getAllModules(): string[] {
    return Array.from(this.registry.keys());
  }
}

/**
 * Singleton Module Loader instance
 */
export const moduleLoader = new ModuleLoader();
