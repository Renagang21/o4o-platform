/**
 * App Security Validator
 *
 * Centralized security validation for remote app installation
 * Part of AppStore Phase 4 - Remote App Distribution
 */

import { createHash } from 'crypto';
import type { AppManifest } from '@o4o/types';
import logger from '../utils/logger.js';

/**
 * Security Validation Result
 */
export interface SecurityValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if any) */
  errors: SecurityError[];
  /** Validation warnings (non-blocking) */
  warnings: SecurityWarning[];
  /** Risk level assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Security Error
 */
export interface SecurityError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Security Warning
 */
export interface SecurityWarning {
  code: string;
  message: string;
  field?: string;
}

/**
 * Trusted Vendors Configuration
 */
export interface TrustedVendor {
  name: string;
  domains: string[];
  publicKey?: string;
}

/**
 * Security Validation Options
 */
export interface SecurityValidationOptions {
  /** Allow apps without hash verification */
  allowUnverifiedHash?: boolean;
  /** Allow apps from unknown vendors */
  allowUnknownVendor?: boolean;
  /** Skip lifecycle hook URL validation */
  skipHookValidation?: boolean;
}

/**
 * App Security Validator Service
 *
 * Responsible for:
 * - Manifest hash verification
 * - Vendor trust verification
 * - URL allowlist validation
 * - Lifecycle hook security checks
 * - Risk assessment
 */
export class AppSecurityValidator {
  /** Trusted vendors registry */
  private trustedVendors: TrustedVendor[] = [
    {
      name: 'O4O Official',
      domains: ['cdn.neture.co.kr', 'apps.neture.co.kr', 'registry.neture.co.kr'],
    },
    {
      name: 'O4O GitHub',
      domains: ['raw.githubusercontent.com/o4o-platform'],
    },
  ];

  /** Blocked domains (known malicious) */
  private blockedDomains: string[] = [];

  /** Allowed URL schemes for resources */
  private allowedSchemes = ['https'];

  /**
   * Validate a remote app manifest for security concerns
   *
   * @param manifest - App manifest to validate
   * @param expectedHash - Expected manifest hash (from catalog)
   * @param options - Validation options
   * @returns Validation result
   */
  validate(
    manifest: AppManifest,
    expectedHash?: string,
    options: SecurityValidationOptions = {}
  ): SecurityValidationResult {
    const errors: SecurityError[] = [];
    const warnings: SecurityWarning[] = [];

    logger.info(`[SecurityValidator] Validating manifest for: ${manifest.appId}`);

    // 1. Hash Verification
    if (expectedHash) {
      const actualHash = this.computeManifestHash(manifest);
      if (actualHash !== expectedHash) {
        errors.push({
          code: 'HASH_MISMATCH',
          message: `Manifest hash mismatch. Expected: ${expectedHash.substring(0, 16)}..., Actual: ${actualHash.substring(0, 16)}...`,
        });
      } else {
        logger.info(`[SecurityValidator] ✓ Hash verified for ${manifest.appId}`);
      }
    } else if (!options.allowUnverifiedHash) {
      warnings.push({
        code: 'NO_HASH',
        message: 'Manifest hash not provided. Cannot verify integrity.',
      });
    }

    // 2. Vendor Verification
    if (manifest.vendor) {
      const vendorTrusted = this.isVendorTrusted(manifest.vendor, manifest.url);
      if (!vendorTrusted && !options.allowUnknownVendor) {
        warnings.push({
          code: 'UNKNOWN_VENDOR',
          message: `Vendor "${manifest.vendor}" is not in trusted vendors list.`,
          field: 'vendor',
        });
      }
    } else {
      warnings.push({
        code: 'NO_VENDOR',
        message: 'No vendor information provided.',
        field: 'vendor',
      });
    }

    // 3. URL Validation
    if (manifest.url) {
      const urlValidation = this.validateUrl(manifest.url);
      if (!urlValidation.valid) {
        errors.push({
          code: 'INVALID_MANIFEST_URL',
          message: urlValidation.error!,
          field: 'url',
        });
      }
    }

    // 4. Block Scripts Validation
    if (manifest.blockScripts && manifest.blockScripts.length > 0) {
      for (const scriptUrl of manifest.blockScripts) {
        const urlValidation = this.validateUrl(scriptUrl);
        if (!urlValidation.valid) {
          errors.push({
            code: 'INVALID_SCRIPT_URL',
            message: `Block script URL invalid: ${urlValidation.error}`,
            field: 'blockScripts',
          });
        }
      }
    }

    // 5. Lifecycle Hook URL Validation
    if (!options.skipHookValidation && manifest.lifecycle) {
      for (const [hookType, hookValue] of Object.entries(manifest.lifecycle)) {
        if (typeof hookValue === 'string' && hookValue.startsWith('http')) {
          const urlValidation = this.validateUrl(hookValue);
          if (!urlValidation.valid) {
            errors.push({
              code: 'INVALID_HOOK_URL',
              message: `Lifecycle hook "${hookType}" has invalid URL: ${urlValidation.error}`,
              field: `lifecycle.${hookType}`,
            });
          }
        }
      }
    }

    // 6. Permission Security Check
    if (manifest.permissions && manifest.permissions.length > 0) {
      const dangerousPermissions = this.checkDangerousPermissions(manifest.permissions);
      if (dangerousPermissions.length > 0) {
        warnings.push({
          code: 'DANGEROUS_PERMISSIONS',
          message: `App requests dangerous permissions: ${dangerousPermissions.join(', ')}`,
          field: 'permissions',
        });
      }
    }

    // 7. Risk Level Assessment
    const riskLevel = this.assessRiskLevel(manifest, errors, warnings);

    const result: SecurityValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      riskLevel,
    };

