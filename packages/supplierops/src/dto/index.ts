/**
 * SupplierOps DTOs
 *
 * Phase 9-B: Core 정렬 업데이트
 * - Core에서 ProductType, OfferStatus, OrderRelayStatus, SettlementType import
 * - productType 기반 제어 로직 지원
 * - PHARMACEUTICAL 제한 지원
 */

// Re-export Core types for convenient access
export { ProductType, ProductStatus } from '@o4o/dropshipping-core';
export { OfferStatus } from '@o4o/dropshipping-core';
export { OrderRelayStatus } from '@o4o/dropshipping-core';
export { SettlementType, SettlementBatchStatus } from '@o4o/dropshipping-core';

import type { ProductType as CoreProductType } from '@o4o/dropshipping-core';
import type { SettlementType as CoreSettlementType } from '@o4o/dropshipping-core';
import type { OrderRelayStatus as CoreOrderStatus } from '@o4o/dropshipping-core';
import type { OfferStatus as CoreOfferStatus } from '@o4o/dropshipping-core';

/**
 * @deprecated Use SettlementType from Core instead
 */
export type SettlementContextType = 'seller' | 'supplier' | 'partner' | 'pharmacy' | 'platform-extension';

// ==========================================
// Dashboard DTOs
// ==========================================

export interface DashboardSummaryDto {
  supplierId: string;
  approvalStatus: string;
  totalProducts: number;
  activeOffers: number;
  pendingListingRequests: number;
  relayStats: {
    pending: number;
    relayed: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
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

// ==========================================
// Product DTOs
// ==========================================

export interface ProductMasterDto {
  id: string;
  name: string;
  sku: string;
  description: string;
  basePrice: number;
  category: string;
  brand?: string;
  productType: CoreProductType;
  attributes: Record<string, any>;
  status: string;
  isActive: boolean;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  basePrice: number;
  category: string;
  brand?: string;
  productType?: CoreProductType;
  attributes?: Record<string, any>;
}

export interface ProductFilterDto {
  productType?: CoreProductType;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ==========================================
// Offer DTOs
// ==========================================

export interface OfferDto {
  id: string;
  productId: string;
  productMasterId?: string;
  productName: string;
  productType: CoreProductType;
  supplierPrice: number;
  suggestedRetailPrice?: number;
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  status: CoreOfferStatus;
  isActive: boolean;
  activeSellers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOfferDto {
  productId: string;
  productMasterId?: string;
  supplierPrice: number;
  suggestedRetailPrice?: number;
  stockQuantity: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
}

export interface UpdateOfferDto {
  supplierPrice?: number;
  suggestedRetailPrice?: number;
  stockQuantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  status?: CoreOfferStatus;
}

export interface OfferFilterDto {
  productType?: CoreProductType;
  status?: CoreOfferStatus;
  page?: number;
  limit?: number;
}

// ==========================================
// Order DTOs
// ==========================================

export interface OrderRelayDto {
  id: string;
  orderId: string;
  orderNumber: string;
  listingId?: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  productType: CoreProductType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: CoreOrderStatus;
  shippingInfo?: Record<string, any>;
  trackingNumber?: string;
  relayedAt?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderFilterDto {
  productType?: CoreProductType;
  status?: CoreOrderStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface UpdateOrderTrackingDto {
  trackingNumber: string;
  shippingInfo?: Record<string, any>;
}

// ==========================================
// Settlement DTOs
// ==========================================

export interface SettlementSummaryDto {
  totalSettled: number;
  pendingSettlement: number;
  currentPeriodSales: number;
  currentPeriodCommission: number;
  deductionAmount: number;
  netAmount: number;
}

export interface SettlementBatchDto {
  id: string;
  batchNumber: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  commissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: string;
  settlementType: CoreSettlementType;
  transactionCount: number;
  closedAt?: Date;
  paidAt?: Date;
}

export interface CommissionTransactionDto {
  id: string;
  orderId: string;
  orderNumber: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  productType?: CoreProductType;
  createdAt: Date;
}

// ==========================================
// Profile DTOs
// ==========================================

export interface SupplierProfileDto {
  id: string;
  name: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  businessNumber: string;
  address: string;
  status: string;
  approvalStatus: string;
  metadata?: Record<string, any>;
}

export interface UpdateProfileDto {
  name?: string;
  companyName?: string;
  representativeName?: string;
  phone?: string;
  address?: string;
}

// ==========================================
// Validation Error DTOs
// ==========================================

export interface ValidationErrorDto {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResultDto {
  valid: boolean;
  errors: ValidationErrorDto[];
  warnings?: ValidationErrorDto[];
}
