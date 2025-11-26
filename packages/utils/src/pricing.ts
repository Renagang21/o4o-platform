// =============================================================================
// PRICING UTILITY FUNCTIONS
// =============================================================================
// 가격 계산, 포맷팅, 검증을 위한 유틸리티 함수들

// Temporarily define types locally until @o4o/types build issue is resolved
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

// =============================================================================
// ROLE-BASED PRICE CALCULATION
// =============================================================================

/**
 * 사용자 역할과 등급에 따른 가격 반환
 */
export function getRoleBasedPrice(
  pricing: PriceByRole,
  userRole: UserRole,
  retailerGrade?: RetailerGrade
): number {
  switch (userRole) {
    case 'customer':
      return pricing.customer;
    
    case 'business':
      return pricing.business;
    
    case 'affiliate':
      return pricing.affiliate;
    
    case 'retailer':
      if (!retailerGrade) {
        return pricing.retailer.gold; // 기본값
      }
      return pricing.retailer[retailerGrade];
    
    case 'supplier':
    case 'admin':
      // 관리자는 가장 낮은 가격 확인 가능
      return Math.min(
        pricing.customer,
        pricing.business,
        pricing.affiliate,
        pricing.retailer.gold,
        pricing.retailer.premium,
        pricing.retailer.vip
      );
    
    default:
      return pricing.customer;
  }
}

/**
 * 역할별 모든 가격 정보 반환
 */
export function getAllRolePrices(pricing: PriceByRole): Array<{
  role: string;
  price: number;
  label: string;
}> {
  return [
    { role: 'customer', price: pricing.customer, label: '일반 고객' },
    { role: 'business', price: pricing.business, label: '비즈니스' },
    { role: 'affiliate', price: pricing.affiliate, label: '제휴사' },
    { role: 'retailer-gold', price: pricing.retailer.gold, label: '골드 리테일러' },
    { role: 'retailer-premium', price: pricing.retailer.premium, label: '프리미엄 리테일러' },
    { role: 'retailer-vip', price: pricing.retailer.vip, label: 'VIP 리테일러' },
  ];
}

/**
 * 할인율 계산
 */
export function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

/**
 * 절약 금액 계산
 */
export function calculateSavings(originalPrice: number, finalPrice: number): {
  amount: number;
  percentage: number;
} {
  const amount = Math.max(0, originalPrice - finalPrice);
  const percentage = originalPrice > 0 ? (amount / originalPrice) * 100 : 0;
  
  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
}

// =============================================================================
// VOLUME DISCOUNT CALCULATION
// =============================================================================

/**
 * 수량별 할인 계산
 */
export function calculateVolumeDiscount(
  basePrice: number,
  quantity: number,
  volumeDiscounts: Array<{
    minQuantity: number;
    maxQuantity?: number;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
  }>
): {
  discountAmount: number;
  discountPercentage: number;
  finalPrice: number;
  appliedTier?: any;
} {
  // 수량에 맞는 할인 티어 찾기
  const applicableTier = volumeDiscounts
    .filter(tier => 
      quantity >= tier.minQuantity && 
      (!tier.maxQuantity || quantity <= tier.maxQuantity)
    )
    .sort((a, b) => b.discountValue - a.discountValue)[0];

  if (!applicableTier) {
    return {
      discountAmount: 0,
      discountPercentage: 0,
      finalPrice: basePrice,
    };
  }

  let discountAmount = 0;
  
  if (applicableTier.discountType === 'percentage') {
    discountAmount = basePrice * (applicableTier.discountValue / 100);
  } else {
    discountAmount = applicableTier.discountValue;
  }

  const finalPrice = Math.max(0, basePrice - discountAmount);
  const discountPercentage = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    discountPercentage: Math.round(discountPercentage * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    appliedTier: applicableTier
  };
}

// =============================================================================
// COMPREHENSIVE PRICE CALCULATION
// =============================================================================

/**
 * 포괄적인 가격 계산 (역할, 수량, 할인 등 모든 요소 고려)
 */
