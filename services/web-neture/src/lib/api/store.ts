/**
 * Store API + Order/Shipment/Settlement/Inventory types
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';

// ==================== Store Order Types ====================

export interface StoreOrderShipping {
  recipient_name: string;
  phone: string;
  postal_code: string;
  address: string;
  address_detail?: string;
  delivery_note?: string;
}

export interface CreateStoreOrderRequest {
  items: Array<{ product_id: string; quantity: number }>;
  shipping: StoreOrderShipping;
  orderer_name: string;
  orderer_phone: string;
  orderer_email?: string;
  note?: string;
  referral_token?: string;
}

export interface StoreOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: any | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: Record<string, any> | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  supplier_website?: string | null;
  brand_name?: string | null;
  specification?: string | null;
  barcode?: string | null;
  primary_image_url?: string | null;
}

export interface StoreOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  orderer_name: string | null;
  orderer_phone: string | null;
  orderer_email?: string | null;
  note: string | null;
  shipping?: {
    recipient_name: string;
    phone: string;
    postal_code: string;
    address: string;
    address_detail?: string;
    delivery_note?: string;
  } | null;
  created_at: string;
  updated_at: string;
  items?: StoreOrderItem[];
}

export interface StoreOrdersResponse {
  data: StoreOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ==================== Supplier Order Types ====================

export interface SupplierOrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_fee: number;
  final_amount: number;
  orderer_name: string | null;
  orderer_phone: string | null;
  orderer_email: string | null;
  shipping: {
    recipient_name: string;
    phone: string;
    postal_code: string;
    address: string;
    address_detail?: string;
    delivery_note?: string;
  } | null;
  note: string | null;
  region: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrdersResponse {
  data: SupplierOrderSummary[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SupplierOrderKpi {
  today_orders: number;
  pending_processing: number;
  pending_shipping: number;
  total_orders: number;
}

// ==================== Inventory Types ====================

export interface InventoryItem {
  offer_id: string;
  master_id: string;
  marketing_name: string;
  brand_name: string | null;
  barcode: string | null;
  specification: string | null;
  primary_image_url: string | null;
  price_general: number;
  is_active: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  available_stock: number;
}

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'untracked';

export function getInventoryStatus(item: InventoryItem): InventoryStatus {
  if (!item.track_inventory) return 'untracked';
  if (item.available_stock <= 0) return 'out_of_stock';
  if (item.available_stock <= item.low_stock_threshold) return 'low_stock';
  return 'in_stock';
}

// ==================== Shipment Types ====================

export interface Shipment {
  id: string;
  order_id: string;
  supplier_id: string;
  carrier_code: string;
  carrier_name: string;
  tracking_number: string;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CARRIERS = [
  { code: 'cj', name: 'CJ대한통운', trackUrl: 'https://trace.cjlogistics.com/next/tracking.html?wblNo=' },
  { code: 'hanjin', name: '한진택배', trackUrl: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&inv_no=' },
  { code: 'lotte', name: '롯데택배', trackUrl: 'https://www.lotteglogis.com/home/reservation/tracking/link498?InvNo=' },
  { code: 'logen', name: '로젠택배', trackUrl: 'https://www.ilogen.com/web/personal/trace/' },
  { code: 'post', name: '우체국택배', trackUrl: 'https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=' },
  { code: 'other', name: '기타', trackUrl: null },
] as const;

export function getTrackingUrl(carrierCode: string, trackingNumber: string): string | null {
  const carrier = CARRIERS.find((c) => c.code === carrierCode);
  if (!carrier || !carrier.trackUrl) return null;
  return `${carrier.trackUrl}${trackingNumber}`;
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  preparing: '배송 준비',
  shipped: '발송 완료',
  in_transit: '배송 중',
  delivered: '배송 완료',
};

// ==================== Settlement Types ====================

export type SettlementStatus = 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';

export interface Settlement {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  platform_fee: number;
  supplier_amount: number;
  platform_fee_rate: number;
  order_count: number;
  status: SettlementStatus;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementOrder {
  order_id: string;
  supplier_sales_amount: number;
  order_number: string;
  order_status: string;
  orderer_name: string | null;
  order_date: string;
}

export interface SettlementDetail extends Settlement {
  orders: SettlementOrder[];
}

export interface SettlementKpi {
  pending_amount: number;
  paid_amount: number;
  total_amount: number;
  pending_count: number;
  paid_count: number;
}

export interface SettlementsResponse {
  data: Settlement[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  calculated: '정산완료',
  approved: '승인완료',
  paid: '지급완료',
  cancelled: '취소',
};

export interface AdminSettlementKpi {
  calculated_count: number;
  calculated_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_count: number;
  paid_amount: number;
}

// ==================== Store Product Library Types (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1) ====================

export interface StoreProductSearchResult {
  id: string;
  barcode: string;
  marketingName: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
  offerCount: number;
}

export interface StoreProductSearchResponse {
  data: StoreProductSearchResult[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StoreOfferItem {
  id: string;
  supplierId: string;
  supplierName: string;
  priceGeneral: number;
  distributionType: string;
}

export interface StoreListingItem {
  id: string;
  isActive: boolean;
  price: number | null;
  createdAt: string;
  updatedAt: string;
  masterId: string;
  barcode: string;
  marketingName: string;
  regulatoryName: string;
  manufacturerName: string;
  primaryImage: string | null;
  offerPrice: number;
  distributionType: string;
  supplierName: string;
}

export interface StoreListingsResponse {
  data: StoreListingItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ==================== Store API ====================

export const storeApi = {
  async createOrder(data: CreateStoreOrderRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/seller/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.message || result.error || 'ORDER_FAILED' };
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[Store API] Failed to create order:', error);
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getOrders(params?: { page?: number; limit?: number; status?: string }): Promise<StoreOrdersResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      const qs = searchParams.toString();
      const url = `${API_BASE_URL}/api/v1/neture/seller/orders${qs ? `?${qs}` : ''}`;

      const response = await fetchWithTimeout(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Store API] Failed to fetch orders:', response.status);
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Store API] Failed to fetch orders:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getShipment(orderId: string): Promise<Shipment | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/seller/orders/${orderId}/shipment`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Store API] Failed to fetch shipment:', error);
      return null;
    }
  },

  async getOrderById(id: string): Promise<StoreOrder | null> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/seller/orders/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Store API] Failed to fetch order:', error);
      return null;
    }
  },

  // ── Store Product Library (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1) ──

  async searchProducts(params?: {
    q?: string; categoryId?: string; brandId?: string; page?: number; limit?: number;
  }): Promise<StoreProductSearchResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      if (params?.categoryId) sp.set('categoryId', params.categoryId);
      if (params?.brandId) sp.set('brandId', params.brandId);
      if (params?.page) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString();
      const url = `${API_BASE_URL}/api/v1/store/products/search${qs ? `?${qs}` : ''}`;
      const response = await fetchWithTimeout(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Store API] searchProducts failed:', response.status);
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Store API] searchProducts error:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getMasterOffers(masterId: string): Promise<StoreOfferItem[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/store/products/master/${masterId}/offers`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Store API] getMasterOffers error:', error);
      return [];
    }
  },

  async createListing(data: { offerId: string; price?: number | null }): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/store/products/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error?.message || 'LISTING_FAILED' };
      }
      return { success: true, data: result.data, message: result.message };
    } catch (error) {
      console.error('[Store API] createListing error:', error);
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getMyListings(params?: { page?: number; limit?: number }): Promise<StoreListingsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString();
      const url = `${API_BASE_URL}/api/v1/store/products${qs ? `?${qs}` : ''}`;
      const response = await fetchWithTimeout(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Store API] getMyListings failed:', response.status);
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Store API] getMyListings error:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async updateListing(id: string, data: { isActive?: boolean; price?: number | null }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/store/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error?.message || 'UPDATE_FAILED' };
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[Store API] updateListing error:', error);
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },
};
