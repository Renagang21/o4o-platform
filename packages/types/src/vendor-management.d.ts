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
    supplyPrice: number;
    sellPrice: number;
    marginRate?: number;
    affiliateRate: number;
    adminFeeRate: number;
    approvalStatus: ProductApprovalStatus;
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    supplierStock?: number;
    lowStockThreshold?: number;
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
    supplierOrders?: SupplierOrderSplit[];
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
    totalProducts: number;
    pendingProducts: number;
    approvedProducts: number;
    rejectedProducts: number;
    soldoutProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    averageOrderValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    pendingSettlement: number;
    completedSettlement: number;
}
/**
 * 판매자 통계
 */
export interface VendorStats {
    vendorId: string;
    period: 'today' | 'week' | 'month' | 'year' | 'all';
    totalSales: number;
    totalRevenue: number;
    totalCommission: number;
    averageSaleValue: number;
    availableProducts: number;
    activeListings: number;
    uniqueCustomers: number;
    repeatCustomers: number;
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
    defaultMarginRate: number;
    minMarginRate: number;
    maxMarginRate: number;
    categoryMargins?: Record<string, number>;
    defaultAffiliateRate: number;
    defaultAdminFeeRate: number;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
}
/**
 * 정산 데이터
 */
export interface SettlementData {
    id: string;
    period: string;
    supplierId?: string;
    vendorId?: string;
    totalOrders: number;
    totalRevenue: number;
    supplierProfit?: number;
    vendorCommission?: number;
    affiliateCommission?: number;
    adminCommission?: number;
    status: 'pending' | 'processing' | 'completed' | 'hold';
    settledAt?: Date;
    settledBy?: string;
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
    businessAddress?: string;
    businessType?: string;
    mainProducts?: string[];
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
    status: 'pending' | 'active' | 'suspended';
    approvedAt?: string;
    approvedBy?: string;
    autoApproval?: boolean;
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
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    mainCategories?: string[];
    monthlyTarget?: number;
    affiliateCode?: string;
    affiliateRate?: number;
    status: 'pending' | 'active' | 'suspended';
    approvedAt?: string;
    approvedBy?: string;
    totalSales?: number;
    totalRevenue?: number;
    rating?: number;
}
//# sourceMappingURL=vendor-management.d.ts.map