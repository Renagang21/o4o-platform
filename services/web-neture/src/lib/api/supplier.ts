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
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1: Product Core drug_category 노출 (additive)
  drugCategory?: string | null;
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
  businessItem: string | null;
  // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
  businessEntityType: string | null;
  businessStartDate: string | null;
  taxInvoiceEmail: string | null;
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
  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  minOrderAmount: number | null;
  minOrderSurcharge: number | null;
  orderConditionNote: string | null;
  // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1: 배송 정책 (저장/조회 foundation)
  baseShippingFee?: number | null;
  freeShippingThreshold?: number | null;
  averageDispatchDays?: number | null;
  returnExchangeNotice?: string | null;
  shippingStandard?: string | null;
  shippingIsland?: string | null;
  shippingMountain?: string | null;
}

export type SupplierOnboardingDocumentType = 'business_registration' | 'bank_statement' | 'mail_order_report';

export type MailOrderSalesStatus = 'not_applicable' | 'reported' | 'pending';

export interface SupplierOnboardingDocument {
  id: string;
  documentType: SupplierOnboardingDocumentType;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  verificationStatus: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface SupplierOnboarding {
  supplierId: string;
  taxInvoiceEmail: string | null;
  settlementBankName: string | null;
  settlementAccountNumber: string | null;
  settlementAccountNumberMasked: string | null;
  settlementAccountHolder: string | null;
  settlementContactName: string | null;
  settlementContactEmail: string | null;
  mailOrderSalesStatus: MailOrderSalesStatus | null;
  mailOrderSalesRegistrationNumber: string | null;
  businessRegistrationDocument: SupplierOnboardingDocument | null;
  settlementBankbookDocument: SupplierOnboardingDocument | null;
  mailOrderSalesDocument: SupplierOnboardingDocument | null;
}

// WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
export interface SupplierOrderCondition {
  supplierId: string;
  supplierName: string;
  minOrderAmount: number | null;
  minOrderSurcharge: number | null;
  note: string | null;
}

export interface ProfileCompleteness {
  total: number;
  completed: number;
  missing: string[];
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
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  itemsPreview: Array<{ name: string; quantity: number; unitPrice?: number | null; lineTotal?: number | null }>;
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

// ==================== Import Assistant: 자사 관리자 상품 이미지 복사 ====================
// WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1

/** copy-images 결과 */
export interface CopiedImageResult {
  originalUrl: string;
  url: string | null;
  ok: boolean;
  reason?: string;
}
export interface CopyImagesResult {
  copied: number;
  total: number;
  results: CopiedImageResult[];
}

// ==================== Supplier API ====================

export const supplierApi = {
  /**
   * 자사 관리자 HTML 에서 추출한 이미지 URL 을 O4O 미디어 라이브러리로 복사.
   * (WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1)
   */
  /**
   * 미리보기 프록시: 자사 쇼핑몰 이미지를 서버 SSRF-safe 경로로 가져와 blob objectURL 반환.
   * (http 외부 이미지를 HTTPS 화면에 직접 넣지 않기 위함 — 혼합 콘텐츠 회피, 영구 저장 없음)
   * @throws Error(메시지) 실패 시
   */
  async proxyImageObjectUrl(url: string, shopOrigin?: string): Promise<string> {
    const response = await api.post(
      '/neture/supplier/import/image-proxy',
      { url, ...(shopOrigin ? { shopOrigin } : {}) },
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data as Blob);
  },

  async copyImages(
    urls: string[],
    shopOrigin?: string,
    opts?: { preserveOriginal?: boolean },
  ): Promise<CopyImagesResult> {
    try {
      const response = await api.post('/neture/supplier/import/copy-images', {
        urls,
        ...(shopOrigin ? { shopOrigin } : {}),
        ...(opts?.preserveOriginal ? { preserveOriginal: true } : {}),
      });
      return response.data.data as CopyImagesResult;
    } catch (error) {
      throw new Error(extractApiError(error));
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

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1:
  // 공급 방식(전체 공개 + 서비스 대상) 정식 변경 — 추가=pending/재심사, 제거=cancelled+listing 비활성.
  async updateDistribution(
    id: string,
    input: { isPublic?: boolean; serviceKeys?: string[] },
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.patch(`/neture/supplier/products/${id}/distribution`, input);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: 서비스별 공급가
  async getServicePrices(
    id: string,
  ): Promise<{ success: boolean; error?: string; data?: { priceGeneral: number; prices: Array<{ serviceKey: string; unitPrice: number }> } }> {
    try {
      const response = await api.get(`/neture/supplier/products/${id}/service-prices`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async setServicePrices(
    id: string,
    prices: Array<{ serviceKey: string; unitPrice: number }>,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.put(`/neture/supplier/products/${id}/service-prices`, { prices });
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

  // WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1: neture_orders + checkout_orders 통합 조회(읽기)
  async getUnifiedOrders(params?: { page?: number; limit?: number; source?: 'neture' | 'checkout' | 'all' }): Promise<UnifiedOrdersResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.source) searchParams.set('source', params.source);
      const qs = searchParams.toString();
      const response = await api.get(`/neture/supplier/orders/unified${qs ? `?${qs}` : ''}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch unified orders:', error);
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
    businessItem?: string;
    taxInvoiceEmail?: string;
    // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
    businessEntityType?: string;
    businessStartDate?: string;
    // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
    minOrderAmount?: number | null;
    minOrderSurcharge?: number | null;
    orderConditionNote?: string | null;
    // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1
    baseShippingFee?: number | null;
    freeShippingThreshold?: number | null;
    averageDispatchDays?: number | null;
    returnExchangeNotice?: string | null;
    shippingStandard?: string | null;
    shippingIsland?: string | null;
    shippingMountain?: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch('/neture/supplier/profile', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  async getOrderCondition(supplierId: string): Promise<SupplierOrderCondition | null> {
    try {
      const response = await api.get(`/neture/suppliers/${encodeURIComponent(supplierId)}/order-condition`);
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch order condition:', error);
      return null;
    }
  },
};

// ==================== Supplier Onboarding API ====================

export const supplierOnboardingApi = {
  async getOnboarding(): Promise<SupplierOnboarding | null> {
    try {
      const response = await api.get('/neture/supplier/onboarding');
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Supplier Onboarding API] Failed to fetch onboarding:', error);
      return null;
    }
  },

  async updateOnboarding(data: {
    taxInvoiceEmail?: string;
    settlementBankName?: string;
    settlementAccountNumber?: string;
    settlementAccountHolder?: string;
    settlementContactName?: string;
    settlementContactEmail?: string;
    mailOrderSalesStatus?: string;
    mailOrderSalesRegistrationNumber?: string;
  }): Promise<{ success: boolean; error?: string; data?: SupplierOnboarding }> {
    try {
      const response = await api.patch('/neture/supplier/onboarding', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async uploadDocument(
    documentType: SupplierOnboardingDocumentType,
    file: File,
  ): Promise<{ success: boolean; error?: string; data?: SupplierOnboardingDocument }> {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post(`/neture/supplier/documents/${documentType}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async downloadDocument(documentType: SupplierOnboardingDocumentType): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/supplier/documents/${documentType}/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      console.warn('[Supplier Onboarding API] Failed to download document:', error);
      return null;
    }
  },
};

// ==================== Supplier Regulated Category API ====================
// WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1

export type RegulatedCategory =
  | 'general'
  | 'pharmaceutical'
  | 'quasi_drug'
  | 'medical_device'
  | 'health_functional_food'
  | 'food'
  | 'cosmetics'
  | 'other_regulated';

export type RegulatedCategoryStatus =
  | 'not_requested'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'needs_update'
  | 'suspended';

export const REGULATED_CATEGORY_LABELS: Record<RegulatedCategory, string> = {
  general: '일반 상품',
  pharmaceutical: '의약품',
  quasi_drug: '의약외품',
  medical_device: '의료기기',
  health_functional_food: '건강기능식품',
  food: '식품',
  cosmetics: '화장품',
  other_regulated: '기타 법정 관리 품목',
};

export const REGULATED_CATEGORY_ORDER: RegulatedCategory[] = [
  'general',
  'pharmaceutical',
  'quasi_drug',
  'medical_device',
  'health_functional_food',
  'food',
  'cosmetics',
  'other_regulated',
];

export const REGULATED_CATEGORY_STATUS_LABELS: Record<RegulatedCategoryStatus, string> = {
  not_requested: '미신청',
  submitted: '서류 제출',
  approved: '등록 가능',
  rejected: '반려',
  needs_update: '보완 필요',
  suspended: '사용 제한',
};

export interface SupplierRegulatedCategory {
  id: string;
  category: RegulatedCategory;
  status: RegulatedCategoryStatus;
  registrationNumber: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidenceDocument: {
    id: string;
    fileName: string;
    fileSize: number | null;
    mimeType: string | null;
    createdAt: string;
  } | null;
}

export const supplierRegulatedCategoryApi = {
  async list(): Promise<SupplierRegulatedCategory[]> {
    try {
      const response = await api.get('/neture/supplier/regulated-categories');
      return response.data?.data ?? [];
    } catch (error) {
      console.warn('[Supplier Regulated Category API] Failed to list:', error);
      return [];
    }
  },

  async select(category: RegulatedCategory): Promise<{ success: boolean; error?: string; data?: SupplierRegulatedCategory }> {
    try {
      const response = await api.post('/neture/supplier/regulated-categories', { category });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async remove(category: RegulatedCategory): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/supplier/regulated-categories/${category}`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async updateRegistrationNumber(
    category: RegulatedCategory,
    registrationNumber: string,
  ): Promise<{ success: boolean; error?: string; data?: SupplierRegulatedCategory }> {
    try {
      const response = await api.patch(`/neture/supplier/regulated-categories/${category}`, { registrationNumber });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  // WO-O4O-NETURE-SUPPLIER-REGULATED-CATEGORY-NUMBER-FIRST-V1: 번호만으로도 검토 요청(파일 선택)
  async submitForReview(
    category: RegulatedCategory,
  ): Promise<{ success: boolean; error?: string; data?: SupplierRegulatedCategory }> {
    try {
      const response = await api.post(`/neture/supplier/regulated-categories/${category}/submit`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async uploadEvidence(
    category: RegulatedCategory,
    file: File,
  ): Promise<{ success: boolean; error?: string; data?: SupplierRegulatedCategory }> {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post(`/neture/supplier/regulated-categories/${category}/document`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async downloadEvidence(category: RegulatedCategory): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/supplier/regulated-categories/${category}/document/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      console.warn('[Supplier Regulated Category API] Failed to download evidence:', error);
      return null;
    }
  },
};

// ==================== Supplier Recruitment Creation API ====================
// WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1

// WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (운영 상태 status 와 분리)
export type RecruitmentExposureStatus = 'pending' | 'approved' | 'rejected';

export interface SupplierRecruitment {
  id: string;
  productId: string;
  productName: string;
  serviceId: string;
  serviceName: string;
  commissionRate: number;
  consumerPrice: number;
  status: string;
  // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (읽기 전용 표시)
  exposureStatus: RecruitmentExposureStatus;
  exposureReviewedAt: string | null;
  exposureReviewedBy: string | null;
  exposureReviewNote: string | null;
  createdAt: string;
  applications: { total: number; pending: number; approved: number; rejected: number };
}

// WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
export interface RecruitmentApplication {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  organizationName: string;
  status: string;
  appliedAt: string;
  decidedAt: string | null;
  reason: string;
  // WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1: 참여 해지 파생 상태
  participationTerminated?: boolean;
}

export interface RecruitmentDetail {
  recruitment: {
    id: string;
    productId: string;
    productName: string;
    serviceId: string;
    serviceName: string;
    commissionRate: number;
    consumerPrice: number;
    status: string;
    // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (읽기 전용 표시)
    exposureStatus: RecruitmentExposureStatus;
    exposureReviewedAt: string | null;
    exposureReviewedBy: string | null;
    exposureReviewNote: string | null;
    createdAt: string;
  };
  applications: RecruitmentApplication[];
}

export const supplierRecruitmentApi = {
  // WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1
  async listMine(): Promise<SupplierRecruitment[]> {
    try {
      const response = await api.get('/neture/partner/recruitments/mine');
      return response.data?.data ?? [];
    } catch (error) {
      console.warn('[Supplier Recruitment API] Failed to list:', error);
      return [];
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
  async getApplications(recruitmentId: string): Promise<RecruitmentDetail | null> {
    try {
      const response = await api.get(`/neture/partner/recruitments/${recruitmentId}/applications`);
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Supplier Recruitment API] Failed to fetch applications:', error);
      return null;
    }
  },

  // 기존 승인/반려 엔드포인트 재사용 (ownership + C bridge backend 처리)
  async approveApplication(applicationId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.post(`/neture/partner/applications/${applicationId}/approve`);
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'APPROVE_FAILED', message: d?.message };
    }
  },

  async rejectApplication(applicationId: string, reason?: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.post(`/neture/partner/applications/${applicationId}/reject`, { reason });
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'REJECT_FAILED', message: d?.message };
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1: 승인 판매자 참여 해지
  async terminateApplication(applicationId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.post(`/neture/partner/applications/${applicationId}/terminate`);
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'TERMINATE_FAILED', message: d?.message };
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1: 모집 마감(신규 신청 차단)
  async close(recruitmentId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.patch(`/neture/partner/recruitments/${recruitmentId}/close`);
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'CLOSE_FAILED', message: d?.message };
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1: 모집 재개(다시 신규 신청 가능)
  async reopen(recruitmentId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.patch(`/neture/partner/recruitments/${recruitmentId}/reopen`);
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'REOPEN_FAILED', message: d?.message };
    }
  },

  async create(input: {
    masterId: string;
    // WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1:
    //   serviceKeys[](복수) 우선. serviceKey(단수)는 하위호환.
    serviceKey?: string;
    serviceKeys?: string[];
    commissionRate?: number;
    consumerPrice?: number;
    shopUrl?: string;
    imageUrl?: string;
  }): Promise<{ success: boolean; error?: string; message?: string; data?: { id: string; recruitments?: Array<{ id: string; serviceId: string; status: string }> } }> {
    try {
      const response = await api.post('/neture/partner/recruitments', input);
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'CREATE_FAILED', message: d?.message || extractApiError(error) };
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

// WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1
export interface ProposableOffer {
  id: string;
  masterId: string;
  title: string;
  supplierName: string;
  price: number | null;
  approvalStatus: string;
}

export interface ProposeOfferResult {
  id: string;
  offerId: string;
  title: string;
  supplierName: string;
  status: 'pending' | 'approved';
  isActive: boolean;
  proposedAt: string;
}

// WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1: serviceKey 필드 추가 (KPA + K-Cos 통합)
// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 이벤트 조건 필드 추가
export interface MyEventOfferProposal {
  id: string;
  offerId: string;
  /** OPL service_key (kpa-groupbuy / k-cosmetics-event-offer) */
  serviceKey: string;
  title: string;
  supplierName: string;
  /** 일반 공급가 (price_general) */
  price: number | null;
  /** WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 이벤트 전용 가격/기간/수량 */
  eventPrice: number | null;
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
  isActive: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  proposedAt: string;
  decidedAt: string | null;
  rejectedReason: string | null;
}

// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: supplier 가 제안 시 입력하는 이벤트 조건
export interface ProposeEventConditions {
  eventPrice: number;
  /** ISO date string (YYYY-MM-DD or full ISO) */
  startAt: string;
  endAt: string;
  totalQuantity?: number | null;
  perOrderLimit?: number | null;
  perStoreLimit?: number | null;
}

// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
export type ProposalStatus =
  | 'created'
  | 'already_proposed'
  | 'offer_not_found'
  | 'offer_not_owned'
  | 'org_unavailable'
  | 'unsupported'
  | 'internal_error';

export interface PerServiceProposalResult {
  targetServiceKey: string;
  eventOfferServiceKey: string | null;
  status: ProposalStatus;
  listingId: string | null;
  message?: string;
}

export interface MultiServiceProposalResult {
  offerId: string;
  results: PerServiceProposalResult[];
}

/** Backend 응답 에러 코드 (supplier-offers.controller.ts ERROR_CODES와 동일) */
export type SupplierEventOfferErrorCode =
  | 'INTERNAL_ERROR'
  | 'SUPPLIER_NOT_FOUND'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_NOT_OWNED'
  | 'ALREADY_PROPOSED'
  | 'ORG_UNAVAILABLE'
  | 'INVALID_PARAMS';

/**
 * 공급자 KPA 이벤트/특가 API
 * - GET  /api/v1/kpa/supplier/event-offers/stats — 성과 집계
 * - GET  /api/v1/kpa/supplier/my-offers          — 제안 가능한 SPO 목록 (WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1)
 * - POST /api/v1/kpa/supplier/event-offers       — Event Offer 제안 (WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1)
 */
export const supplierKpaEventOfferApi = {
  getStats: (): Promise<SupplierEventOfferStats> =>
    api
      .get<{ success: boolean; data: SupplierEventOfferStats }>(
        '/kpa/supplier/event-offers/stats'
      )
      .then((res: { data: { success: boolean; data: SupplierEventOfferStats } }) => res.data.data),

  listMyOffers: (): Promise<ProposableOffer[]> =>
    api
      .get<{ success: boolean; data: { offers: ProposableOffer[]; supplierId: string } }>(
        '/kpa/supplier/my-offers'
      )
      .then(
        (res: { data: { success: boolean; data: { offers: ProposableOffer[]; supplierId: string } } }) =>
          res.data.data.offers || [],
      ),

  proposeOffer: (offerId: string): Promise<ProposeOfferResult> =>
    api
      .post<{ success: boolean; data: ProposeOfferResult }>(
        '/kpa/supplier/event-offers',
        { offerId }
      )
      .then(
        (res: { data: { success: boolean; data: ProposeOfferResult } }) => res.data.data,
      ),

  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1 + WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  /** 내가 제안한 OPL 목록 — KPA + K-Cos 통합 (serviceKey로 구분) */
  listMyProposals: (): Promise<MyEventOfferProposal[]> =>
    api
      .get<{ success: boolean; data: MyEventOfferProposal[] }>(
        '/neture/supplier/event-offer-proposals'
      )
      .then(
        (res: { data: { success: boolean; data: MyEventOfferProposal[] } }) =>
          res.data.data || [],
      ),

  // WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: eventConditions 파라미터 추가
  /**
   * 단일 SPO를 여러 대상 서비스(KPA / K-Cos)로 동시 제안.
   * 부분 실패 허용 — results 배열에서 서비스별 status 확인.
   *
   * eventConditions: 이벤트 가격/기간/수량 — 각 서비스 row 에 동일 적용.
   *   - 일반 공급가/소비자가는 절대 변경되지 않는다 (정책).
   *   - eventPrice <= 일반 공급가, startAt < endAt — 백엔드 추가 검증.
   */
  proposeEventOfferToServices: (
    offerId: string,
    serviceKeys: string[],
    eventConditions: ProposeEventConditions,
  ): Promise<MultiServiceProposalResult> =>
    api
      .post<{ success: boolean; data: MultiServiceProposalResult }>(
        '/neture/supplier/event-offer-proposals',
        {
          offerId,
          serviceKeys,
          eventPrice: eventConditions.eventPrice,
          startAt: eventConditions.startAt,
          endAt: eventConditions.endAt,
          totalQuantity: eventConditions.totalQuantity ?? null,
          perOrderLimit: eventConditions.perOrderLimit ?? null,
          perStoreLimit: eventConditions.perStoreLimit ?? null,
        },
      )
      .then(
        (res: { data: { success: boolean; data: MultiServiceProposalResult } }) =>
          res.data.data,
      ),
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

/* ──────────────────────────────────────────────────────────────────────────
 * WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3
 * 검증 통과 bulk row → ProductCandidate(안전 후보) 제출. ProductMaster 직접 생성 아님.
 * ────────────────────────────────────────────────────────────────────────── */

export interface BulkCandidateRowInput {
  rowNumber: number;
  fields: Record<string, string>;
  raw: Record<string, string>;
}

export interface BulkCandidateResultRow {
  rowNumber: number;
  status: 'created' | 'duplicate' | 'failed' | 'skipped' | 'review_required';
  candidateId?: string;
  message?: string;
}

export interface BulkCandidateSubmitResult {
  total: number;
  created: number;
  duplicate: number;
  failed: number;
  results: BulkCandidateResultRow[];
}

/** 검증 통과 row 를 안전 후보(ProductCandidate)로 제출. 오류 row 는 호출 전 제외할 것. */
export async function submitBulkCandidates(
  productType: string,
  rows: BulkCandidateRowInput[],
): Promise<BulkCandidateSubmitResult> {
  const res = await api.post('/neture/supplier/products/bulk-candidates', { productType, rows });
  return res.data.data as BulkCandidateSubmitResult;
}
