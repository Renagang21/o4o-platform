export type UserRole = 'customer' | 'business' | 'affiliate' | 'retailer' | 'supplier' | 'admin';
export type RetailerGrade = 'gold' | 'premium' | 'vip';
export interface PriceByRole {
    customer: number;
    business: number;
    affiliate: number;
    retailer: {
        gold: number;
        premium: number;
        vip: number;
    };
}
export interface PriceContext {
    userRole: UserRole;
    retailerGrade?: RetailerGrade;
    quantity: number;
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
    ruleDiscounts: Array<{
        ruleId: string;
        ruleName: string;
        type: 'percentage' | 'fixed_amount';
        amount: number;
        percentage: number;
    }>;
    subtotal: number;
    taxAmount: number;
    finalPrice: number;
    totalSavings: number;
    totalSavingsPercentage: number;
    currency: string;
    formattedPrice: string;
    formattedOriginalPrice: string;
    formattedSavings: string;
    breakdown: {
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
    };
}
export interface PriceDisplay {
    price: string;
    currency: string;
    currencySymbol: string;
    className: string;
    variant: string;
    size: string;
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
export interface PriceValidationResult {
    isValid: boolean;
    warnings: Array<{
        ruleId: string;
        ruleName: string;
        message: string;
        severity?: string;
    }>;
    errors: Array<{
        ruleId: string;
        ruleName: string;
        message: string;
    }>;
}
export interface CurrencyInfo {
    code: string;
    symbol: string;
    name: string;
    symbolPosition: 'before' | 'after';
    decimalPlaces: number;
    thousandsSeparator: string;
    decimalSeparator: string;
}
/**
 * 사용자 역할과 등급에 따른 가격 반환
 */
export declare function getRoleBasedPrice(pricing: PriceByRole, userRole: UserRole, retailerGrade?: RetailerGrade): number;
/**
 * 역할별 모든 가격 정보 반환
 */
export declare function getAllRolePrices(pricing: PriceByRole): Array<{
    role: string;
    price: number;
    label: string;
}>;
/**
 * 할인율 계산
 */
export declare function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number;
/**
 * 절약 금액 계산
 */
export declare function calculateSavings(originalPrice: number, finalPrice: number): {
    amount: number;
    percentage: number;
};
/**
 * 수량별 할인 계산
 */
export declare function calculateVolumeDiscount(basePrice: number, quantity: number, volumeDiscounts: Array<{
    minQuantity: number;
    maxQuantity?: number;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
}>): {
    discountAmount: number;
    discountPercentage: number;
    finalPrice: number;
    appliedTier?: any;
};
/**
 * 포괄적인 가격 계산 (역할, 수량, 할인 등 모든 요소 고려)
 */
export declare function calculatePrice(pricing: PriceByRole, context: PriceContext, options?: {
    volumeDiscounts?: Array<{
        minQuantity: number;
        maxQuantity?: number;
        discountType: 'percentage' | 'fixed_amount';
        discountValue: number;
    }>;
    taxRate?: number;
    additionalDiscounts?: Array<{
        type: string;
        amount: number;
        percentage?: number;
    }>;
}): CalculatedPrice;
/**
 * 통화 포맷팅
 */
export declare function formatCurrency(amount: number, currency?: string, locale?: string): string;
/**
 * 숫자 포맷팅 (천 단위 구분자)
 */
export declare function formatNumber(number: number, locale?: string, options?: Intl.NumberFormatOptions): string;
/**
 * 가격 표시용 포맷팅
 */
export declare function formatPriceDisplay(price: number, config?: PriceDisplayConfig, currency?: string): PriceDisplay;
/**
 * 역할 라벨 반환
 */
export declare function getRoleLabel(role: UserRole, grade?: RetailerGrade): string;
/**
 * 통화 기호 반환
 */
export declare function getCurrencySymbol(currency: string): string;
/**
 * 통화 정보 반환
 */
export declare function getCurrencyInfo(currency: string): CurrencyInfo;
/**
 * 기본 가격 표시 설정
 */
export declare function getDefaultPriceDisplayConfig(): PriceDisplayConfig;
/**
 * 가격 비교 (더 좋은 가격인지 확인)
 */
export declare function isBetterPrice(currentPrice: number, comparePrice: number): boolean;
/**
 * 가격 범위 내 확인
 */
export declare function isPriceInRange(price: number, minPrice?: number, maxPrice?: number): boolean;
/**
 * 수량별 가격 계산 (단가)
 */
export declare function calculateUnitPrice(totalPrice: number, quantity: number): number;
/**
 * 가격 검증
 */
export declare function validatePrice(price: number): PriceValidationResult;
/**
 * 여러 상품의 총액 계산
 */
export declare function calculateCartTotal(items: Array<{
    pricing: PriceByRole;
    quantity: number;
    context: PriceContext;
}>, options?: {
    taxRate?: number;
    shippingCost?: number;
    discountAmount?: number;
}): {
    subtotal: number;
    taxAmount: number;
    shippingCost: number;
    discountAmount: number;
    total: number;
    itemBreakdowns: CalculatedPrice[];
};
//# sourceMappingURL=pricing.d.ts.map