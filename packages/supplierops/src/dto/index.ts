/**
 * SupplierOps DTOs
 */

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
  attributes: Record<string, any>;
  isActive: boolean;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  basePrice: number;
  category: string;
  attributes?: Record<string, any>;
}

export interface OfferDto {
  id: string;
  productId: string;
  productName: string;
  price: number;
  stock: number;
  minOrderQuantity: number;
  isActive: boolean;
  activeSellers: number;
}

export interface CreateOfferDto {
  productId: string;
  price: number;
  stock: number;
  minOrderQuantity?: number;
}

export interface OrderRelayDto {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
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
