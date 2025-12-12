/**
 * SupplierOps DTOs
 *
 * Phase 2 업데이트:
 * - productType 추가
 * - contextType 추가
 * - stockQuantity 통일 (stock → stockQuantity)
 * - supplierPrice 통일 (price → supplierPrice)
 */

// Phase 2: 공통 타입 정의
export type ProductType = 'general' | 'cosmetics' | 'food' | 'pharmaceutical' | 'tourism' | 'partner' | string;
export type SettlementContextType = 'seller' | 'supplier' | 'partner' | 'pharmacy';

export interface DashboardSummaryDto {
  supplierId: string;
  approvalStatus: string;
  totalProducts: number;
  activeOffers: number;
  pendingListingRequests: number;
  relayStats: {
    pending: number;
    dispatched: number;
    fulfilled: number;
    failed: number;
  };
  monthSales: number;
  pendingSettlement: number;
  recentNotifications: NotificationDto[];
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
}

export interface ProductMasterDto {
  id: string;
  name: string;
  sku: string;
  description: string;
  basePrice: number;
  category: string;
  productType: ProductType; // Phase 2: 추가
  attributes: Record<string, any>;
  isActive: boolean;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  basePrice: number;
  category: string;
  productType?: ProductType; // Phase 2: 추가 (기본값 'general')
  attributes?: Record<string, any>;
}

export interface OfferDto {
  id: string;
  productId: string;
  productName: string;
  productType?: ProductType; // Phase 2: 추가
  supplierPrice: number; // Phase 2: price → supplierPrice
  stockQuantity: number; // Phase 2: stock → stockQuantity
  minOrderQuantity: number;
  isActive: boolean;
  activeSellers: number;
}

export interface CreateOfferDto {
  productId: string;
  supplierPrice: number; // Phase 2: price → supplierPrice
  stockQuantity: number; // Phase 2: stock → stockQuantity
  minOrderQuantity?: number;
}

export interface OrderRelayDto {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  productType?: ProductType; // Phase 2: 추가
  quantity: number;
  totalPrice: number;
  status: string;
  trackingNumber?: string;
  createdAt: Date;
}

export interface SettlementSummaryDto {
  totalSettled: number;
  pendingSettlement: number;
  currentPeriodSales: number;
  currentPeriodCommission: number;
}

export interface SettlementBatchDto {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  contextType?: SettlementContextType; // Phase 2: 추가
  transactionCount: number;
}

export interface SupplierProfileDto {
  id: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  businessNumber: string;
  address: string;
  approvalStatus: string;
}

export interface UpdateProfileDto {
  companyName?: string;
  representativeName?: string;
  phone?: string;
  address?: string;
}
