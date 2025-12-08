/**
 * Remote Module Loader
 *
 * Loads and executes lifecycle hooks from remote apps
 * Supports both URL-based and bundled module formats
 * Part of AppStore Phase 4 - Remote App Distribution
 */

import axios from 'axios';
import { createHash } from 'crypto';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { pathToFileURL } from 'url';
import { tmpdir } from 'os';
import type { AppManifest, InstallContext, ActivateContext, DeactivateContext, UninstallContext } from '@o4o/types';
import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Remote Module Options
 */
export interface RemoteModuleOptions {
  /** Timeout for fetching remote module (default: 30000ms) */
  timeout?: number;
  /** Expected hash for verification */
  expectedHash?: string;
  /** Whether to cache the module locally */
  cache?: boolean;
}

/**
 * Lifecycle Hook Context
 */
export type LifecycleContext = InstallContext | ActivateContext | DeactivateContext | UninstallContext | {
  appId: string;
  manifest: AppManifest;
  dataSource: typeof AppDataSource;
  logger: typeof logger;
  options?: Record<string, any>;
};

/**
 * Lifecycle Hook Function Type
 */
export type LifecycleHookFn = (context: LifecycleContext) => Promise<void>;

/**
 * Remote Module Load Error
 */
export class RemoteModuleError extends Error {
  constructor(
    public appId: string,
    public moduleUrl: string,
    public originalError?: Error
  ) {
    super(
      `Failed to load remote module for ${appId} from ${moduleUrl}` +
      (originalError ? `: ${originalError.message}` : '')
    );
    this.name = 'RemoteModuleError';
  }
}

/**
 * Remote Module Hash Mismatch Error
 */
export class RemoteModuleHashError extends Error {
  constructor(
    public appId: string,
    public moduleUrl: string,
    public expectedHash: string,
    public actualHash: string
  ) {
    super(
      `Hash mismatch for remote module ${appId} from ${moduleUrl}. ` +
      `Expected: ${expectedHash.substring(0, 16)}..., Actual: ${actualHash.substring(0, 16)}...`
    );
    this.name = 'RemoteModuleHashError';
  }
}

/**
 * Remote Module Loader Service
 *
 * Responsible for:
 * - Fetching lifecycle hook modules from remote URLs
 * - Verifying module integrity via SHA-256 hash
 * - Executing hooks in a safe context
 * - Caching modules for performance
 */
export class RemoteModuleLoader {
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly cacheDir: string;
  private readonly moduleCache = new Map<string, LifecycleHookFn>();

  constructor() {
    // Use temp directory for module cache
    this.cacheDir = join(tmpdir(), 'o4o-appstore-modules');
  }

  /**
   * Load a lifecycle hook from a remote URL
   *
   * @param appId - App identifier
   * @param hookUrl - URL to the hook module
   * @param hookType - Type of lifecycle hook
   * @param options - Loading options
   * @returns Lifecycle hook function
   */
  async loadHook(
    appId: string,
    hookUrl: string,
    hookType: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'update' | 'rollback',
    options: RemoteModuleOptions = {}
  ): Promise<LifecycleHookFn> {
    const { timeout = this.defaultTimeout, expectedHash, cache = true } = options;

    // Check in-memory cache first
    const cacheKey = `${appId}:${hookType}:${hookUrl}`;
    if (this.moduleCache.has(cacheKey)) {
      logger.info(`[RemoteModuleLoader] Using cached hook for ${appId}:${hookType}`);
      return this.moduleCache.get(cacheKey)!;
    }

    logger.info(`[RemoteModuleLoader] Loading remote hook: ${hookUrl}`);

    try {
      // Fetch module content
      const response = await axios.get(hookUrl, {
        timeout,
        responseType: 'text',
        headers: {
          'Accept': 'application/javascript, text/javascript',
          'User-Agent': 'O4O-AppStore/1.0',
        },
      });

      const moduleContent = response.data;

      // Compute hash
      const hash = this.computeHash(moduleContent);
      logger.info(`[RemoteModuleLoader] Module hash: ${hash.substring(0, 16)}...`);

      // Verify hash if expected
      if (expectedHash && hash !== expectedHash) {
        throw new RemoteModuleHashError(appId, hookUrl, expectedHash, hash);
      }

      // Save to temp file for dynamic import
      const modulePath = await this.saveModule(appId, hookType, moduleContent, hash);

      // Dynamic import
      const moduleUrl = pathToFileURL(modulePath).href;
      const module = await import(moduleUrl);

      // Get hook function
      const hookFn = module[hookType] || module.default;

      if (typeof hookFn !== 'function') {
        throw new Error(`Hook function "${hookType}" not found in remote module`);
      }

      // Cache the hook function
      if (cache) {
        this.moduleCache.set(cacheKey, hookFn);
      }

      logger.info(`[RemoteModuleLoader] ✓ Loaded hook ${hookType} for ${appId}`);

      return hookFn;
    } catch (error) {
      if (error instanceof RemoteModuleHashError) {
        throw error;
      }
      throw new RemoteModuleError(appId, hookUrl, error as Error);
    }
  }

