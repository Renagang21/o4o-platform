/**
 * Module Loader
 * Phase 5 — AppStore + Module Loader
 *
 * Dynamically discovers, loads, and activates app modules from the workspace
 */

import { Router } from 'express';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';
import { requireServiceGroup, requireTenantMatch, type ServiceGroup } from '../middleware/tenant-context.middleware.js';
import type {
  AppModule,
  ModuleLoaderConfig,
  ModuleRegistry,
  ModuleRegistryEntry
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Convert a file path to a proper file:// URL
 * Handles Windows paths correctly (C:\path -> file:///C:/path)
 */
function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

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
      // Import the manifest (use pathToFileURL for cross-platform compatibility)
      const manifestUrl = toFileUrl(manifestPath);
      logger.debug(`[ModuleLoader] Loading manifest from: ${manifestUrl}`);
      const manifestModule = await import(manifestUrl);
      const manifest: AppModule = manifestModule.default || manifestModule.manifest;

      if (!manifest || !manifest.id) {
        logger.warn(`[ModuleLoader] Invalid manifest at ${manifestPath}: missing id`);
        return null;
      }

      // Store package path (manifest is in src/, so go up one level to get package root)
      const manifestDir = path.dirname(manifestPath);
      const packagePath = manifestDir.endsWith('/src') || manifestDir.endsWith('\\src')
        ? path.dirname(manifestDir)
        : manifestDir;
      manifest.packagePath = packagePath;

      // Try to load backend exports
      const backendIndexPath = path.join(packagePath, 'dist', 'backend', 'index.js');
      try {
        const backendModule = await import(toFileUrl(backendIndexPath));
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
      const lifecyclePath = path.join(packagePath, 'dist', 'lifecycle', 'index.js');
      const lifecycleUrl = toFileUrl(lifecyclePath);
      logger.info(`[ModuleLoader] Attempting to load lifecycle from: ${lifecycleUrl}`);
      try {
        const lifecycleModule = await import(lifecycleUrl);
        logger.info(`[ModuleLoader] Lifecycle module keys: ${Object.keys(lifecycleModule).join(', ')}`);
        manifest.lifecycle = {
          install: lifecycleModule.install,
          activate: lifecycleModule.activate,
          deactivate: lifecycleModule.deactivate,
          uninstall: lifecycleModule.uninstall
        };
        logger.debug(`[ModuleLoader] Loaded lifecycle hooks for ${manifest.id}`);
      } catch (lifecycleError) {
        logger.warn(`[ModuleLoader] Failed to load lifecycle hooks for ${manifest.id}:`, lifecycleError);
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
   * Install a module (run install lifecycle hook)
   *
   * WO-APPSTORE-CONTEXT-FIX: install hook 실행 메서드 추가
   * - 멱등성 전제: 이미 설치된 테이블에 대해 실패하지 않아야 함
   *
   * @param moduleId - Module ID to install
   * @param dataSource - TypeORM DataSource for lifecycle hooks
   */
  async installModule(moduleId: string, dataSource?: any): Promise<void> {
    const entry = this.registry.get(moduleId);

    if (!entry) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    const { module } = entry;

    // Run install lifecycle hook
    if (module.lifecycle?.install) {
      try {
        // WO-APPSTORE-CONTEXT-FIX: Context에 dataSource, manifest, logger 포함
        const installContext = {
          appId: moduleId,
          manifest: module,
          dataSource,
          logger,
        };
        await module.lifecycle.install(installContext);
        logger.info(`[ModuleLoader] ✅ Ran install hook for ${moduleId}`);
      } catch (installError) {
        // WO-APPSTORE-CONTEXT-FIX: 실패 로그 강화
        logger.error(`[ModuleLoader] Install hook FAILED for ${moduleId}:`, {
          stage: 'install',
          appId: moduleId,
          error: installError instanceof Error ? installError.message : String(installError),
          hasDataSource: !!dataSource,
        });
        entry.status = 'error';
        entry.error = String(installError);
        throw installError;
      }
    } else {
      logger.debug(`[ModuleLoader] No install hook for ${moduleId}, skipping`);
    }
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
   * WO-APPSTORE-CONTEXT-FIX: dataSource 선택적 파라미터 추가
   *
   * @param moduleId - Module ID to activate
   * @param dataSource - Optional TypeORM DataSource for lifecycle hooks
   */
  async activateModule(moduleId: string, dataSource?: any): Promise<void> {
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
        await this.activateModule(depId, dataSource);
      }
    }

    // Run activate lifecycle hook
    if (module.lifecycle?.activate) {
      try {
        // WO-APPSTORE-CONTEXT-FIX: Context에 dataSource, logger 포함
        const activateContext = {
          appId: moduleId,
          manifest: module,
          dataSource,
          logger,
        };
        await module.lifecycle.activate(activateContext);
        logger.debug(`[ModuleLoader] Ran activate hook for ${moduleId}`);
      } catch (activateError) {
        // WO-APPSTORE-CONTEXT-FIX: 실패 로그 강화
        logger.error(`[ModuleLoader] Activate hook FAILED for ${moduleId}:`, {
          stage: 'activate',
          appId: moduleId,
          error: activateError instanceof Error ? activateError.message : String(activateError),
          hasDataSource: !!dataSource,
        });
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
   * WO-APPSTORE-CONTEXT-FIX: dataSource 선택적 파라미터 추가
   *
   * @param moduleId - Module ID to deactivate
   * @param dataSource - Optional TypeORM DataSource for lifecycle hooks
   */
  async deactivateModule(moduleId: string, dataSource?: any): Promise<void> {
    const entry = this.registry.get(moduleId);

    if (!entry) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    const { module } = entry;

    // Run deactivate lifecycle hook
    if (module.lifecycle?.deactivate) {
      try {
        // WO-APPSTORE-CONTEXT-FIX: Context에 dataSource, manifest, logger 포함
        const deactivateContext = {
          appId: moduleId,
          manifest: module,
          dataSource,
          logger,
        };
        await module.lifecycle.deactivate(deactivateContext);
        logger.debug(`[ModuleLoader] Ran deactivate hook for ${moduleId}`);
      } catch (deactivateError) {
        // WO-APPSTORE-CONTEXT-FIX: 실패 로그 강화
        logger.error(`[ModuleLoader] Deactivate hook FAILED for ${moduleId}:`, {
          stage: 'deactivate',
          appId: moduleId,
          error: deactivateError instanceof Error ? deactivateError.message : String(deactivateError),
          hasDataSource: !!dataSource,
        });
      }
    }

    // Mark as inactive
    entry.status = 'inactive';
    module.isActive = false;

    logger.info(`[ModuleLoader] Deactivated module: ${moduleId}`);
  }

  /**
   * Get module router with optional service group protection
   *
   * @param moduleId - Module ID
   * @param dataSource - Optional TypeORM DataSource for route factories
   * @param options - Additional options for route wrapping
   * @returns Express Router or null
   */
  getModuleRouter(
    moduleId: string,
    dataSource?: any,
    options?: {
      applyServiceGroupProtection?: boolean;
      applyTenantProtection?: boolean;
    }
  ): Router | null {
    const entry = this.registry.get(moduleId);

    if (!entry || entry.status !== 'active') {
      return null;
    }

    const { module } = entry;

    if (module.backend?.routes) {
      try {
        // Support both patterns:
        // 1. routes() => Router (simple function)
        // 2. routes(dataSource) => Router (factory pattern)
        let router: Router;
        if (dataSource) {
          router = module.backend.routes(dataSource);
        } else {
          router = module.backend.routes();
        }

        // Apply service group protection if configured (Phase 6)
        if (options?.applyServiceGroupProtection && module.serviceGroup) {
          const wrapperRouter = Router();
          wrapperRouter.use(requireServiceGroup(module.serviceGroup, 'global'));
          wrapperRouter.use(router);
          logger.debug(`[ModuleLoader] Applied service group protection (${module.serviceGroup}) to ${moduleId}`);
          return wrapperRouter;
        }

        // Apply tenant protection if configured (Phase 6)
        if (options?.applyTenantProtection && module.allowedTenants && module.allowedTenants.length > 0) {
          const wrapperRouter = Router();
          wrapperRouter.use(requireTenantMatch(...module.allowedTenants));
          wrapperRouter.use(router);
          logger.debug(`[ModuleLoader] Applied tenant protection to ${moduleId}`);
          return wrapperRouter;
        }

        return router;
      } catch (error) {
        logger.error(`[ModuleLoader] Failed to get router for ${moduleId}:`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * Get module router with service group protection
   * Convenience method for applying service group-based route protection
   *
   * @param moduleId - Module ID
   * @param serviceGroup - Service group to restrict to
   * @param dataSource - Optional TypeORM DataSource for route factories
   * @returns Express Router with protection middleware or null
   */
  getProtectedModuleRouter(
    moduleId: string,
    serviceGroup: ServiceGroup,
    dataSource?: any
  ): Router | null {
    const entry = this.registry.get(moduleId);

    if (!entry || entry.status !== 'active') {
      return null;
    }

    const { module } = entry;

    if (module.backend?.routes) {
      try {
        const baseRouter = dataSource
          ? module.backend.routes(dataSource)
          : module.backend.routes();

        // Wrap with service group protection
        const protectedRouter = Router();
        protectedRouter.use(requireServiceGroup(serviceGroup, 'global'));
        protectedRouter.use(baseRouter);

        logger.debug(`[ModuleLoader] Created protected router for ${moduleId} (service: ${serviceGroup})`);
        return protectedRouter;
      } catch (error) {
        logger.error(`[ModuleLoader] Failed to create protected router for ${moduleId}:`, error);
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
