/**
 * Currency formatting utilities
 */

/**
 * Format number as Korean Won currency
 */
export function formatCurrency(amount: number | string, locale: string = 'ko-KR'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₩0';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numAmount);
}

/**
 * Format number as compact currency (e.g., ₩1.2만, ₩3.4천)
 */
export function formatCompactCurrency(amount: number | string, locale: string = 'ko-KR'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₩0';
  }
  
  if (numAmount >= 100000000) {
    return `₩${(numAmount / 100000000).toFixed(1)}억`;
  } else if (numAmount >= 10000) {
    return `₩${(numAmount / 10000).toFixed(1)}만`;
  } else if (numAmount >= 1000) {
    return `₩${(numAmount / 1000).toFixed(1)}천`;
  }
  
  return formatCurrency(numAmount, locale);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and non-numeric characters except decimal point
  const cleanString = currencyString.replace(/[₩,\s]/g, '');
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}