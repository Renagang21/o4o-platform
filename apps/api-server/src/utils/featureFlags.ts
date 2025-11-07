/**
 * Feature Flags Utility
 *
 * Centralized feature flag management for gradual rollouts and A/B testing.
 *
 * Usage:
 * ```typescript
 * import { FeatureFlags } from '../utils/featureFlags.js';
 *
 * if (FeatureFlags.isSellerAuthorizationEnabled()) {
 *   // Phase 9 authorization logic
 * } else {
 *   // Bypass authorization (legacy behavior)
 * }
 * ```
 *
 * Created: 2025-01-07
 */

export class FeatureFlags {
  /**
   * Phase 9: Seller Authorization System
   *
   * Controls whether product-level authorization is enforced.
   *
   * Default: false (feature OFF)
   * Rollout Plan:
   * - Phase 0 (Shadow Mode): false (3-5 days)
   * - Phase 1 (10% Canary): true (7 days)
   * - Phase 2 (50% Rollout): true (7 days)
   * - Phase 3 (100% Rollout): true (permanent)
   *
   * @returns boolean - True if feature is enabled
   *
   * @example
   * ```typescript
   * if (!FeatureFlags.isSellerAuthorizationEnabled()) {
   *   return true; // Bypass authorization gates
   * }
   * ```
   */
  static isSellerAuthorizationEnabled(): boolean {
    return process.env.ENABLE_SELLER_AUTHORIZATION === 'true';
  }

  /**
   * Phase 9: Seller Product Limit
   *
   * Maximum number of products a seller can request authorization for.
   *
   * Default: 10 products
   * Future Enhancement: Tier-based limits (BRONZE: 10, SILVER: 20, GOLD: 50, PLATINUM: unlimited)
   *
   * @returns number - Product limit (default: 10)
   *
   * @example
   * ```typescript
   * const limit = FeatureFlags.getSellerProductLimit();
   * const currentCount = await countApprovedAuthorizations(sellerId);
   *
   * if (currentCount >= limit) {
   *   throw new Error('ERR_PRODUCT_LIMIT_REACHED');
   * }
   * ```
   */
  static getSellerProductLimit(): number {
    const limit = parseInt(process.env.SELLER_PRODUCT_LIMIT || '10', 10);

    // Validation: Limit must be between 1 and 1000
    if (limit < 1 || limit > 1000) {
      console.warn('[FeatureFlags] Invalid SELLER_PRODUCT_LIMIT, using default: 10', { limit });
      return 10;
    }

    return limit;
  }

  /**
   * Phase 9: Seller Reject Cooldown Period
   *
   * Number of days a seller must wait before re-requesting a product after rejection.
   *
   * Default: 30 days
   * Rationale: Balances seller opportunity with supplier protection
   *
   * @returns number - Cooldown period in days (default: 30)
   *
   * @example
   * ```typescript
   * const cooldownDays = FeatureFlags.getSellerRejectCooldownDays();
   * const cooldownUntil = new Date(rejectedAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
   *
   * if (new Date() < cooldownUntil) {
   *   throw new Error('ERR_COOLDOWN_ACTIVE');
   * }
   * ```
   */
  static getSellerRejectCooldownDays(): number {
    const days = parseInt(process.env.SELLER_REJECT_COOLDOWN_DAYS || '30', 10);

    // Validation: Cooldown must be between 1 and 365 days
    if (days < 1 || days > 365) {
      console.warn('[FeatureFlags] Invalid SELLER_REJECT_COOLDOWN_DAYS, using default: 30', { days });
      return 30;
    }

    return days;
  }

  /**
   * Phase 9: Rollout Percentage
   *
   * Percentage of products to enforce authorization for (gradual rollout).
   *
   * Default: 0 (no enforcement)
   * Phase 1: 10 (10% of products)
   * Phase 2: 50 (50% of products)
   * Phase 3: 100 (all products)
   *
   * @returns number - Rollout percentage (0-100, default: 0)
   *
   * @example
   * ```typescript
   * const rolloutPercentage = FeatureFlags.getPhase9RolloutPercentage();
   *
   * if (rolloutPercentage === 100) {
   *   // Full rollout
   * } else if (rolloutPercentage > 0) {
   *   // Partial rollout (use consistent hashing)
   *   const hash = crypto.createHash('md5').update(productId).digest('hex');
   *   const hashInt = parseInt(hash.substring(0, 8), 16);
   *   if ((hashInt % 100) < rolloutPercentage) {
   *     // This product is in rollout
   *   }
   * }
   * ```
   */
  static getPhase9RolloutPercentage(): number {
    const percentage = parseInt(process.env.PHASE9_ROLLOUT_PERCENTAGE || '0', 10);

    // Validation: Percentage must be between 0 and 100
    if (percentage < 0 || percentage > 100) {
      console.warn('[FeatureFlags] Invalid PHASE9_ROLLOUT_PERCENTAGE, using default: 0', { percentage });
      return 0;
    }

    return percentage;
  }

