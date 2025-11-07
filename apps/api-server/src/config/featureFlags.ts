/**
 * Feature Flags Configuration
 * Phase 8/9: Centralized feature flag management
 *
 * Controls:
 * - ENABLE_SUPPLIER_POLICY: Phase 8 supplier policy resolution
 * - ENABLE_SELLER_AUTHORIZATION: Phase 9 seller authorization workflow
 * - POLICY_RESOLUTION_TIMEOUT_MS: Policy resolution timeout
 *
 * Created: 2025-01-07
 */

export class FeatureFlags {
  /**
   * Phase 8: Enable supplier policy resolution
   * Default: false (disabled)
   */
  static isSupplierPolicyEnabled(): boolean {
    return process.env.ENABLE_SUPPLIER_POLICY === 'true';
  }

  /**
   * Phase 9: Enable seller authorization system
   * Default: false (disabled)
   */
  static isSellerAuthorizationEnabled(): boolean {
    return process.env.ENABLE_SELLER_AUTHORIZATION === 'true';
  }

  /**
   * Phase 8B (Future): Enable tier-based policies
   * Default: false (disabled)
   */
  static isTierPolicyEnabled(): boolean {
    return process.env.ENABLE_TIER_POLICY === 'true';
  }

  /**
   * Get policy resolution timeout in milliseconds
   * Default: 100ms
   */
  static getPolicyResolutionTimeout(): number {
    const timeout = parseInt(process.env.POLICY_RESOLUTION_TIMEOUT_MS || '100', 10);
    return isNaN(timeout) ? 100 : timeout;
  }

  /**
   * Get all feature flags status (for debugging/health checks)
   */
  static getAll(): Record<string, any> {
    return {
      supplierPolicy: this.isSupplierPolicyEnabled(),
      sellerAuthorization: this.isSellerAuthorizationEnabled(),
      tierPolicy: this.isTierPolicyEnabled(),
      policyResolutionTimeout: this.getPolicyResolutionTimeout()
    };
  }
}

export default FeatureFlags;
