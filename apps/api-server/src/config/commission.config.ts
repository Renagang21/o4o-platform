/**
 * Commission Configuration
 * Phase PD-2: Commission policy management
 *
 * This file defines global commission settings and fallback values
 * used when product-level or seller-level commission policies are not set.
 */

/**
 * Global default commission rate (20%)
 * Applied when:
 * 1. Product has no commission policy defined
 * 2. Seller has no defaultCommissionRate set
 */
export const GLOBAL_DEFAULT_COMMISSION_RATE = 0.2;

/**
 * Commission types supported in the system
 */
export enum CommissionType {
  /**
   * Rate-based commission: calculated as percentage of item price
   * Example: 20% of item price
   */
  RATE = 'rate',

  /**
   * Fixed commission: fixed amount per item
   * Example: 5000 KRW per item
   */
  FIXED = 'fixed'
}

/**
 * Commission policy interface
 * Used for product-level and seller-level commission settings
 */
export interface CommissionPolicy {
  type: CommissionType;
  value: number; // Percentage (0-1) for RATE, or fixed amount for FIXED
}

/**
 * Calculate commission amount based on policy
 *
 * @param policy - Commission policy (type + value)
 * @param itemPrice - Price of individual item
 * @param quantity - Quantity of items
 * @returns Calculated commission amount
 */
export function calculateCommission(
  policy: CommissionPolicy,
  itemPrice: number,
  quantity: number
): number {
  if (policy.type === CommissionType.RATE) {
    // Rate-based: (price × quantity) × rate
    return itemPrice * quantity * policy.value;
  } else {
    // Fixed: fixed amount × quantity
    return policy.value * quantity;
  }
}

/**
 * Get effective commission rate for display purposes
 * Returns the rate as a number between 0 and 1
 *
 * @param policy - Commission policy
 * @param itemPrice - Price of individual item (needed for fixed amount conversion)
 * @returns Commission rate (0-1) or null if cannot be determined
 */
export function getEffectiveCommissionRate(
  policy: CommissionPolicy,
  itemPrice: number
): number | null {
  if (policy.type === CommissionType.RATE) {
    return policy.value;
  } else if (policy.type === CommissionType.FIXED && itemPrice > 0) {
    // For fixed amount, calculate effective rate
    return policy.value / itemPrice;
  }
  return null;
}