    if (result.valid) {
      logger.info(`[SecurityValidator] ✓ Validation passed for ${manifest.appId} (risk: ${riskLevel})`);
    } else {
      logger.warn(`[SecurityValidator] ✗ Validation failed for ${manifest.appId}: ${errors.length} errors`);
    }

    return result;
  }

  /**
   * Compute SHA-256 hash of manifest (excluding hash field)
   *
   * @param manifest - Manifest to hash
   * @returns Hex-encoded SHA-256 hash
   */
  computeManifestHash(manifest: AppManifest): string {
    // Create copy without hash field to compute hash
    const { hash, ...manifestWithoutHash } = manifest;
    const jsonString = JSON.stringify(manifestWithoutHash, Object.keys(manifestWithoutHash).sort());
    return createHash('sha256').update(jsonString, 'utf8').digest('hex');
  }

  /**
   * Verify if hash matches manifest content
   *
   * @param manifest - Manifest to verify
   * @param expectedHash - Expected hash value
   * @returns true if hash matches
   */
  verifyHash(manifest: AppManifest, expectedHash: string): boolean {
    const actualHash = this.computeManifestHash(manifest);
    return actualHash === expectedHash;
  }

  /**
   * Check if vendor is in trusted list
   *
   * @param vendorName - Vendor name
   * @param manifestUrl - Manifest source URL
   * @returns true if vendor is trusted
   */
  private isVendorTrusted(vendorName: string, manifestUrl?: string): boolean {
    if (!manifestUrl) return false;

    try {
      const url = new URL(manifestUrl);
      const hostname = url.hostname;

      return this.trustedVendors.some((vendor) =>
        vendor.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate URL for security
   *
   * @param urlString - URL to validate
   * @returns Validation result
   */
  private validateUrl(urlString: string): { valid: boolean; error?: string } {
    try {
      const url = new URL(urlString);

      // Check scheme
      if (!this.allowedSchemes.includes(url.protocol.replace(':', ''))) {
        return {
          valid: false,
          error: `URL scheme "${url.protocol}" not allowed. Use HTTPS.`,
        };
      }

      // Check blocked domains
      if (this.blockedDomains.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
        return {
          valid: false,
          error: `Domain "${url.hostname}" is blocked.`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid URL format: ${urlString}`,
      };
    }
  }

  /**
   * Check for dangerous permissions
   *
   * @param permissions - List of requested permissions
   * @returns List of dangerous permissions
   */
  private checkDangerousPermissions(permissions: string[]): string[] {
    const dangerousPatterns = [
      'admin.*',
      'system.*',
      '*.delete',
      '*.purge',
      'user.manage',
      'permission.manage',
    ];

    return permissions.filter((perm) =>
      dangerousPatterns.some((pattern) => {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(perm);
      })
    );
  }

  /**
   * Assess overall risk level
   *
   * @param manifest - App manifest
   * @param errors - Validation errors
   * @param warnings - Validation warnings
   * @returns Risk level
   */
  private assessRiskLevel(
    manifest: AppManifest,
    errors: SecurityError[],
    warnings: SecurityWarning[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Has security errors
    if (errors.length > 0) {
      return 'critical';
    }

    // High: Unknown vendor + dangerous permissions
    const hasUnknownVendor = warnings.some((w) => w.code === 'UNKNOWN_VENDOR' || w.code === 'NO_VENDOR');
    const hasDangerousPerms = warnings.some((w) => w.code === 'DANGEROUS_PERMISSIONS');

    if (hasUnknownVendor && hasDangerousPerms) {
      return 'high';
    }

    // Medium: Unknown vendor OR no hash OR dangerous permissions
    if (hasUnknownVendor || warnings.some((w) => w.code === 'NO_HASH') || hasDangerousPerms) {
      return 'medium';
    }

    // Low: Passed all checks
    return 'low';
  }

  /**
   * Add a trusted vendor
   *
   * @param vendor - Vendor to add
   */
  addTrustedVendor(vendor: TrustedVendor): void {
    this.trustedVendors.push(vendor);
    logger.info(`[SecurityValidator] Added trusted vendor: ${vendor.name}`);
  }

  /**
   * Block a domain
   *
   * @param domain - Domain to block
   */
  blockDomain(domain: string): void {
    if (!this.blockedDomains.includes(domain)) {
      this.blockedDomains.push(domain);
      logger.info(`[SecurityValidator] Blocked domain: ${domain}`);
    }
  }
}

// Export singleton instance
export const appSecurityValidator = new AppSecurityValidator();
