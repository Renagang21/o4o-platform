/**
 * Remote Manifest Loader
 *
 * Fetches and validates app manifests from remote URLs
 * Part of AppStore Phase 4 - Remote App Distribution
 */

import axios from 'axios';
import { createHash } from 'crypto';
import type { AppManifest } from '@o4o/types';
import logger from '../utils/logger.js';

/**
 * Remote Manifest Loading Options
 */
export interface RemoteManifestOptions {
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Whether to verify hash if provided (default: true) */
  verifyHash?: boolean;
  /** Expected hash for verification (optional, can also come from catalog) */
  expectedHash?: string;
}

/**
 * Remote Manifest Load Result
 */
export interface RemoteManifestResult {
  /** Loaded manifest */
  manifest: AppManifest;
  /** Computed SHA-256 hash of the manifest JSON */
  hash: string;
  /** Whether hash verification passed (if expected hash was provided) */
  hashVerified: boolean;
  /** Source URL */
  sourceUrl: string;
}

/**
 * Hash Verification Error
 */
export class ManifestHashMismatchError extends Error {
  constructor(
    public appId: string,
    public expectedHash: string,
    public actualHash: string,
    public sourceUrl: string
  ) {
    super(
      `Hash mismatch for manifest from ${sourceUrl}. ` +
      `Expected: ${expectedHash.substring(0, 16)}..., ` +
      `Actual: ${actualHash.substring(0, 16)}...`
    );
    this.name = 'ManifestHashMismatchError';
  }
}

/**
 * Manifest Fetch Error
 */
export class ManifestFetchError extends Error {
  constructor(
    public sourceUrl: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(
      `Failed to fetch manifest from ${sourceUrl}` +
      (statusCode ? ` (HTTP ${statusCode})` : '') +
      (originalError ? `: ${originalError.message}` : '')
    );
    this.name = 'ManifestFetchError';
  }
}

/**
 * Manifest Validation Error
 */
export class ManifestValidationError extends Error {
  constructor(
    public sourceUrl: string,
    public validationErrors: string[]
  ) {
    super(
      `Invalid manifest from ${sourceUrl}: ${validationErrors.join(', ')}`
    );
    this.name = 'ManifestValidationError';
  }
}

/**
 * Remote Manifest Loader Service
 *
 * Responsible for:
 * - Fetching manifests from remote URLs
 * - Computing and verifying SHA-256 hashes
 * - Basic manifest validation
 */
export class RemoteManifestLoader {
  private readonly defaultTimeout = 10000; // 10 seconds

  /**
   * Load a manifest from a remote URL
   *
   * @param url - Remote manifest URL
   * @param options - Loading options
   * @returns Loaded manifest with metadata
   */
  async load(url: string, options: RemoteManifestOptions = {}): Promise<RemoteManifestResult> {
    const { timeout = this.defaultTimeout, verifyHash = true, expectedHash } = options;

    logger.info(`[RemoteManifestLoader] Fetching manifest from: ${url}`);

    try {
      // Fetch manifest
      const response = await axios.get(url, {
        timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'O4O-AppStore/1.0',
        },
        validateStatus: (status) => status === 200,
      });

      const manifestData = response.data;

      // Compute hash of the raw JSON
      const jsonString = JSON.stringify(manifestData);
      const hash = this.computeHash(jsonString);

      logger.info(`[RemoteManifestLoader] Manifest fetched, hash: ${hash.substring(0, 16)}...`);

      // Verify hash if expected hash is provided
      let hashVerified = false;
      if (verifyHash && expectedHash) {
        if (hash !== expectedHash) {
          throw new ManifestHashMismatchError(
            manifestData.appId || 'unknown',
            expectedHash,
            hash,
            url
          );
        }
        hashVerified = true;
        logger.info(`[RemoteManifestLoader] ✓ Hash verified for ${manifestData.appId}`);
      }

      // Validate manifest structure
      const validationErrors = this.validateManifest(manifestData);
      if (validationErrors.length > 0) {
        throw new ManifestValidationError(url, validationErrors);
      }

      // Mark manifest as remote
      const manifest: AppManifest = {
        ...manifestData,
        source: 'remote',
        url,
        hash,
      };

      logger.info(`[RemoteManifestLoader] ✓ Successfully loaded manifest for: ${manifest.appId}`);

      return {
        manifest,
        hash,
        hashVerified,
        sourceUrl: url,
      };
    } catch (error) {
      if (
        error instanceof ManifestHashMismatchError ||
        error instanceof ManifestValidationError
      ) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new ManifestFetchError(
          url,
          error.response?.status,
          error
        );
      }

      throw new ManifestFetchError(url, undefined, error as Error);
    }
  }

  /**
   * Compute SHA-256 hash of a string
   *
   * @param content - Content to hash
   * @returns Hex-encoded SHA-256 hash
   */
  computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Validate manifest structure
   * Returns array of validation error messages (empty if valid)
   *
   * @param manifest - Manifest object to validate
   * @returns Array of validation error messages
   */
  validateManifest(manifest: any): string[] {
    const errors: string[] = [];

    // Required fields
    if (!manifest.appId || typeof manifest.appId !== 'string') {
      errors.push('appId is required and must be a string');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('name is required and must be a string');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('version is required and must be a string');
    }

    // Validate version format (basic semver check)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('version must be in semver format (e.g., 1.0.0)');
    }

    // Validate type if present
    if (manifest.type && !['core', 'extension', 'standalone'].includes(manifest.type)) {
      errors.push('type must be one of: core, extension, standalone');
    }

    // Validate blockScripts if present
    if (manifest.blockScripts) {
      if (!Array.isArray(manifest.blockScripts)) {
        errors.push('blockScripts must be an array');
      } else {
        for (const script of manifest.blockScripts) {
          if (typeof script !== 'string') {
            errors.push('blockScripts must contain only strings');
            break;
          }
          // Validate URL format
          try {
            new URL(script);
          } catch {
            errors.push(`Invalid blockScript URL: ${script}`);
          }
        }
      }
    }

    // Validate lifecycle hooks if present
    if (manifest.lifecycle) {
      const validHooks = ['install', 'activate', 'deactivate', 'uninstall', 'update', 'rollback'];
      for (const hook of Object.keys(manifest.lifecycle)) {
        if (!validHooks.includes(hook)) {
          errors.push(`Invalid lifecycle hook: ${hook}`);
        }
        // For remote apps, lifecycle hooks should be URLs or module paths
        const hookValue = manifest.lifecycle[hook];
        if (typeof hookValue !== 'string') {
          errors.push(`Lifecycle hook ${hook} must be a string (URL or path)`);
        }
      }
    }

    return errors;
  }

  /**
   * Verify a manifest hash against expected value
   *
   * @param manifest - Manifest to verify
   * @param expectedHash - Expected SHA-256 hash
   * @returns true if hash matches
   */
  verifyManifestHash(manifest: AppManifest, expectedHash: string): boolean {
    const jsonString = JSON.stringify(manifest);
    const actualHash = this.computeHash(jsonString);
    return actualHash === expectedHash;
  }
}

// Export singleton instance
export const remoteManifestLoader = new RemoteManifestLoader();