  /**
   * Execute a remote lifecycle hook
   *
   * @param appId - App identifier
   * @param manifest - App manifest
   * @param hookUrl - URL to the hook module
   * @param hookType - Type of lifecycle hook
   * @param additionalOptions - Additional options to pass to hook
   */
  async executeHook(
    appId: string,
    manifest: AppManifest,
    hookUrl: string,
    hookType: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'update' | 'rollback',
    additionalOptions?: Record<string, any>
  ): Promise<void> {
    logger.info(`[RemoteModuleLoader] Executing ${hookType} hook for ${appId}`);

    // Load the hook
    const hookFn = await this.loadHook(appId, hookUrl, hookType, {
      expectedHash: manifest.hash,
    });

    // Prepare context
    const context: LifecycleContext = {
      appId,
      manifest,
      dataSource: AppDataSource,
      logger,
      options: additionalOptions,
    };

    // Execute hook
    try {
      await hookFn(context);
      logger.info(`[RemoteModuleLoader] ✓ Hook ${hookType} completed for ${appId}`);
    } catch (error) {
      logger.error(`[RemoteModuleLoader] Hook ${hookType} failed for ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Save module content to temp file for dynamic import
   *
   * @param appId - App identifier
   * @param hookType - Hook type
   * @param content - Module content
   * @param hash - Content hash
   * @returns Path to saved module
   */
  private async saveModule(
    appId: string,
    hookType: string,
    content: string,
    hash: string
  ): Promise<string> {
    // Ensure cache directory exists
    const appDir = join(this.cacheDir, appId);
    if (!existsSync(appDir)) {
      await mkdir(appDir, { recursive: true });
    }

    // Use hash in filename for cache invalidation
    const filename = `${hookType}-${hash.substring(0, 8)}.mjs`;
    const filepath = join(appDir, filename);

    // Check if already cached
    if (existsSync(filepath)) {
      logger.info(`[RemoteModuleLoader] Using cached module file: ${filename}`);
      return filepath;
    }

    // Write module file
    await writeFile(filepath, content, 'utf8');
    logger.info(`[RemoteModuleLoader] Saved module to: ${filepath}`);

    return filepath;
  }

  /**
   * Compute SHA-256 hash of content
   *
   * @param content - Content to hash
   * @returns Hex-encoded hash
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Clear module cache for an app
   *
   * @param appId - App identifier
   */
  clearCache(appId: string): void {
    // Clear in-memory cache entries for this app
    for (const key of this.moduleCache.keys()) {
      if (key.startsWith(`${appId}:`)) {
        this.moduleCache.delete(key);
      }
    }

    logger.info(`[RemoteModuleLoader] Cleared cache for ${appId}`);
  }

  /**
   * Clear all module caches
   */
  clearAllCaches(): void {
    this.moduleCache.clear();
    logger.info(`[RemoteModuleLoader] Cleared all caches`);
  }
}

// Export singleton instance
export const remoteModuleLoader = new RemoteModuleLoader();
