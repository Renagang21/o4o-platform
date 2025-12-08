/**
 * Remote Resources Loader
 *
 * Loads and manages remote app resources (block scripts, assets)
 * Part of AppStore Phase 4 - Remote App Distribution
 */

import axios from 'axios';
import { createHash } from 'crypto';
import { writeFile, mkdir, readFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import type { AppManifest } from '@o4o/types';
import logger from '../utils/logger.js';

/**
 * Resource Load Options
 */
export interface ResourceLoadOptions {
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Whether to cache resources locally */
  cache?: boolean;
  /** Expected hash for verification */
  expectedHash?: string;
}

/**
 * Loaded Resource Info
 */
export interface LoadedResource {
  /** Original URL */
  url: string;
  /** Local file path (if cached) */
  localPath?: string;
  /** Resource content (if not cached to file) */
  content?: string;
  /** SHA-256 hash of content */
  hash: string;
  /** Content type */
  contentType: string;
  /** Size in bytes */
  size: number;
}

/**
 * Resource Load Error
 */
export class ResourceLoadError extends Error {
  constructor(
    public url: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(
      `Failed to load resource from ${url}` +
      (statusCode ? ` (HTTP ${statusCode})` : '') +
      (originalError ? `: ${originalError.message}` : '')
    );
    this.name = 'ResourceLoadError';
  }
}

/**
 * Resource Hash Mismatch Error
 */
export class ResourceHashError extends Error {
  constructor(
    public url: string,
    public expectedHash: string,
    public actualHash: string
  ) {
    super(
      `Hash mismatch for resource ${url}. ` +
      `Expected: ${expectedHash.substring(0, 16)}..., Actual: ${actualHash.substring(0, 16)}...`
    );
    this.name = 'ResourceHashError';
  }
}

/**
 * Remote Resources Loader Service
 *
 * Responsible for:
 * - Loading block scripts from CDN
 * - Caching resources locally
 * - Verifying resource integrity
 * - Managing resource lifecycle
 */
export class RemoteResourcesLoader {
  private readonly defaultTimeout = 60000; // 60 seconds
  private readonly cacheDir: string;
  private readonly resourceCache = new Map<string, LoadedResource>();

  constructor(cacheDir?: string) {
    // Default cache directory
    this.cacheDir = cacheDir || join(process.cwd(), '.cache', 'app-resources');
  }

  /**
   * Load all block scripts for a remote app
   *
   * @param appId - App identifier
   * @param manifest - App manifest with blockScripts
   * @param options - Loading options
   * @returns Array of loaded resources
   */
  async loadBlockScripts(
    appId: string,
    manifest: AppManifest,
    options: ResourceLoadOptions = {}
  ): Promise<LoadedResource[]> {
    const blockScripts = manifest.blockScripts || [];
    if (blockScripts.length === 0) {
      logger.info(`[RemoteResourcesLoader] No block scripts for ${appId}`);
      return [];
    }

    logger.info(`[RemoteResourcesLoader] Loading ${blockScripts.length} block scripts for ${appId}`);

    const results: LoadedResource[] = [];
    for (const scriptUrl of blockScripts) {
      try {
        const resource = await this.loadResource(appId, scriptUrl, options);
        results.push(resource);
        logger.info(`[RemoteResourcesLoader] ✓ Loaded: ${scriptUrl}`);
      } catch (error) {
        logger.error(`[RemoteResourcesLoader] Failed to load: ${scriptUrl}`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Load a single resource from URL
   *
   * @param appId - App identifier
   * @param url - Resource URL
   * @param options - Loading options
   * @returns Loaded resource info
   */
  async loadResource(
    appId: string,
    url: string,
    options: ResourceLoadOptions = {}
  ): Promise<LoadedResource> {
    const { timeout = this.defaultTimeout, cache = true, expectedHash } = options;

    // Check in-memory cache
    const cacheKey = `${appId}:${url}`;
    if (this.resourceCache.has(cacheKey)) {
      logger.info(`[RemoteResourcesLoader] Using cached resource: ${url}`);
      return this.resourceCache.get(cacheKey)!;
    }

    // Check file cache
    const cachedPath = this.getCachePath(appId, url);
    if (cache && existsSync(cachedPath)) {
      try {
        const content = await readFile(cachedPath, 'utf8');
        const hash = this.computeHash(content);

        // Verify hash if expected
        if (expectedHash && hash !== expectedHash) {
          logger.warn(`[RemoteResourcesLoader] Cached file hash mismatch, re-downloading: ${url}`);
          await unlink(cachedPath);
        } else {
          const stats = await stat(cachedPath);
          const resource: LoadedResource = {
            url,
            localPath: cachedPath,
            hash,
            contentType: this.getContentType(url),
            size: stats.size,
          };
          this.resourceCache.set(cacheKey, resource);
          logger.info(`[RemoteResourcesLoader] Loaded from file cache: ${url}`);
          return resource;
        }
      } catch (error) {
        logger.warn(`[RemoteResourcesLoader] Failed to read cached file: ${cachedPath}`);
      }
    }

    // Fetch from URL
    logger.info(`[RemoteResourcesLoader] Fetching resource: ${url}`);

    try {
      const response = await axios.get(url, {
        timeout,
        responseType: 'text',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'O4O-AppStore/1.0',
        },
      });

      const content = response.data;
      const hash = this.computeHash(content);

      // Verify hash if expected
      if (expectedHash && hash !== expectedHash) {
        throw new ResourceHashError(url, expectedHash, hash);
      }

      // Cache to file if enabled
      let localPath: string | undefined;
      if (cache) {
        localPath = await this.cacheResource(appId, url, content);
      }

      const resource: LoadedResource = {
        url,
        localPath,
        content: cache ? undefined : content,
        hash,
        contentType: response.headers['content-type'] || this.getContentType(url),
        size: content.length,
      };

      this.resourceCache.set(cacheKey, resource);
      return resource;
    } catch (error) {
      if (error instanceof ResourceHashError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new ResourceLoadError(url, error.response?.status, error);
      }
      throw new ResourceLoadError(url, undefined, error as Error);
    }
  }

  /**
   * Cache a resource to local file system
   *
   * @param appId - App identifier
   * @param url - Original URL
   * @param content - Resource content
   * @returns Local file path
   */
  private async cacheResource(appId: string, url: string, content: string): Promise<string> {
    const cachePath = this.getCachePath(appId, url);
    const cacheDir = dirname(cachePath);

    // Ensure directory exists
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true });
    }

    // Write file
    await writeFile(cachePath, content, 'utf8');
    logger.info(`[RemoteResourcesLoader] Cached resource to: ${cachePath}`);

    return cachePath;
  }

  /**
   * Get cache file path for a resource
   *
   * @param appId - App identifier
   * @param url - Resource URL
   * @returns Local cache path
   */
  private getCachePath(appId: string, url: string): string {
    const urlHash = this.computeHash(url).substring(0, 12);
    const filename = basename(new URL(url).pathname) || 'resource';
    return join(this.cacheDir, appId, `${urlHash}-${filename}`);
  }

  /**
   * Get content type from URL
   *
   * @param url - Resource URL
   * @returns Content type string
   */
  private getContentType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'mjs':
        return 'application/javascript';
      case 'css':
        return 'text/css';
      case 'json':
        return 'application/json';
      case 'html':
        return 'text/html';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Compute SHA-256 hash
   *
   * @param content - Content to hash
   * @returns Hex-encoded hash
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Clear cache for an app
   *
   * @param appId - App identifier
   */
  clearAppCache(appId: string): void {
    // Clear in-memory cache
    for (const key of this.resourceCache.keys()) {
      if (key.startsWith(`${appId}:`)) {
        this.resourceCache.delete(key);
      }
    }

    logger.info(`[RemoteResourcesLoader] Cleared cache for ${appId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.resourceCache.clear();
    logger.info(`[RemoteResourcesLoader] Cleared all caches`);
  }

  /**
   * Get cached resource info
   *
   * @param appId - App identifier
   * @param url - Resource URL
   * @returns Cached resource or undefined
   */
  getCachedResource(appId: string, url: string): LoadedResource | undefined {
    return this.resourceCache.get(`${appId}:${url}`);
  }
}

// Export singleton instance
export const remoteResourcesLoader = new RemoteResourcesLoader();