export function calculatePrice(
  pricing: PriceByRole,
  context: PriceContext,
  options: {
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
  } = {}
): CalculatedPrice {
  // 1. 역할별 기본 가격 계산
  const basePrice = getRoleBasedPrice(pricing, context.userRole, context.retailerGrade);
  const originalPrice = pricing.customer; // 일반 고객 가격을 원가로 설정

  // 2. 역할별 할인 계산
  const roleSavings = calculateSavings(originalPrice, basePrice);
  const roleDiscount = roleSavings.amount > 0 ? {
    type: 'role_based' as const,
    amount: roleSavings.amount,
    percentage: roleSavings.percentage,
    label: getRoleLabel(context.userRole, context.retailerGrade)
  } : null;

  // 3. 수량 할인 계산
  let currentPrice = basePrice;
  const volumeDiscount = options.volumeDiscounts 
    ? calculateVolumeDiscount(basePrice, context.quantity, options.volumeDiscounts)
    : null;

  if (volumeDiscount && volumeDiscount.discountAmount > 0) {
    currentPrice = volumeDiscount.finalPrice;
  }

  // 4. 추가 할인 적용
  const ruleDiscounts: CalculatedPrice['ruleDiscounts'] = [];
  let additionalDiscountAmount = 0;

  if (options.additionalDiscounts) {
    for (const discount of options.additionalDiscounts) {
      const discountAmount = discount.percentage 
        ? currentPrice * (discount.percentage / 100)
        : discount.amount;
      
      additionalDiscountAmount += discountAmount;
      ruleDiscounts.push({
        ruleId: discount.type,
        ruleName: discount.type,
        type: discount.percentage ? 'percentage' : 'fixed_amount',
        amount: discountAmount,
        percentage: discount.percentage || (discountAmount / currentPrice) * 100
      });
    }
  }

  currentPrice = Math.max(0, currentPrice - additionalDiscountAmount);

  // 5. 세금 계산
  const taxRate = options.taxRate || 0;
  const subtotal = currentPrice * context.quantity;
  const taxAmount = subtotal * (taxRate / 100);
  const finalPrice = subtotal + taxAmount;

  // 6. 총 절약액 계산
  const originalTotal = originalPrice * context.quantity;
  const totalSavings = originalTotal - subtotal;
  const totalSavingsPercentage = originalTotal > 0 ? (totalSavings / originalTotal) * 100 : 0;

  return {
    originalPrice,
    basePrice,
    roleDiscount,
    volumeDiscount: volumeDiscount && volumeDiscount.discountAmount > 0 ? {
      type: 'volume',
      amount: volumeDiscount.discountAmount * context.quantity,
      percentage: volumeDiscount.discountPercentage,
      label: `${context.quantity}개 이상 할인`,
      tier: `${volumeDiscount.appliedTier?.minQuantity}+개`
    } : null,
    ruleDiscounts,
    subtotal,
    taxAmount,
    finalPrice,
    totalSavings,
    totalSavingsPercentage,
    currency: 'KRW',
    formattedPrice: formatCurrency(finalPrice, 'KRW'),
    formattedOriginalPrice: formatCurrency(originalTotal, 'KRW'),
    formattedSavings: formatCurrency(totalSavings, 'KRW'),
    breakdown: {
      basePrice,
      discounts: {
        roleBasedDiscount: roleDiscount?.amount || 0,
        volumeDiscount: volumeDiscount?.discountAmount || 0,
        couponDiscount: 0,
        membershipDiscount: 0,
        promotionalDiscount: additionalDiscountAmount,
        other: 0
      },
      fees: {
        tax: taxAmount,
        shipping: 0,
        handling: 0,
        service: 0,
        other: 0
      },
      total: finalPrice
    }
  };
}

// =============================================================================
// PRICE FORMATTING
// =============================================================================

/**
 * 통화 포맷팅
 */
export function formatCurrency(
  amount: number,
  currency: string = 'KRW',
  locale: string = 'ko-KR'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbol = getCurrencySymbol(currency);
    const formatted = new Intl.NumberFormat(locale).format(amount);
    return `${symbol}${formatted}`;
  }
}

/**
 * 숫자 포맷팅 (천 단위 구분자)
 */
export function formatNumber(
  number: number,
  locale: string = 'ko-KR',
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, options).format(number);
}

/**
 * 가격 표시용 포맷팅
 */