  /**
   * Phase 9: Canary Product List
   *
   * Comma-separated list of product UUIDs to enforce authorization for (canary testing).
   *
   * Default: empty (no canary)
   * Phase 1 Example: "prod-uuid-1,prod-uuid-2,prod-uuid-3"
   *
   * @returns string[] - Array of product UUIDs (empty if not set)
   *
   * @example
   * ```typescript
   * const canaryProducts = FeatureFlags.getPhase9CanaryProducts();
   *
   * if (canaryProducts.length > 0) {
   *   // Canary mode: Only enforce for these products
   *   if (!canaryProducts.includes(productId)) {
   *     return true; // Bypass authorization for non-canary products
   *   }
   * }
   * ```
   */
  static getPhase9CanaryProducts(): string[] {
    const canary = process.env.PHASE9_CANARY_PRODUCTS || '';

    if (!canary) {
      return [];
    }

    return canary
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  /**
   * Phase 9: Authorization Cache TTL
   *
   * Time-to-live for authorization gate cache (in seconds).
   *
   * Default: 60 seconds
   * Trade-off: Longer TTL = better performance, but stale data risk
   *
   * @returns number - Cache TTL in seconds (default: 60)
   *
   * @example
   * ```typescript
   * const ttl = FeatureFlags.getAuthorizationCacheTTL();
   * await redis.setex(`seller_auth:${sellerId}:${productId}`, ttl, 'approved');
   * ```
   */
  static getAuthorizationCacheTTL(): number {
    const ttl = parseInt(process.env.AUTHORIZATION_CACHE_TTL || '60', 10);

    // Validation: TTL must be between 10 and 3600 seconds (10s to 1 hour)
    if (ttl < 10 || ttl > 3600) {
      console.warn('[FeatureFlags] Invalid AUTHORIZATION_CACHE_TTL, using default: 60', { ttl });
      return 60;
    }

    return ttl;
  }

  /**
   * Get all Phase 9 feature flags (for debugging/monitoring)
   *
   * @returns object - All Phase 9 feature flags
   *
   * @example
   * ```typescript
   * app.get('/api/debug/feature-flags', (req, res) => {
   *   res.json(FeatureFlags.getPhase9Config());
   * });
   * ```
   */
  static getPhase9Config(): {
    enabled: boolean;
    productLimit: number;
    cooldownDays: number;
    rolloutPercentage: number;
    canaryProducts: string[];
    cacheTTL: number;
  } {
    return {
      enabled: this.isSellerAuthorizationEnabled(),
      productLimit: this.getSellerProductLimit(),
      cooldownDays: this.getSellerRejectCooldownDays(),
      rolloutPercentage: this.getPhase9RolloutPercentage(),
      canaryProducts: this.getPhase9CanaryProducts(),
      cacheTTL: this.getAuthorizationCacheTTL(),
    };
  }

  // ============================================================================
  // FUTURE PHASES (Placeholders for upcoming features)
  // ============================================================================

  /**
   * Phase 10: Dynamic Commission Rates (Placeholder)
   *
   * Controls whether dynamic commission rates based on seller tier are enabled.
   *
   * Default: false
   */
  static isDynamicCommissionEnabled(): boolean {
    return process.env.ENABLE_DYNAMIC_COMMISSION === 'true';
  }

  /**
   * Phase 11: Auto-Approval Rules (Placeholder)
   *
   * Controls whether auto-approval for trusted sellers is enabled.
   *
   * Default: false
   */
  static isAutoApprovalEnabled(): boolean {
    return process.env.ENABLE_AUTO_APPROVAL === 'true';
  }

  /**
   * Phase 12: Subscription-Based Tiers (Placeholder)
   *
   * Controls whether subscription-based seller tiers are enabled.
   *
   * Default: false
   */
  static isSubscriptionTiersEnabled(): boolean {
    return process.env.ENABLE_SUBSCRIPTION_TIERS === 'true';
  }
}

/**
 * Environment Variable Reference (for Phase 9)
 *
 * Add these to .env file:
 *
 * ```bash
 * # Phase 9: Seller Authorization System
 * ENABLE_SELLER_AUTHORIZATION=false              # Feature toggle (default: false)
 * SELLER_PRODUCT_LIMIT=10                        # Product limit per seller (default: 10)
 * SELLER_REJECT_COOLDOWN_DAYS=30                 # Rejection cooldown in days (default: 30)
 * PHASE9_ROLLOUT_PERCENTAGE=0                    # Rollout percentage 0-100 (default: 0)
 * PHASE9_CANARY_PRODUCTS=                        # Comma-separated product UUIDs (default: empty)
 * AUTHORIZATION_CACHE_TTL=60                     # Cache TTL in seconds (default: 60)
 * ```
 */

export default FeatureFlags;
