/**
 * Supplier API + Supplier Profile API
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from '../apiClient';
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
  // WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
  tags?: string[];
  serviceKeys?: string[];
  // WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
  serviceApprovals?: Array<{ serviceKey: string; status: string }>;
  // WO-NETURE-SUPPLIER-CONTENT-EDIT-UX-V1
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  // WO-NETURE-SUPPLIER-PRODUCT-COMPLETENESS-MANAGEMENT-V1
  completenessScore?: number;
  completenessStatus?: 'DRAFT' | 'INCOMPLETE' | 'READY' | 'APPROVED';
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
      const response = await api.get('/neture/supplier/partner-commissions');
      const result = response.data;
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
      const response = await api.post('/neture/supplier/partner-commissions', data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async update(
    id: string,
    data: { commission_per_unit?: number; start_date?: string; end_date?: string | null }
  ): Promise<{ success: boolean; error?: string; data?: SupplierPartnerCommission }> {
    try {
      const response = await api.put(`/neture/supplier/partner-commissions/${id}`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/supplier/partner-commissions/${id}`);
      return response.data;
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
      const response = await api.get('/neture/supplier/copilot/kpi');
      const result = response.data;
      return result.data || { registeredProducts: 0, activeProducts: 0, storeListings: 0, recentOrders: 0 };
    } catch (error) {
      console.warn('[Supplier Copilot] KPI fetch failed:', error);
      throw error;
    }
  },

  async getProductPerformance(): Promise<ProductPerformanceItem[]> {
    try {
      const response = await api.get('/neture/supplier/copilot/products/performance');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Performance fetch failed:', error);
      return [];
    }
  },

  async getDistribution(): Promise<DistributionItem[]> {
    try {
      const response = await api.get('/neture/supplier/copilot/distribution');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Distribution fetch failed:', error);
      return [];
    }
  },

  async getTrendingProducts(): Promise<TrendingProductItem[]> {
    try {
      const response = await api.get('/neture/supplier/copilot/products/trending');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Trending fetch failed:', error);
      return [];
    }
  },

  async getAiInsight(): Promise<SupplierAiInsight | null> {
    try {
      const response = await api.get('/neture/supplier/dashboard/ai-insight');
      const result = response.data;
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
  // Business profile (WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1)
  businessNumber: string | null;
  representativeName: string | null;
  businessAddress: string | null;
  managerName: string | null;
  managerPhone: string | null;
  businessType: string | null;
  taxEmail: string | null;
  _prefilled?: boolean;
  // Contact
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

      const url = `/neture/supplier/requests${params.toString() ? `?${params}` : ''}`;

      const response = await api.get(url);
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch requests:', error);
      return [];
    }
  },

  async getRequestById(id: string): Promise<SupplierRequestDetail | null> {
    try {
      const response = await api.get(`/neture/supplier/requests/${id}`);
      const result = response.data;
      return result.data;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch request detail:', error);
      return null;
    }
  },

  async approveRequest(id: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.post(`/neture/supplier/requests/${id}/approve`, {});
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async rejectRequest(id: string, reason?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.post(`/neture/supplier/requests/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async suspendRequest(id: string, note?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.post(`/neture/supplier/requests/${id}/suspend`, { note });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async reactivateRequest(id: string, note?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.post(`/neture/supplier/requests/${id}/reactivate`, { note });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async revokeRequest(id: string, note?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.post(`/neture/supplier/requests/${id}/revoke`, { note });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getProducts(): Promise<SupplierProduct[]> {
    try {
      const response = await api.get('/neture/supplier/products');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch products:', error);
      return [];
    }
  },

  // WO-NETURE-SUPPLIER-EXCEL-LIST-V1: Paginated product list
  async getProductsPaginated(params?: {
    page?: number; limit?: number; keyword?: string;
    distributionType?: string; isActive?: string;
    sort?: string; order?: string;
    hasImage?: string; hasDescription?: string; barcodeSource?: string;
    completenessStatus?: string;
  }): Promise<{ data: SupplierProduct[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      if (params?.keyword) sp.set('keyword', params.keyword);
      if (params?.distributionType) sp.set('distributionType', params.distributionType);
      if (params?.isActive) sp.set('isActive', params.isActive);
      if (params?.sort) sp.set('sort', params.sort);
      if (params?.order) sp.set('order', params.order);
      if (params?.hasImage) sp.set('hasImage', params.hasImage);
      if (params?.hasDescription) sp.set('hasDescription', params.hasDescription);
      if (params?.barcodeSource) sp.set('barcodeSource', params.barcodeSource);
      if (params?.completenessStatus) sp.set('completenessStatus', params.completenessStatus);
      const qs = sp.toString() ? `?${sp}` : '';
      const response = await api.get(`/neture/supplier/products${qs}`);
      const result = response.data;
      return {
        data: result.data || [],
        pagination: result.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch paginated products:', error);
      return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
  },

  // WO-NETURE-SUPPLIER-EXCEL-LIST-V1: Batch update
  async batchUpdateProducts(updates: Array<{
    offerId: string;
    isActive?: boolean;
    distributionType?: string;
    priceGeneral?: number;
    consumerReferencePrice?: number | null;
  }>): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
    try {
      const response = await api.patch('/neture/supplier/products/batch', { updates });
      const result = response.data;
      return result.data || { updated: [], failed: [] };
    } catch (error) {
      console.warn('[Supplier API] Failed to batch update products:', error);
      return { updated: [], failed: [{ id: 'all', error: 'NETWORK_ERROR' }] };
    }
  },

  // WO-NETURE-SUPPLIER-BULK-EDIT-UX-V1: Bulk price update
  async bulkUpdatePrice(params: {
    offerIds: string[];
    operation: 'INCREASE' | 'DECREASE' | 'PERCENT_INCREASE' | 'PERCENT_DECREASE' | 'SET';
    value: number;
  }): Promise<{ updated: number; failed: Array<{ id: string; error: string }> }> {
    try {
      const response = await api.patch('/neture/supplier/products/bulk-price', params);
      return response.data.data || { updated: 0, failed: [] };
    } catch (error) {
      console.warn('[Supplier API] Failed to bulk update prices:', error);
      return { updated: 0, failed: [{ id: 'all', error: 'NETWORK_ERROR' }] };
    }
  },

  async createProduct(data: {
    barcode?: string;
    marketingName?: string;
    categoryId?: string;
    brandName?: string;
    distributionType?: string;
    serviceKeys?: string[];
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
      const response = await api.post('/neture/supplier/products', data);
      return response.data;
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
      const response = await api.patch(`/neture/supplier/products/${id}`, updates);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getOrdersSummary(): Promise<OrderSummaryResponse> {
    try {
      const response = await api.get('/neture/supplier/orders/summary');
      const result = response.data;
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
      const response = await api.get(`/neture/library${query ? `?${query}` : ''}`);
      const result = response.data;
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
      const response = await api.post('/neture/library', data);
      return response.data;
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
      const response = await api.patch(`/neture/library/${id}`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async deleteLibraryItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/library/${id}`);
      return response.data;
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
      const response = await api.get(`/neture/supplier/orders${qs ? `?${qs}` : ''}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch orders:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getOrderById(id: string): Promise<StoreOrder | null> {
    try {
      const response = await api.get(`/neture/supplier/orders/${id}`);
      const result = response.data;
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch order detail:', error);
      return null;
    }
  },

  async updateOrderStatus(id: string, status: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.patch(`/neture/supplier/orders/${id}/status`, { status });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getOrderKpi(): Promise<SupplierOrderKpi> {
    try {
      const response = await api.get('/neture/supplier/orders/kpi');
      const result = response.data;
      return result.data || { today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch order KPI:', error);
      return { today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 };
    }
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const response = await api.get('/neture/supplier/inventory');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch inventory:', error);
      return [];
    }
  },

  async getInventoryItem(offerId: string): Promise<InventoryItem | null> {
    try {
      const response = await api.get(`/neture/supplier/inventory/${offerId}`);
      const result = response.data;
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
      const response = await api.patch(`/neture/supplier/inventory/${offerId}`, updates);
      return response.data;
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
      const response = await api.post(`/neture/supplier/orders/${orderId}/shipment`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getShipment(orderId: string): Promise<Shipment | null> {
    try {
      const response = await api.get(`/neture/supplier/orders/${orderId}/shipment`);
      const result = response.data;
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
      const response = await api.patch(`/neture/supplier/shipments/${shipmentId}`, data);
      return response.data;
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

      const response = await api.get(`/neture/supplier/settlements${qs}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlements:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getSettlementDetail(id: string): Promise<SettlementDetail | null> {
    try {
      const response = await api.get(`/neture/supplier/settlements/${id}`);
      const result = response.data;
      return result.data || null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlement detail:', error);
      return null;
    }
  },

  async getSettlementKpi(): Promise<SettlementKpi> {
    try {
      const response = await api.get('/neture/supplier/settlements/kpi');
      const result = response.data;
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
      const response = await api.get('/neture/supplier/profile');
      const result = response.data;
      return result.data;
    } catch (error) {
      console.warn('[Supplier Profile API] Failed to fetch profile:', error);
      return null;
    }
  },

  async getCompleteness(): Promise<ProfileCompleteness | null> {
    try {
      const response = await api.get('/neture/supplier/profile/completeness');
      const result = response.data;
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
    // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
    businessNumber?: string;
    representativeName?: string;
    businessAddress?: string;
    managerName?: string;
    managerPhone?: string;
    businessType?: string;
    taxEmail?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch('/neture/supplier/profile', data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },
};
