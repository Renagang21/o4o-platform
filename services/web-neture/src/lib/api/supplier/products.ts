import { api } from '../../apiClient';
import type { SupplierApprovalCounts, DistributionType, SupplierProduct } from './product.types';
import {
  SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED,
  SUPPLIER_PRODUCTS_LOAD_FAILED,
  extractApiError,
  isValidApprovalCounts,
} from './errors';

export const supplierProductsApi = {
  async getProducts(): Promise<SupplierProduct[]> {
    let response;
    try {
      response = await api.get('/neture/supplier/products');
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch products:', extractApiError(error));
      throw new Error(SUPPLIER_PRODUCTS_LOAD_FAILED);
    }
    const result = response.data;
    if (!result?.success || !Array.isArray(result.data)) {
      console.warn('[Supplier API] Unexpected products payload shape');
      throw new Error(SUPPLIER_PRODUCTS_LOAD_FAILED);
    }
    return result.data as SupplierProduct[];
  },

  // WO-NETURE-SUPPLIER-EXCEL-LIST-V1: Paginated product list
  async getProductsPaginated(params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    distributionType?: string;
    isActive?: string;
    sort?: string;
    order?: string;
    hasImage?: string;
    hasDescription?: string;
    barcodeSource?: string;
    completenessStatus?: string;
    serviceApprovalStatus?: string;
  }): Promise<{
    data: SupplierProduct[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    let response;
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
      if (params?.serviceApprovalStatus)
        sp.set('serviceApprovalStatus', params.serviceApprovalStatus);
      const qs = sp.toString() ? `?${sp}` : '';
      response = await api.get(`/neture/supplier/products${qs}`);
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch paginated products:', extractApiError(error));
      throw new Error(SUPPLIER_PRODUCTS_LOAD_FAILED);
    }

    const result = response.data;
    if (!result?.success || !Array.isArray(result.data)) {
      console.warn('[Supplier API] Unexpected paginated products payload shape');
      throw new Error(SUPPLIER_PRODUCTS_LOAD_FAILED);
    }
    // pagination 은 성공 응답의 보조 필드다. 누락 시에도 목록 자체는 유효하므로 기존 기본값을 유지한다.
    return {
      data: result.data as SupplierProduct[],
      pagination: result.pagination || {
        page: 1,
        limit: 50,
        total: result.data.length,
        totalPages: 1,
      },
    };
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
  }): Promise<SupplierApprovalCounts> {
    let response;
    try {
      response = await api.get('/neture/supplier/products/approval-counts', { params });
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch approval counts:', extractApiError(error));
      throw new Error(SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED);
    }
    const result = response.data?.data;
    if (!isValidApprovalCounts(result)) {
      console.warn('[Supplier API] Unexpected approval counts payload shape');
      throw new Error(SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED);
    }
    return result;
  },

  // WO-NETURE-SUPPLIER-EXCEL-LIST-V1: Batch update
  async batchUpdateProducts(
    updates: Array<{
      offerId: string;
      isActive?: boolean;
      isPublic?: boolean;
      distributionType?: string;
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
    }>,
  ): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
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
  async bulkDelete(
    offerIds: string[],
  ): Promise<{ deleted: number; failed: Array<{ id: string; error: string }> }> {
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
  async submitForApproval(offerIds: string[]): Promise<{
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

  /**
   * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1
   *
   * 기존 ProductMaster(Product Library 에서 선택한 masterId)에 Offer 를 직접 연결한다.
   * Master 기준정보(name/barcode/category/brand/규제)는 보내지 않는다 — 서버가 MASTER_FIELD_NOT_ALLOWED 로 거부한다.
   * 레거시 createProduct(POST /neture/supplier/products · barcode/name 재추론)는 은퇴했다.
   */
  async createOfferFromMaster(data: {
    masterId: string;
    priceGeneral?: number;
    priceGold?: number | null;
    pricePlatinum?: number | null;
    consumerReferencePrice?: number | null;
    consumerShortDescription?: string | null;
    consumerDetailDescription?: string | null;
    stockQuantity?: number;
    isFeatured?: boolean;
    isPublic?: boolean;
    serviceKeys?: string[];
  }): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    data?: { id: string; masterId: string; approvalStatus?: string };
  }> {
    try {
      const response = await api.post('/neture/supplier/products/from-master', data);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: extractApiError(error),
        message: (error as any)?.response?.data?.message,
      };
    }
  },

  /**
   * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1
   *
   * 신규/미매칭 제품 → ProductCandidate 제출(Offer · ProductMaster 생성 없음).
   * 운영자 검토·승격(Promotion Core) 후 Master 가 만들어진다. 이미지는 미디어 라이브러리에 먼저 올린 URL 만 보낸다
   * (Master 확정 전에는 ProductImage 에 쓰지 않는다 — Candidate rawPayload 에 보존).
   * 금지 키(서버 FORBIDDEN_FIELD): supplierId · distributionType · serviceKeys · stockQty/stockQuantity · lot/expiry 등.
   */
  async submitProductCandidate(data: {
    name: string;
    barcode?: string | null;
    categoryId?: string | null;
    brandId?: string | null;
    brandName?: string | null;
    manufacturerName?: string | null;
    specification?: string | null;
    originCountry?: string | null;
    regulatoryType?:
      | 'GENERAL'
      | 'COSMETIC'
      | 'HEALTH_FUNCTIONAL'
      | 'QUASI_DRUG'
      | 'MEDICAL_DEVICE'
      | 'DRUG';
    drugCategory?: 'otc' | 'rx' | null;
    regulatoryName?: string | null;
    mfdsPermitNumber?: string | null;
    imageUrl?: string | null;
    contentImageUrls?: string[];
    offerDraft?: {
      priceGeneral?: number | null;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      isFeatured?: boolean;
    };
  }): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    data?: {
      candidateId: string;
      candidateStatus: string;
      identifierType: string | null;
      identifierValue: string | null;
    };
  }> {
    try {
      const response = await api.post('/neture/supplier/product-candidates', data);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: extractApiError(error),
        message: (error as any)?.response?.data?.message,
      };
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
    },
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
    input: {
      isPublic?: boolean; serviceKeys?: string[]; defaultSupplyEnabled?: boolean; priceGeneral?: number;
      servicePrices?: Array<{ serviceKey: string; unitPrice: number }>;
    },
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
  ): Promise<{
    success: boolean;
    error?: string;
    data?: { priceGeneral: number; prices: Array<{ serviceKey: string; unitPrice: number }> };
  }> {
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
      const response = await api.patch(
        `/neture/supplier/products/${offerId}/business-content`,
        data,
      );
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },
};
