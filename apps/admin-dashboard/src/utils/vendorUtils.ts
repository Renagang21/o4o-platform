/**
 * Vendor Management System Utilities
 * 가격 계산, 수익 분배, 권한 체크 등
 */

import type { 
  VendorPriceCalculation as PriceCalculation, 
  ProfitCalculationParams,
  SupplierOrderSplit,
  VendorOrderItem
} from '@o4o/types';

/**
 * 판매가격 자동 계산 (공급가 + 마진율)
 */
export function calculateSellPrice(
  supplyPrice: number,
  marginRate: number = 30
): number {
  const sellPrice = supplyPrice * (1 + marginRate / 100);
  return Math.ceil(sellPrice / 100) * 100; // 100원 단위 올림
}

/**
 * 마진율 계산 (판매가 - 공급가)
 */
export function calculateMarginRate(
  sellPrice: number,
  supplyPrice: number
): number {
  if (supplyPrice === 0) return 0;
  const marginRate = ((sellPrice - supplyPrice) / supplyPrice) * 100;
  return Math.round(marginRate * 100) / 100; // 소수점 2자리
}

/**
 * 수익 분배 계산
 */
export function calculateProfitDistribution(
  params: ProfitCalculationParams
): PriceCalculation {
  const {
    sellPrice,
    supplyPrice,
    affiliateRate,
    adminFeeRate,
    quantity = 1
  } = params;

  // 단위당 계산
  const marginAmount = sellPrice - supplyPrice;
  const marginRate = calculateMarginRate(sellPrice, supplyPrice);
  
  // 수수료 계산 (판매가 기준)
  const affiliateCommission = Math.floor(sellPrice * (affiliateRate / 100));
  const adminCommission = Math.floor(sellPrice * (adminFeeRate / 100));
  
  // 공급자 수익 = 판매가 - 공급가 - affiliate 수수료 - 관리자 수수료
  const supplierProfit = sellPrice - supplyPrice - affiliateCommission - adminCommission;

  return {
    supplyPrice: supplyPrice * quantity,
    sellPrice: sellPrice * quantity,
    marginAmount: marginAmount * quantity,
    marginRate,
    affiliateCommission: affiliateCommission * quantity,
    adminCommission: adminCommission * quantity,
    supplierProfit: supplierProfit * quantity
  };
}

/**
 * 최소 마진 검증 (손실 방지)
 */
export function validateMinimumMargin(
  sellPrice: number,
  supplyPrice: number,
  affiliateRate: number,
  adminFeeRate: number,
  minMarginRate: number = 10
): { isValid: boolean; message?: string } {
  const totalFeeRate = affiliateRate + adminFeeRate;
  const marginRate = calculateMarginRate(sellPrice, supplyPrice);
  
  // 수수료만으로도 마진을 초과하는 경우
  if (totalFeeRate >= marginRate) {
    return {
      isValid: false,
      message: `총 수수료율(${totalFeeRate}%)이 마진율(${marginRate}%)을 초과합니다.`
    };
  }
  
  // 최소 마진 미달
  if (marginRate < minMarginRate) {
    return {
      isValid: false,
      message: `마진율(${marginRate}%)이 최소 마진율(${minMarginRate}%)보다 낮습니다.`
    };
  }
  
  // 공급자 수익이 마이너스인 경우
  const calc = calculateProfitDistribution({
    sellPrice,
    supplyPrice,
    affiliateRate,
    adminFeeRate
  });
  
  if (calc.supplierProfit < 0) {
    return {
      isValid: false,
      message: '공급자 수익이 마이너스입니다. 가격을 재조정해주세요.'
    };
  }
  
  return { isValid: true };
}

/**
 * 주문을 공급자별로 분할
 */