export function formatPriceDisplay(
  price: number,
  config: PriceDisplayConfig = getDefaultPriceDisplayConfig(),
  currency: string = 'KRW'
): PriceDisplay {
  const currencyInfo = getCurrencyInfo(currency);
  
  const formattedPrice = config.showCurrency 
    ? formatCurrency(price, currencyInfo.code)
    : formatNumber(price);

  return {
    price: formattedPrice,
    currency: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    className: 'price-display',
    variant: 'default',
    size: 'medium'
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 역할 라벨 반환
 */
export function getRoleLabel(role: UserRole, grade?: RetailerGrade): string {
  switch (role) {
    case 'customer':
      return '일반 고객';
    case 'business':
      return '비즈니스';
    case 'affiliate':
      return '제휴사';
    case 'retailer':
      switch (grade) {
        case 'gold':
          return '골드 리테일러';
        case 'premium':
          return '프리미엄 리테일러';
        case 'vip':
          return 'VIP 리테일러';
        default:
          return '리테일러';
      }
    case 'supplier':
      return '공급업체';
    case 'admin':
      return '관리자';
    default:
      return '사용자';
  }
}

/**
 * 통화 기호 반환
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'KRW': '₩',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'GBP': '£',
    'CNY': '¥'
  };
  return symbols[currency] || currency;
}

/**
 * 통화 정보 반환
 */
export function getCurrencyInfo(currency: string): CurrencyInfo {
  const currencies: Record<string, CurrencyInfo> = {
    'KRW': {
      code: 'KRW',
      symbol: '₩',
      name: '대한민국 원',
      symbolPosition: 'before',
      decimalPlaces: 0,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    },
    'USD': {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      symbolPosition: 'before',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    },
    'EUR': {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      symbolPosition: 'before',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    }
  };
  
  return currencies[currency] || currencies['KRW'];
}

/**
 * 기본 가격 표시 설정
 */
export function getDefaultPriceDisplayConfig(): PriceDisplayConfig {
  return {
    showCurrency: true,
    showCurrencySymbol: true,
    currencyPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    decimalPlaces: 0,
    showRoleLabel: true,
    showSavingsBadge: true,
    highlightBestPrice: true,
    showCompareAtPrice: true,
    showQuantityBreaks: true,
    showTotalSavings: true
  };
}

/**
 * 가격 비교 (더 좋은 가격인지 확인)
 */
export function isBetterPrice(currentPrice: number, comparePrice: number): boolean {
  return currentPrice < comparePrice;
}

/**
 * 가격 범위 내 확인
 */
export function isPriceInRange(price: number, minPrice?: number, maxPrice?: number): boolean {
  if (minPrice !== undefined && price < minPrice) return false;
  if (maxPrice !== undefined && price > maxPrice) return false;
  return true;
}

/**
 * 수량별 가격 계산 (단가)
 */
export function calculateUnitPrice(totalPrice: number, quantity: number): number {
  return quantity > 0 ? totalPrice / quantity : 0;
}

/**
 * 가격 검증
 */
export function validatePrice(price: number): PriceValidationResult {
  const warnings: PriceValidationResult['warnings'] = [];
  const errors: PriceValidationResult['errors'] = [];

  if (price < 0) {
    errors.push({
      ruleId: 'negative-price',
      ruleName: '음수 가격 검증',
      message: '가격은 0보다 작을 수 없습니다.'
    });
  }

  if (price > 10000000) {
    warnings.push({
      ruleId: 'high-price',
      ruleName: '고액 가격 경고',
      message: '가격이 매우 높습니다. 확인해주세요.',
      severity: 'medium'
    });
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * 여러 상품의 총액 계산
 */
export function calculateCartTotal(
  items: Array<{
    pricing: PriceByRole;
    quantity: number;
    context: PriceContext;
  }>,
  options: {
    taxRate?: number;
    shippingCost?: number;
    discountAmount?: number;
  } = {}
): {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  itemBreakdowns: CalculatedPrice[];
} {
  const itemBreakdowns = items.map(item => 
    calculatePrice(item.pricing, item.context, { taxRate: options.taxRate })
  );

  const subtotal = itemBreakdowns.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = subtotal * ((options.taxRate || 0) / 100);
  const shippingCost = options.shippingCost || 0;
  const discountAmount = options.discountAmount || 0;
  const total = subtotal + taxAmount + shippingCost - discountAmount;

  return {
    subtotal,
    taxAmount,
    shippingCost,
    discountAmount,
    total: Math.max(0, total),
    itemBreakdowns
  };
}

// Functions are already exported at their definition, no need to re-export