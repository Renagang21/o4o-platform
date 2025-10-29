// =============================================================================
// PRICING UTILITIES AND TYPES
// =============================================================================
// 가격 계산 및 역할별 가격 관리를 위한 유틸리티 타입들

import type { RetailerGrade, PriceByRole } from './ecommerce.js';
import type { UserRole } from './auth.js';

// =============================================================================
// PRICING CONFIGURATION
// =============================================================================

export interface PricingConfig {
  currency: string;
  locale: string;
  showTax: boolean;
  taxRate: number;
  
  // Discount configuration
  enableRoleBasedPricing: boolean;
  enableVolumeDiscounts: boolean;
  enableSeasonalPricing: boolean;
  
  // Display options
  showComparePrice: boolean;
  showSavingsAmount: boolean;
  showSavingsPercentage: boolean;
}

export interface VolumeDiscount {
  minQuantity: number;
  maxQuantity?: number;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  label?: string;
}

export interface PriceRule {
  id: string;
  name: string;
  description?: string;
  
  // Conditions
  userRoles: UserRole[];
  retailerGrades?: RetailerGrade[];
  productCategories?: string[];
  productIds?: string[];
  supplierIds?: string[];
  
  // Discount settings
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue: number;
  
  // Constraints
  minQuantity?: number;
  maxQuantity?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  
  // Schedule
  startDate?: string;
  endDate?: string;
  
  // Status
  isActive: boolean;
  priority: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// =============================================================================
// PRICE CALCULATION TYPES
// =============================================================================

export interface PriceContext {
  userRole: UserRole;
  retailerGrade?: RetailerGrade;
  quantity: number;
  productId: string;
  categoryIds: string[];
  supplierId: string;
  
  // Optional context
  couponCodes?: string[];
  membershipLevel?: string;
  orderTotal?: number;
  isFirstOrder?: boolean;
  
  // Geographic context
  country?: string;
  region?: string;
  
  // Temporal context
  purchaseDate?: string;
  seasonalPeriod?: string;
}

export interface CalculatedPrice {
  // Base pricing
  originalPrice: number;
  basePrice: number;
  
  // Discounts applied
  roleDiscount: {
    type: 'role_based';
    amount: number;
    percentage: number;
    label: string;
  } | null;
  
  volumeDiscount: {
    type: 'volume';
    amount: number;
    percentage: number;
    label: string;
    tier: string;
  } | null;
  
  ruleDiscounts: {
    ruleId: string;
    ruleName: string;
    type: 'percentage' | 'fixed_amount' | 'fixed_price';
    amount: number;
    percentage: number;
  }[];
  
  // Final pricing
  subtotal: number;
  taxAmount: number;
  finalPrice: number;
  
  // Savings summary
  totalSavings: number;
  totalSavingsPercentage: number;
  
  // Display info
  currency: string;
  formattedPrice: string;
  formattedOriginalPrice: string;
  formattedSavings: string;
  
  // Breakdown for transparency
  breakdown: PriceBreakdown;
}

export interface PriceBreakdown {
  basePrice: number;
  
  discounts: {
    roleBasedDiscount: number;
    volumeDiscount: number;
    couponDiscount: number;
    membershipDiscount: number;
    promotionalDiscount: number;
    other: number;
  };
  
  fees: {
    tax: number;
    shipping: number;
    handling: number;
    service: number;
    other: number;
  };
  
  total: number;
}

// =============================================================================
// PRICE DISPLAY TYPES
// =============================================================================

export interface PriceDisplayConfig {
  showCurrency: boolean;
  showCurrencySymbol: boolean;
  currencyPosition: 'before' | 'after';
  thousandsSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
  
  // Role-based display
  showRoleLabel: boolean;
  showSavingsBadge: boolean;
  highlightBestPrice: boolean;
  
  // Comparison
  showCompareAtPrice: boolean;
  showQuantityBreaks: boolean;
  showTotalSavings: boolean;
}

export interface PriceDisplay {
  // Main price
  price: string;
  originalPrice?: string;
  currency: string;
  currencySymbol: string;
  
  // Labels and badges
  priceLabel?: string;
  savingsBadge?: string;
  roleLabel?: string;
  
  // Additional info
  perUnitPrice?: string;
  quantityBreaks?: {
    quantity: number;
    price: string;
    savings: string;
  }[];
  
  // Styling hints
  className?: string;
  variant?: 'default' | 'sale' | 'member' | 'wholesale';
  size?: 'small' | 'medium' | 'large';
}

// =============================================================================
// BULK PRICING TYPES
// =============================================================================

export interface BulkPricingTier {
  id: string;
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPercentage: number;
  label: string;
  isActive: boolean;
}

export interface BulkPricingRule {
  id: string;
  name: string;
  productId: string;
  tiers: BulkPricingTier[];
  
  // Conditions
  applicableRoles: UserRole[];
  applicableGrades?: RetailerGrade[];
  
  // Settings
  isActive: boolean;
  priority: number;
  
  // Schedule
  startDate?: string;
  endDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PRICING VALIDATION TYPES
// =============================================================================

export interface PriceValidationRule {
  id: string;
  name: string;
  type: 'min_price' | 'max_price' | 'margin_check' | 'competitor_check';
  
  // Validation settings
  minPrice?: number;
  maxPrice?: number;
  minMarginPercentage?: number;
  maxDiscountPercentage?: number;
  
  // Scope
  productCategories?: string[];
  productIds?: string[];
  supplierIds?: string[];
  userRoles?: UserRole[];
  
  // Behavior
  action: 'warn' | 'block' | 'auto_adjust';
  message: string;
  
  isActive: boolean;
}

export interface PriceValidationResult {
  isValid: boolean;
  warnings: {
    ruleId: string;
    ruleName: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  
  errors: {
    ruleId: string;
    ruleName: string;
    message: string;
    suggestedPrice?: number;
  }[];
  
  adjustedPrice?: number;
  adjustmentReason?: string;
}

// =============================================================================
// UTILITY FUNCTIONS TYPES
// =============================================================================

export type PriceCalculator = (
  basePrice: number,
  context: PriceContext,
  config?: PricingConfig
) => CalculatedPrice;

export type PriceFormatter = (
  price: number,
  config: PriceDisplayConfig
) => PriceDisplay;

export type PriceValidator = (
  price: number,
  productId: string,
  rules: PriceValidationRule[]
) => PriceValidationResult;

export type RolePriceGetter = (
  pricing: PriceByRole,
  userRole: UserRole,
  retailerGrade?: RetailerGrade
) => number;

// =============================================================================
// CURRENCY AND LOCALIZATION
// =============================================================================

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  
  // Exchange rate info
  exchangeRate?: number;
  lastUpdated?: string;
}

export interface LocalizationConfig {
  locale: string;
  currency: CurrencyInfo;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  
  // Pricing localization
  showTaxInclusive: boolean;
  taxLabel: string;
  shippingLabel: string;
  discountLabel: string;
  savingsLabel: string;
  
  // Number formatting
  numberFormat: {
    style: 'decimal' | 'currency' | 'percent';
    minimumFractionDigits: number;
    maximumFractionDigits: number;
    useGrouping: boolean;
  };
}

// Types are already exported at their definition, no need to re-export