export function splitOrderBySupplier(
  items: VendorOrderItem[]
): Map<string, SupplierOrderSplit> {
  const supplierMap = new Map<string, SupplierOrderSplit>();
  
  items.forEach(item => {
    const { supplierId } = item;
    
    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, {
        supplierId,
        supplierName: '', // 실제로는 조회 필요
        items: [],
        subtotal: 0,
        shippingFee: 0,
        total: 0,
        supplierProfit: 0,
        affiliateCommission: 0,
        adminCommission: 0
      });
    }
    
    const split = supplierMap.get(supplierId)!;
    split.items.push(item);
    split.subtotal += item.unitPrice * item.quantity;
    split.supplierProfit += item.supplierProfit || 0;
    split.affiliateCommission += item.affiliateCommission || 0;
    split.adminCommission += item.adminCommission || 0;
  });
  
  // 배송비는 별도 계산 필요 (공급자별 정책)
  supplierMap.forEach(split => {
    split.shippingFee = calculateShippingFee(split.subtotal);
    split.total = split.subtotal + split.shippingFee;
  });
  
  return supplierMap;
}

/**
 * 배송비 계산 (공급자별 정책 적용)
 */
export function calculateShippingFee(
  subtotal: number,
  freeShippingThreshold: number = 30000
): number {
  if (subtotal >= freeShippingThreshold) {
    return 0;
  }
  return 3000; // 기본 배송비
}

/**
 * 재고 상태 확인
 */
export function getStockStatus(
  currentStock: number,
  lowStockThreshold: number = 10
): {
  status: 'instock' | 'lowstock' | 'outofstock';
  color: string;
  message: string;
} {
  if (currentStock === 0) {
    return {
      status: 'outofstock',
      color: 'text-modern-error',
      message: '품절'
    };
  }
  
  if (currentStock <= lowStockThreshold) {
    return {
      status: 'lowstock',
      color: 'text-modern-warning',
      message: `재고 부족 (${currentStock}개)`
    };
  }
  
  return {
    status: 'instock',
    color: 'text-modern-success',
    message: `재고 있음 (${currentStock}개)`
  };
}

/**
 * Role별 데이터 필터링
 */
export function filterByRole<T extends { supplierId?: string; vendorId?: string }>(
  data: T[],
  userRole: string,
  userId: string
): T[] {
  switch (userRole) {
    case 'supplier':
      return data.filter(item => item.supplierId === userId);
    case 'vendor':
      return data.filter(item => item.vendorId === userId);
    case 'admin':
      return data; // 관리자는 모든 데이터 조회
    default:
      return [];
  }
}

/**
 * 제품 승인 상태별 필터링
 */
export function filterByApprovalStatus<T extends { approvalStatus: string }>(
  products: T[],
  status?: 'pending' | 'approved' | 'rejected'
): T[] {
  if (!status) return products;
  return products.filter(product => product.approvalStatus === status);
}

/**
 * 가격 포맷팅
 */
export function formatPrice(price: number): string {
  return `₩${price.toLocaleString('ko-KR')}`;
}

/**
 * 수수료율 포맷팅
 */
export function formatRate(rate: number): string {
  return `${rate}%`;
}

/**
 * 수익률 계산 및 포맷팅
 */
export function formatProfitRate(profit: number, revenue: number): string {
  if (revenue === 0) return '0%';
  const rate = (profit / revenue) * 100;
  return `${rate.toFixed(1)}%`;
}

/**
 * 날짜 기간 필터 생성
 */
export function getDateRangeFilter(period: 'today' | 'week' | 'month' | 'year') {
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return { startDate, endDate: now };
}

/**
 * 제품 상태에 따른 뱃지 스타일
 */
export function getProductStatusBadge(status: string): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
} {
  switch (status) {
    case 'pending':
      return { variant: 'secondary', label: '승인 대기' };
    case 'approved':
      return { variant: 'default', label: '승인됨' };
    case 'rejected':
      return { variant: 'destructive', label: '거절됨' };
    case 'active':
      return { variant: 'default', label: '판매중' };
    case 'inactive':
      return { variant: 'secondary', label: '판매중지' };
    case 'soldout':
      return { variant: 'outline', label: '품절' };
    default:
      return { variant: 'outline', label: status };
  }
}