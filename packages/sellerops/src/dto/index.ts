/**
 * SellerOps DTOs
 */

// Dashboard
export interface DashboardSummaryDto {
  totalSales: number;
  pendingSettlement: number;
  activeListings: number;
  pendingOrders: number;
  approvedSuppliers: number;
  recentAlerts: AlertDto[];
}

export interface AlertDto {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  createdAt: Date;
}

// Profile
export interface SellerProfileDto {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  channelConfigs: Record<string, any>;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  channelConfigs?: Record<string, any>;
}

// Supplier
export interface SupplierListItemDto {
  id: string;
  name: string;
  contactEmail: string;
  status: 'pending' | 'active' | 'suspended';
  approvalStatus: 'none' | 'pending' | 'approved' | 'rejected';
  productCount: number;
}

export interface SupplierApprovalRequestDto {
  supplierId: string;
  message?: string;
}

// Listing
export interface CreateListingDto {
  offerId: string;
  sellingPrice: number;
  channel: string;
  isActive?: boolean;
}

export interface UpdateListingDto {
  sellingPrice?: number;
  isActive?: boolean;
}

export interface ListingDetailDto {
  id: string;
  offer: {
    id: string;
    productMaster: {
      id: string;
      name: string;
      sku: string;
    };
    supplyPrice: number;
    stock: number;
  };
  sellingPrice: number;
  margin: number;
  marginRate: number;
  channel: string;
  isActive: boolean;
  createdAt: Date;
}

// Order
export interface OrderListItemDto {
  id: string;
  listingId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: string;
  relayStatus: string;
  createdAt: Date;
}

export interface OrderDetailDto {
  id: string;
  listing: ListingDetailDto;
  quantity: number;
  totalPrice: number;
  status: string;
  relay: {
    id: string;
    status: string;
    supplierOrderId?: string;
    trackingNumber?: string;
    shippingCarrier?: string;
    dispatchedAt?: Date;
    deliveredAt?: Date;
  };
  createdAt: Date;
}

// Settlement
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
  status: 'open' | 'closed' | 'paid';
  transactionCount: number;
  closedAt?: Date;
  paidAt?: Date;
}

export interface CommissionDetailDto {
  id: string;
  orderId: string;
  productName: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  createdAt: Date;
}

// Notification
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

// Document
export interface DocumentDto {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: Date;
}
