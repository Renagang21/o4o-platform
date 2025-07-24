/**
 * Vendor Management System Types
 * 공급자-판매자-관리자 간의 마켓플레이스 생태계
 */

import { BaseEntity } from './common';
import { Product as BaseProduct, Order, OrderItem as BaseOrderItem } from './ecommerce';

/**
 * 제품 승인 상태
 */
export type ProductApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * 공급자 확장 제품 인터페이스
 */
export interface VendorProduct extends Omit<BaseProduct, 'status' | 'pricing' | 'inventory'> {
  
  // 가격 정보
  supplyPrice: number; // 공급가격
  sellPrice: number; // 판매가격
  marginRate?: number; // 마진율 (%)
  
  // 수수료 정보
  affiliateRate: number; // 제휴 수수료율 (%)
  adminFeeRate: number; // 관리자 수수료율 (%)
  
  // 승인 정보
  approvalStatus: ProductApprovalStatus;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // 재고 정보 (공급자별)
  supplierStock?: number;
  lowStockThreshold?: number;
  
  // 판매 정보
  totalSales?: number;
  totalRevenue?: number;
  
  status: 'draft' | 'active' | 'inactive' | 'soldout';
}

/**
 * 공급자별 주문 분할 정보
 */
export interface SupplierOrderSplit {
  supplierId: string;
  supplierName: string;
  items: VendorOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  supplierProfit: number;
  affiliateCommission: number;
  adminCommission: number;
}

/**
 * 확장된 주문 아이템
 */
export interface VendorOrderItem extends BaseOrderItem {
  supplierId: string;
  supplyPrice: number;
  supplierProfit: number;
  affiliateCommission?: number;
  adminCommission?: number;
}

/**
 * 확장된 주문 정보
 */
export interface VendorOrder extends Order {
  // 다중 공급자 정보
  supplierOrders?: SupplierOrderSplit[];
  
  // 수익 분배 정보
  totalSupplierProfit?: number;
  totalAffiliateCommission?: number;
  totalAdminCommission?: number;
}

/**
 * 가격 계산 결과
 */
export interface PriceCalculation {
  supplyPrice: number;
  sellPrice: number;
  marginAmount: number;
  marginRate: number;
  affiliateCommission: number;
  adminCommission: number;
  supplierProfit: number;
}

/**
 * 수익 계산 파라미터
 */
export interface ProfitCalculationParams {
  sellPrice: number;
  supplyPrice: number;
  affiliateRate: number;
  adminFeeRate: number;
  quantity?: number;
}

/**
 * 공급자 통계
 */
export interface SupplierStats {
  supplierId: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  
  // 제품 현황
  totalProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  soldoutProducts: number;
  
  // 매출 현황
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  
  // 재고 현황
  lowStockProducts: number;
  outOfStockProducts: number;
  
  // 정산 현황
  pendingSettlement: number;
  completedSettlement: number;
}

/**
 * 판매자 통계
 */
export interface VendorStats {
  vendorId: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  
  // 판매 현황
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  averageSaleValue: number;
  
  // 제품 현황
  availableProducts: number;
  activeListings: number;
  
  // 고객 현황
  uniqueCustomers: number;
  repeatCustomers: number;
  
  // 추천 성과
  affiliateClicks: number;
  affiliateConversions: number;
  affiliateRevenue: number;
}

/**
 * 제품 승인 요청
 */
export interface ProductApprovalRequest {
  productIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
  approvedBy: string;
}

/**
 * 제품 승인 응답
 */
export interface ProductApprovalResponse {
  success: boolean;
  approved: string[];
  rejected: string[];
  failed: string[];
  message?: string;
}

/**
 * 재고 업데이트 요청
 */
export interface StockUpdateRequest {
  productId: string;
  supplierId: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
}

/**
 * 가격 정책
 */
export interface PricingPolicy {
  id: string;
  name: string;
  description?: string;
  
  // 기본 마진율
  defaultMarginRate: number;
  minMarginRate: number;
  maxMarginRate: number;
  
  // 카테고리별 마진율
  categoryMargins?: Record<string, number>;
  
  // 수수료율
  defaultAffiliateRate: number;
  defaultAdminFeeRate: number;
  
  // 적용 기간
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

/**
 * 정산 데이터
 */
export interface SettlementData {
  id: string;
  period: string; // YYYY-MM
  supplierId?: string;
  vendorId?: string;
  
  // 거래 내역
  totalOrders: number;
  totalRevenue: number;
  
  // 수익 분배
  supplierProfit?: number;
  vendorCommission?: number;
  affiliateCommission?: number;
  adminCommission?: number;
  
  // 정산 상태
  status: 'pending' | 'processing' | 'completed' | 'hold';
  settledAt?: Date;
  settledBy?: string;
  
  // 지급 정보
  paymentMethod?: 'bank' | 'point';
  paymentReference?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 공급자 정보
 */
export interface SupplierInfo extends BaseEntity {
  userId: string;
  businessName: string;
  businessNumber?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  
  // 사업 정보
  businessAddress?: string;
  businessType?: string;
  mainProducts?: string[];
  
  // 정산 정보
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  
  // 상태
  status: 'pending' | 'active' | 'suspended';
  approvedAt?: string;
  approvedBy?: string;
  
  // 설정
  autoApproval?: boolean; // 제품 자동 승인 여부
  preferredMarginRate?: number;
  preferredAffiliateRate?: number;
}

/**
 * 판매자 정보
 */
export interface VendorInfo extends BaseEntity {
  userId: string;
  vendorName: string;
  vendorType: 'individual' | 'business';
  
  // 연락처 정보
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  
  // 판매 정보
  mainCategories?: string[];
  monthlyTarget?: number;
  
  // 추천 정보
  affiliateCode?: string;
  affiliateRate?: number;
  
  // 상태
  status: 'pending' | 'active' | 'suspended';
  approvedAt?: string;
  approvedBy?: string;
  
  // 실적
  totalSales?: number;
  totalRevenue?: number;
  rating?: number;
}