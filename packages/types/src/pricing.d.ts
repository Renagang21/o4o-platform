import type { RetailerGrade, PriceByRole } from './ecommerce.js';
import type { UserRole } from './auth.js';
export interface PricingConfig {
    currency: string;
    locale: string;
    showTax: boolean;
    taxRate: number;
    enableRoleBasedPricing: boolean;
    enableVolumeDiscounts: boolean;
    enableSeasonalPricing: boolean;
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
    userRoles: UserRole[];
    retailerGrades?: RetailerGrade[];
    productCategories?: string[];
    productIds?: string[];
    supplierIds?: string[];
    discountType: 'percentage' | 'fixed_amount' | 'fixed_price';
    discountValue: number;
    minQuantity?: number;
    maxQuantity?: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}
export interface PriceContext {
    userRole: UserRole;
    retailerGrade?: RetailerGrade;
    quantity: number;
    productId: string;
    categoryIds: string[];
    supplierId: string;
    couponCodes?: string[];
    membershipLevel?: string;
    orderTotal?: number;
    isFirstOrder?: boolean;
    country?: string;
    region?: string;
    purchaseDate?: string;
    seasonalPeriod?: string;
}
export interface CalculatedPrice {
    originalPrice: number;
    basePrice: number;
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
    subtotal: number;
    taxAmount: number;
    finalPrice: number;
    totalSavings: number;
    totalSavingsPercentage: number;
    currency: string;
    formattedPrice: string;
    formattedOriginalPrice: string;
    formattedSavings: string;
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
export interface PriceDisplayConfig {
    showCurrency: boolean;
    showCurrencySymbol: boolean;
    currencyPosition: 'before' | 'after';
    thousandsSeparator: string;
    decimalSeparator: string;
    decimalPlaces: number;
    showRoleLabel: boolean;
    showSavingsBadge: boolean;
    highlightBestPrice: boolean;
    showCompareAtPrice: boolean;
    showQuantityBreaks: boolean;
    showTotalSavings: boolean;
}
export interface PriceDisplay {
    price: string;
    originalPrice?: string;
    currency: string;
    currencySymbol: string;
    priceLabel?: string;
    savingsBadge?: string;
    roleLabel?: string;
    perUnitPrice?: string;
    quantityBreaks?: {
        quantity: number;
        price: string;
        savings: string;
    }[];
    className?: string;
    variant?: 'default' | 'sale' | 'member' | 'wholesale';
    size?: 'small' | 'medium' | 'large';
}
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
    applicableRoles: UserRole[];
    applicableGrades?: RetailerGrade[];
    isActive: boolean;
    priority: number;
    startDate?: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PriceValidationRule {
    id: string;
    name: string;
    type: 'min_price' | 'max_price' | 'margin_check' | 'competitor_check';
    minPrice?: number;
    maxPrice?: number;
    minMarginPercentage?: number;
    maxDiscountPercentage?: number;
    productCategories?: string[];
    productIds?: string[];
    supplierIds?: string[];
    userRoles?: UserRole[];
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
export type PriceCalculator = (basePrice: number, context: PriceContext, config?: PricingConfig) => CalculatedPrice;
export type PriceFormatter = (price: number, config: PriceDisplayConfig) => PriceDisplay;
export type PriceValidator = (price: number, productId: string, rules: PriceValidationRule[]) => PriceValidationResult;
export type RolePriceGetter = (pricing: PriceByRole, userRole: UserRole, retailerGrade?: RetailerGrade) => number;
export interface CurrencyInfo {
    code: string;
    symbol: string;
    name: string;
    symbolPosition: 'before' | 'after';
    decimalPlaces: number;
    thousandsSeparator: string;
    decimalSeparator: string;
    exchangeRate?: number;
    lastUpdated?: string;
}
export interface LocalizationConfig {
    locale: string;
    currency: CurrencyInfo;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    showTaxInclusive: boolean;
    taxLabel: string;
    shippingLabel: string;
    discountLabel: string;
    savingsLabel: string;
    numberFormat: {
        style: 'decimal' | 'currency' | 'percent';
        minimumFractionDigits: number;
        maximumFractionDigits: number;
        useGrouping: boolean;
    };
}
//# sourceMappingURL=pricing.d.ts.map