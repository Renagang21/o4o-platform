import type { ServiceSummary } from './product.types';

export interface OrderSummaryResponse {
  services: ServiceSummary[];
  totalApprovedSellers: number;
  totalPendingRequests: number;
}

export interface OrderSummary {
  serviceId: string;
  serviceName: string;
  approvedSellerCount: number;
  serviceUrl: string | null;
  message: string;
}

// WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 (read-only 통합 주문 조회)
export interface UnifiedSupplierOrder {
  id: string;
  source: 'neture_order' | 'checkout_order';
  orderNumber: string | null;
  serviceKey: string | null;
  orderType: 'neture' | 'event_offer' | 'service_checkout';
  status: string | null;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  supplierId: string;
  buyerName: string | null;
  buyerOrganizationName: string | null;
  /** WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 실제 결제가 아닌 테스트 결제 주문 */
  testPayment?: boolean;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  itemsPreview: Array<{
    name: string;
    quantity: number;
    unitPrice?: number | null;
    lineTotal?: number | null;
  }>;
  createdAt: string;
  updatedAt: string | null;
  canFulfill: boolean;
  fulfillmentUrl: string | null;
  readOnlyReason: string | null;
}

export interface UnifiedOrdersResponse {
  data: UnifiedSupplierOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
