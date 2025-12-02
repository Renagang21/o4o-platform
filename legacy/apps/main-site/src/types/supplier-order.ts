/**
 * Supplier Order Types
 * Type definitions for supplier order management
 */

/**
 * Order status enum (supplier perspective)
 */
export enum SupplierOrderStatus {
  NEW = 'new',               // 신규 요청 (아직 처리 시작 전)
  PROCESSING = 'processing', // 준비중 (피킹/포장 중)
  SHIPPED = 'shipped',       // 발송완료 (송장 정보 입력됨)
  COMPLETED = 'completed',   // 공급자 처리 완료
  CANCELLED = 'cancelled',   // 취소됨
}

/**
 * Shipping address
 */
export interface ShippingAddress {
  postal_code: string;
  address1: string;
  address2?: string;
  city?: string;
}

/**
 * Order item (product line in order)
 */
export interface SupplierOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  option_name?: string;
  quantity: number;
  supply_price: number;
  line_total: number;
  thumbnail_url?: string;
}

/**
 * Order list item (for table display)
 */
export interface SupplierOrderListItem {
  id: string;
  order_number: string;
  buyer_name: string;
  order_date: string;
  total_amount: number;
  order_status: SupplierOrderStatus;
}

/**
 * Order detail (full order information)
 */
export interface SupplierOrderDetail {
  id: string;
  order_number: string;
  supplier_id: string;
  buyer_name: string;
  buyer_phone?: string;
  buyer_email?: string;
  shipping_address: ShippingAddress;
  order_status: SupplierOrderStatus;
  order_date: string;
  total_amount: number;
  channel?: string;
  note?: string;

  // Shipping info
  courier?: string;
  tracking_number?: string;
  shipped_at?: string;

  // Order items
  items: SupplierOrderItem[];

  created_at: string;
  updated_at: string;
}

/**
 * Query parameters for fetching orders
 */
export interface GetSupplierOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierOrderStatus | 'all';
  date_from?: string;
  date_to?: string;
  sort_by?: 'order_date' | 'total_amount';
  sort_order?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface OrderPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * API Response types
 */
export interface GetSupplierOrdersResponse {
  success: boolean;
  data: {
    orders: SupplierOrderListItem[];
    pagination: OrderPagination;
  };
}

export interface GetSupplierOrderDetailResponse {
  success: boolean;
  data: SupplierOrderDetail;
}

/**
 * Request to update order status
 */
export interface UpdateOrderStatusRequest {
  order_status: SupplierOrderStatus;
  courier?: string;
  tracking_number?: string;
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  data: {
    id: string;
    order_status: SupplierOrderStatus;
    courier?: string;
    tracking_number?: string;
    shipped_at?: string;
  };
  message?: string;
}

/**
 * Date range preset for filtering
 */
export type DateRangePreset = 'today' | '7days' | '30days' | 'custom';
