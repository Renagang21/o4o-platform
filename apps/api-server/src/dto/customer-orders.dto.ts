/**
 * Customer Order DTOs
 * R-6-9: Customer order viewing functionality
 *
 * DTOs for customer-facing order list and detail views
 * Follows R-6-2 Dashboard API standardization patterns
 */

// ===========================
// List Item DTO
// ===========================

export interface CustomerOrderListItemDto {
  id: string;
  orderNumber: string;
  createdAt: string; // ISO 8601

  // Status
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

  // Financial
  totalAmount: number;
  currency: string;
  itemCount: number;

  // Payment
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';

  // Actions
  isCancellable: boolean;
  isReturnable: boolean;
}

// ===========================
// Detail DTO
// ===========================

export interface CustomerOrderDetailDto {
  id: string;
  orderNumber: string;
  createdAt: string; // ISO 8601

  // Status
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

  // Buyer info
  buyer: {
    id: string;
    name: string;
    email: string;
  };

  // Shipping address
  shippingAddress: {
    recipientName: string;
    phone: string;
    email?: string;
    zipCode: string;
    address: string;
    detailAddress: string;
    city: string;
    country: string;
    deliveryRequest?: string;
  };

  // Order items
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    productImage: string;
    productBrand?: string;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sellerId: string;
    sellerName: string;
  }>;

  // Financial summary
  summary: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };

  currency: string;

  // Payment
  paymentMethod?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentProvider?: string;
  paidAt?: string; // ISO 8601

  // Shipping
  shippingMethod?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;

  // Status timeline
  statusTimeline: Array<{
    status: string;
    timestamp: string; // ISO 8601
    label: string; // Human-readable label
  }>;

  // Notes
  customerNotes?: string;

  // Cancellation/Return
  cancellationReason?: string;
  returnReason?: string;
  refundAmount?: number;
  refundDate?: string; // ISO 8601

  // Actions
  isCancellable: boolean;
  isReturnable: boolean;
}

// ===========================
// Response Wrappers
// ===========================

export interface CustomerOrderListResponseDto {
  success: true;
  data: {
    orders: CustomerOrderListItemDto[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export interface CustomerOrderDetailResponseDto {
  success: true;
  data: CustomerOrderDetailDto;
}

// ===========================
// Query Parameters
// ===========================

export interface CustomerOrderListQuery {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'all';
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  sortBy?: 'createdAt' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
}

// ===========================
// R-7-1: Order Actions DTOs
// ===========================

export type CustomerOrderActionType = 'cancel' | 'return';

export type CustomerOrderActionErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'NOT_OWNED_BY_CUSTOMER'
  | 'INVALID_STATUS'
  | 'PAYMENT_COMPLETED_CANNOT_CANCEL'
  | 'ALREADY_CANCELLED'
  | 'ALREADY_RETURNED'
  | 'SERVER_ERROR';

export interface CustomerOrderActionResponseDto {
  orderId: string;
  action: CustomerOrderActionType;
  status: string; // Final status (e.g., 'cancelled', 'return_requested')
  message: string; // Customer-facing message
}

export interface CustomerOrderActionSuccessDto {
  success: true;
  data: CustomerOrderActionResponseDto;
}

export interface CustomerOrderActionErrorDto {
  success: false;
  error: {
    code: CustomerOrderActionErrorCode;
    message: string;
    details?: any;
  };
}
