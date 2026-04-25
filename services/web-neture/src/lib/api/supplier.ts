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

// WO-NETURE-SUPPLIER-PRODUCT-SAVE-ERROR-RESOLUTION-V1: 실제 에러 메시지 추출
function extractApiError(error: any): string {
  const data = error?.response?.data;
  if (data) {
    // { success: false, error: "CODE" }
    if (typeof data.error === 'string') return data.error;
    // { success: false, error: { code, message } }
    if (typeof data.error === 'object' && data.error !== null) {
      return data.error.message || data.error.code || 'UNKNOWN_ERROR';
    }
    if (typeof data.message === 'string') return data.message;
  }
  if (error?.code === 'ECONNABORTED') return 'REQUEST_TIMEOUT';
  if (error?.response?.status) return `HTTP_${error.response.status}`;
  console.error('[Supplier API] Network error:', error?.message || error);
  return 'NETWORK_ERROR';
}

// ==================== Supplier Types ====================

export type SupplierProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

export type DistributionType = 'PUBLIC' | 'SERVICE' | 'PRIVATE';


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
  // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
  producer?: string;
  visibility?: string;
  contentType?: string;
  metaStatus?: string;
  // document type (WO-NETURE-CONTENT-META-DOCUMENT-PATH-COMPLETION-V1)
  blocks?: Record<string, unknown>[] | null;
}

export interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: SupplierProductPurpose;
  isActive: boolean;
  acceptsApplications: boolean;
  isPublic: boolean;
  // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
  isFeatured?: boolean;
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
  /** @deprecated WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 별도 정책으로 이동 */
  pricePlatinum?: number | null;
  consumerReferencePrice: number | null;
  // WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
  tags?: string[];
  serviceKeys?: string[];
  // WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
  serviceApprovals?: Array<{ serviceKey: string; status: string; reason?: string | null }>;
  // WO-NETURE-SUPPLIER-CONTENT-EDIT-UX-V1
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  // WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
  businessShortDescription?: string | null;
  businessDetailDescription?: string | null;
  // WO-NETURE-SUPPLIER-PRODUCT-COMPLETENESS-MANAGEMENT-V1
  completenessScore?: number;
  completenessStatus?: 'DRAFT' | 'INCOMPLETE' | 'READY' | 'APPROVED';
  // WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1
  stockQuantity?: number;
  regulatoryType?: string;
  regulatoryName?: string;
  mfdsPermitNumber?: string | null;
  manufacturerName?: string | null;
  // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1
  originCountry?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  // WO-KPA-SOCIETY-SECOND-REVIEW-BRIDGE-FOUNDATION-V1
  kpaReviewStatus?: string | null;
  kpaReviewReason?: string | null;
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
      return { success: false, error: extractApiError(error) };
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
      return { success: false, error: extractApiError(error) };
    }
  },

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/supplier/partner-commissions/${id}`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
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
  status?: 'pending' | 'active' | 'approved' | 'suspended' | 'rejected';
  // Business profile (WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1)
  businessNumber: string | null;
  representativeName: string | null;
  businessZipCode: string | null;
  businessAddress: string | null;
  businessAddressDetail: string | null;
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
    serviceApprovalStatus?: string;
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
      if (params?.serviceApprovalStatus) sp.set('serviceApprovalStatus', params.serviceApprovalStatus);
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

  // WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1: Approval tab counts
  // WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1: forward filters
  async getApprovalCounts(params?: {
    keyword?: string;
    distributionType?: string;
    isActive?: string;
    hasImage?: string;
    hasDescription?: string;
    barcodeSource?: string;
    completenessStatus?: string;
  }): Promise<{ total: number; unrequested: number; pending: number; approved: number; rejected: number }> {
    try {
      const response = await api.get('/neture/supplier/products/approval-counts', { params });
      const result = response.data;
      return result.data || { total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch approval counts:', error);
      return { total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 };
    }
  },

  // WO-NETURE-SUPPLIER-EXCEL-LIST-V1: Batch update
  async batchUpdateProducts(updates: Array<{
    offerId: string;
    isActive?: boolean;
    isPublic?: boolean;
    distributionType?: string;
    priceGeneral?: number;
    consumerReferencePrice?: number | null;
    stockQuantity?: number;
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

  // WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1: Bulk delete
  async bulkDelete(offerIds: string[]): Promise<{ deleted: number; failed: Array<{ id: string; error: string }> }> {
    try {
      const response = await api.delete('/neture/supplier/products/bulk', { data: { offerIds } });
      return response.data.data || { deleted: 0, failed: [] };
    } catch (error) {
      console.warn('[Supplier API] Failed to bulk delete offers:', error);
      return { deleted: 0, failed: [{ id: 'all', error: 'NETWORK_ERROR' }] };
    }
  },

  /**
   * WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1: 저장된 정책 기준 승인 요청
   *
   * WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
   * - submitted: 실제로 pending 행이 최소 1개 이상 INSERT된 offer 수
   * - skipped: INSERT가 한 건도 발생하지 않은 offer 목록 (reason 포함)
   *   · NO_ELIGIBLE_SERVICE_KEYS: offer의 service_keys에 승인 대상 서비스 키가 없음
   *   · ALREADY_REQUESTED_OR_DECIDED: 이미 모든 eligible key에 대해 승인 레코드가 존재 (재요청 불가)
   * - errors: DB 예외, 소유권 없음 등 (NOT_OWNED / INTERNAL_ERROR)
   */
  async submitForApproval(
    offerIds: string[],
  ): Promise<{
    success: boolean;
    data?: {
      submitted: number;
      skipped: Array<{ id: string; reason: string }>;
      errors: Array<{ id: string; error: string }>;
    };
    error?: string;
  }> {
    try {
      const response = await api.post('/neture/supplier/products/submit-approval', { offerIds });
      return response.data;
    } catch (error) {
      console.warn('[Supplier API] Failed to submit for approval:', error);
      return { success: false, error: extractApiError(error) };
    }
  },

  async createProduct(data: {
    barcode?: string;
    name?: string;
    categoryId?: string;
    brandName?: string;
    distributionType?: string;
    serviceKeys?: string[];
    manualData?: Record<string, any>;
    priceGeneral?: number;
    priceGold?: number | null;
    consumerReferencePrice?: number | null;
    // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
    consumerShortDescription?: string | null;
    consumerDetailDescription?: string | null;
    businessShortDescription?: string | null;
    businessDetailDescription?: string | null;
    // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
    isFeatured?: boolean;
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.post('/neture/supplier/products', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async updateProduct(
    id: string,
    updates: {
      isActive?: boolean;
      isPublic?: boolean;
      acceptsApplications?: boolean;
      distributionType?: DistributionType;
      allowedSellerIds?: string[] | null;
      priceGeneral?: number;
      priceGold?: number | null;
      consumerReferencePrice?: number | null;
      // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
      stockQuantity?: number;
      name?: string;
      // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master-level fields
      categoryId?: string | null;
      brandId?: string | null;
      specification?: string | null;
      originCountry?: string | null;
      tags?: string[];
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured?: boolean;
    }
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.patch(`/neture/supplier/products/${id}`, updates);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  // WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
  async updateBusinessContent(
    offerId: string,
    data: {
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
    },
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.patch(`/neture/supplier/products/${offerId}/business-content`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
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
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    category?: string;
    isPublic?: boolean;
    contentType?: string;
    blocks?: Record<string, unknown>[];
  }): Promise<{ success: boolean; error?: string; data?: SupplierLibraryItem }> {
    try {
      const response = await api.post('/neture/library', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
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
    contentType?: string;
    blocks?: Record<string, unknown>[];
  }): Promise<{ success: boolean; error?: string; data?: SupplierLibraryItem }> {
    try {
      const response = await api.patch(`/neture/library/${id}`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async deleteLibraryItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/library/${id}`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
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
      return { success: false, error: extractApiError(error) };
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
      return { success: false, error: extractApiError(error) };
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
      return { success: false, error: extractApiError(error) };
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
      return { success: false, error: extractApiError(error) };
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

  // ==================== WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1 ====================

  /** 스팟 정책 생성 */
  async createSpotPolicy(data: {
    offerId: string;
    policyName: string;
    spotPrice: number;
    startAt: string;
    endAt: string;
  }): Promise<{ success: boolean; data?: SpotPricePolicy; error?: string }> {
    try {
      const response = await api.post('/neture/supplier/spot-policies', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  /** 상품별 스팟 정책 목록 */
  async listSpotPolicies(offerId: string): Promise<SpotPricePolicy[]> {
    try {
      const response = await api.get(`/neture/supplier/spot-policies/offer/${offerId}`);
      return response.data?.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to list spot policies:', error);
      return [];
    }
  },

  /** 스팟 정책 수정 (DRAFT만) */
  async updateSpotPolicy(
    id: string,
    data: { policyName?: string; spotPrice?: number; startAt?: string; endAt?: string },
  ): Promise<{ success: boolean; data?: SpotPricePolicy; error?: string }> {
    try {
      const response = await api.patch(`/neture/supplier/spot-policies/${id}`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  /** 스팟 정책 상태 변경 */
  async changeSpotPolicyStatus(
    id: string,
    status: 'ACTIVE' | 'CANCELLED',
  ): Promise<{ success: boolean; data?: SpotPricePolicy; error?: string }> {
    try {
      const response = await api.patch(`/neture/supplier/spot-policies/${id}/status`, { status });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
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
    businessZipCode?: string;
    businessAddress?: string;
    businessAddressDetail?: string;
    managerName?: string;
    managerPhone?: string;
    businessType?: string;
    taxEmail?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch('/neture/supplier/profile', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },
};

// ==================== KPA Event Offer Stats ====================
// WO-EVENT-OFFER-SUPPLIER-DASHBOARD-STATS-INTEGRATION-V1

export interface SupplierEventOfferStats {
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
  totalOrders: number;
  totalRevenue: number;
}

/**
 * 공급자 KPA 이벤트/특가 성과 집계 API
 * GET /api/v1/kpa/supplier/event-offers/stats
 */
export const supplierKpaEventOfferApi = {
  getStats: (): Promise<SupplierEventOfferStats> =>
    api
      .get<{ success: boolean; data: SupplierEventOfferStats }>(
        '/kpa/supplier/event-offers/stats'
      )
      .then(res => res.data.data),
};

/** WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1 */
export interface SpotPricePolicy {
  id: string;
  offerId: string;
  supplierId: string;
  policyName: string;
  spotPrice: number;
  status: 'DRAFT' | 'ACTIVE' | 'CANCELLED';
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
}
