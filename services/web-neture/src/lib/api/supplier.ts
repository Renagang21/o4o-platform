/**
 * Supplier API + Supplier Profile API
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
import type { ContactVisibility } from './neture.js';
import type {
  StoreOrder,
  SupplierOrdersResponse,
  SupplierOrderKpi,
  InventoryItem,
  Shipment,
  SettlementStatus,
  SettlementsResponse,
  SettlementDetail,
  SettlementKpi,
} from './store.js';

// ==================== Supplier Types ====================

export type SupplierProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

export type DistributionType = 'PUBLIC' | 'PRIVATE';

export type SupplierRequestStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked' | 'expired';

export interface SupplierRequest {
  id: string;
  status: SupplierRequestStatus;
  sellerName: string;
  sellerEmail: string;
  serviceName: string;
  serviceId: string;
  productName: string;
  productId: string;
  productPurpose: string;
  requestedAt: string;
}

export interface SupplierRequestDetail {
  id: string;
  status: SupplierRequestStatus;
  seller: {
    id: string;
    name: string;
    email: string;
    phone: string;
    storeUrl: string;
  };
  service: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
    category: string;
    purpose: string;
  };
  decidedBy: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
  suspendedAt: string | null;
  revokedAt: string | null;
  expiredAt: string | null;
  relationNote: string | null;
  effectiveUntil: string | null;
  createdAt: string;
}

export interface SupplierLibraryItem {
  id: string;
  supplierId: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: SupplierProductPurpose;
  isActive: boolean;
  acceptsApplications: boolean;
  distributionType: DistributionType;
  allowedSellerIds: string[] | null;
  pendingRequestCount: number;
  activeServiceCount: number;
  createdAt: string;
  updatedAt: string;
  masterId: string;
  masterName: string;
  barcode: string;
  brandName: string | null;
  categoryName: string | null;
  specification: string | null;
  primaryImageUrl: string | null;
  approvalStatus: string;
  priceGeneral: number;
  priceGold: number | null;
  pricePlatinum: number | null;
  consumerReferencePrice: number | null;
}

export interface ServiceSummary {
  serviceId: string;
  serviceName: string;
  summary: {
    approvedSellerCount: number;
    pendingRequestCount: number;
    lastApprovedAt: string | null;
  };
  navigation: {
    serviceUrl: string | null;
    ordersUrl: string | null;
    supportEmail: string | null;
  };
  features: string[];
  recentActivity: Array<{
    eventType: 'approved' | 'rejected' | 'created';
    sellerName: string;
    productName: string;
    createdAt: string;
  }>;
  notice: string;
}

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

// ==================== Supplier Partner Commission Types ====================

export interface SupplierPartnerCommission {
  id: string;
  supplier_product_id: string;
  commission_per_unit: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  product_name: string;
  barcode: string;
}

// ==================== Supplier Partner Commission API ====================

export const supplierCommissionApi = {
  async getCommissions(): Promise<SupplierPartnerCommission[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/partner-commissions`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Commission API] Failed to fetch commissions:', error);
      return [];
    }
  },

  async create(data: {
    supplier_product_id: string;
    commission_per_unit: number;
    start_date: string;
    end_date?: string;
  }): Promise<{ success: boolean; error?: string; data?: SupplierPartnerCommission }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/partner-commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async update(
    id: string,
    data: { commission_per_unit?: number; start_date?: string; end_date?: string | null }
  ): Promise<{ success: boolean; error?: string; data?: SupplierPartnerCommission }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/partner-commissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/partner-commissions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },
};

// ==================== Supplier Copilot Types (WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1) ====================

export interface SupplierKpiSummary {
  registeredProducts: number;
  activeProducts: number;
  storeListings: number;
  recentOrders: number;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  orders: number;
  revenue: number;
  qrScans: number;
}

export interface DistributionItem {
  productId: string;
  productName: string;
  storeCount: number;
  newStores: number;
}

export interface TrendingProductItem {
  productName: string;
  currentOrders: number;
  previousOrders: number;
  growthRate: number;
}

export interface SupplierAiInsight {
  insight: {
    summary: string;
    riskLevel: string;
    recommendedActions: string[];
    confidenceScore: number;
  };
  meta: {
    provider: string;
    model: string;
    durationMs: number;
  };
}

// ==================== Supplier Copilot API ====================

export const supplierCopilotApi = {
  async getKpi(): Promise<SupplierKpiSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/copilot/kpi`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return result.data || { registeredProducts: 0, activeProducts: 0, storeListings: 0, recentOrders: 0 };
    } catch (error) {
      console.warn('[Supplier Copilot] KPI fetch failed:', error);
      throw error;
    }
  },

  async getProductPerformance(): Promise<ProductPerformanceItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/copilot/products/performance`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Performance fetch failed:', error);
      return [];
    }
  },

  async getDistribution(): Promise<DistributionItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/copilot/distribution`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Distribution fetch failed:', error);
      return [];
    }
  },

  async getTrendingProducts(): Promise<TrendingProductItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/copilot/products/trending`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Trending fetch failed:', error);
      return [];
    }
  },

  async getAiInsight(): Promise<SupplierAiInsight | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/dashboard/ai-insight`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier Copilot] AI insight fetch failed:', error);
      return null;
    }
  },
};

// ==================== Supplier Profile Types ====================

export interface SupplierProfile {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
  contactKakao: string | null;
  contactEmailVisibility: ContactVisibility;
  contactPhoneVisibility: ContactVisibility;
  contactWebsiteVisibility: ContactVisibility;
  contactKakaoVisibility: ContactVisibility;
}

export interface ProfileCompleteness {
  total: number;
  completed: number;
  missing: string[];
}

// ==================== Supplier API ====================

export const supplierApi = {
  async getRequests(filters?: { status?: SupplierRequestStatus; serviceId?: string }): Promise<SupplierRequest[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.serviceId) params.append('serviceId', filters.serviceId);

      const url = `${API_BASE_URL}/api/v1/neture/supplier/requests${params.toString() ? `?${params}` : ''}`;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Supplier API] Requests API not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch requests:', error);
      return [];
    }
  },

  async getRequestById(id: string): Promise<SupplierRequestDetail | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch request detail:', error);
      return null;
    }
  },

  async approveRequest(id: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async rejectRequest(id: string, reason?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async suspendRequest(id: string, note?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note }),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async reactivateRequest(id: string, note?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note }),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async revokeRequest(id: string, note?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note }),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getProducts(): Promise<SupplierProduct[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/products`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[Supplier API] Products API not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch products:', error);
      return [];
    }
  },

  async createProduct(data: {
    barcode: string;
    distributionType?: string;
    manualData?: Record<string, any>;
    priceGeneral?: number;
    priceGold?: number | null;
    pricePlatinum?: number | null;
    consumerReferencePrice?: number | null;
    // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
    consumerShortDescription?: string | null;
    consumerDetailDescription?: string | null;
    businessShortDescription?: string | null;
    businessDetailDescription?: string | null;
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async updateProduct(
    id: string,
    updates: {
      isActive?: boolean;
      acceptsApplications?: boolean;
      distributionType?: DistributionType;
      allowedSellerIds?: string[] | null;
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
      // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
    }
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getOrdersSummary(): Promise<OrderSummaryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/summary`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[Supplier API] Orders summary API not available');
        return { services: [], totalApprovedSellers: 0, totalPendingRequests: 0 };
      }
      const result = await response.json();
      return result.data || { services: [], totalApprovedSellers: 0, totalPendingRequests: 0 };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch orders summary:', error);
      return { services: [], totalApprovedSellers: 0, totalPendingRequests: 0 };
    }
  },

  // Library API
  async getLibraryItems(opts?: { category?: string; page?: number; limit?: number }): Promise<SupplierLibraryItem[]> {
    try {
      const params = new URLSearchParams();
      if (opts?.category) params.append('category', opts.category);
      if (opts?.page) params.append('page', String(opts.page));
      if (opts?.limit) params.append('limit', String(opts.limit));
      const query = params.toString();
      const url = `${API_BASE_URL}/api/v1/neture/library${query ? `?${query}` : ''}`;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Supplier API] Library API not available');
        return [];
      }
      const result = await response.json();
      return result.data?.items || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch library items:', error);
      return [];
    }
  },

  async createLibraryItem(data: {
    title: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    category?: string;
    isPublic?: boolean;
  }): Promise<{ success: boolean; error?: string; data?: SupplierLibraryItem }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async updateLibraryItem(id: string, data: {
    title?: string;
    description?: string | null;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    category?: string | null;
    isPublic?: boolean;
  }): Promise<{ success: boolean; error?: string; data?: SupplierLibraryItem }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/library/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async deleteLibraryItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/library/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  // Order Management
  async getOrders(params?: { page?: number; limit?: number; status?: string }): Promise<SupplierOrdersResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      const qs = searchParams.toString();
      const url = `${API_BASE_URL}/api/v1/neture/supplier/orders${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Supplier API] Failed to fetch orders:', response.status);
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch orders:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getOrderById(id: string): Promise<StoreOrder | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch order detail:', error);
      return null;
    }
  },

  async updateOrderStatus(id: string, status: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getOrderKpi(): Promise<SupplierOrderKpi> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/kpi`, {
        credentials: 'include',
      });
      if (!response.ok) {
        return { today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 };
      }
      const result = await response.json();
      return result.data || { today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch order KPI:', error);
      return { today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 };
    }
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/inventory`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch inventory:', error);
      return [];
    }
  },

  async getInventoryItem(offerId: string): Promise<InventoryItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/inventory/${offerId}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch inventory item:', error);
      return null;
    }
  },

  async updateInventory(
    offerId: string,
    updates: { stock_quantity?: number; low_stock_threshold?: number; track_inventory?: boolean }
  ): Promise<{ success: boolean; error?: string; data?: InventoryItem }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/inventory/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  // Shipment
  async createShipment(
    orderId: string,
    data: { carrier_code: string; carrier_name: string; tracking_number: string }
  ): Promise<{ success: boolean; data?: Shipment; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getShipment(orderId: string): Promise<Shipment | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/${orderId}/shipment`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch shipment:', error);
      return null;
    }
  },

  async updateShipmentStatus(
    shipmentId: string,
    data: { status: string; tracking_number?: string }
  ): Promise<{ success: boolean; data?: Shipment; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  // Settlement
  async getSettlements(
    params?: { page?: number; limit?: number; status?: SettlementStatus }
  ): Promise<SettlementsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await fetch(
        `${API_BASE_URL}/api/v1/neture/supplier/settlements${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlements:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getSettlementDetail(id: string): Promise<SettlementDetail | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/neture/supplier/settlements/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlement detail:', error);
      return null;
    }
  },

  async getSettlementKpi(): Promise<SettlementKpi> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/neture/supplier/settlements/kpi`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        return { pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0 };
      }
      const result = await response.json();
      return result.data || { pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0 };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlement KPI:', error);
      return { pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0 };
    }
  },
};

// ==================== Supplier Profile API ====================

export const supplierProfileApi = {
  async getProfile(): Promise<SupplierProfile | null> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/supplier/profile`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Supplier Profile API] Failed to fetch profile:', error);
      return null;
    }
  },

  async getCompleteness(): Promise<ProfileCompleteness | null> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/supplier/profile/completeness`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Supplier Profile API] Failed to fetch completeness:', error);
      return null;
    }
  },

  async updateProfile(data: {
    contactEmail?: string;
    contactPhone?: string;
    contactWebsite?: string;
    contactKakao?: string;
    contactEmailVisibility?: ContactVisibility;
    contactPhoneVisibility?: ContactVisibility;
    contactWebsiteVisibility?: ContactVisibility;
    contactKakaoVisibility?: ContactVisibility;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },
};
