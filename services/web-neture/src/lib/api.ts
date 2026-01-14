/**
 * Neture API Client
 *
 * Work Order: WO-NETURE-EXTENSION-P3
 * Phase: P3 (Product Purpose Visibility)
 *
 * Simple fetch-based API client for Neture backend
 *
 * ProductPurpose 타입 추가:
 * - CATALOG: 정보 제공용
 * - APPLICATION: 신청 가능
 * - ACTIVE_SALES: 판매 중
 */

// 제품 목적 타입 (WO-NETURE-EXTENSION-P3)
export type ProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

interface Supplier {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  productCount: number;
}

interface SupplierDetail {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  description: string;
  products: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    purpose?: ProductPurpose; // WO-NETURE-EXTENSION-P3: 제품 목적 (기본값: CATALOG)
  }>;
  pricingPolicy: string;
  moq: string;
  shippingPolicy: {
    standard: string;
    island: string;
    mountain: string;
  };
  contact: {
    email: string;
    phone: string;
    website: string;
    kakao: string;
  };
}

interface PartnershipRequest {
  id: string;
  seller: {
    id: string;
    name: string;
    serviceType: string;
    storeUrl: string;
  };
  productCount: number;
  period: {
    start: string;
    end: string;
  };
  revenueStructure: string;
  status: 'OPEN' | 'MATCHED' | 'CLOSED';
}

interface PartnershipRequestDetail extends PartnershipRequest {
  products: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  promotionScope: {
    sns: boolean;
    content: boolean;
    banner: boolean;
    other: string;
  };
  contact: {
    email: string;
    phone: string;
    kakao: string;
  };
  createdAt: string;
  matchedAt: string | null;
}

/**
 * API Client
 */
export const netureApi = {
  /**
   * GET /api/v1/neture/suppliers
   */
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/suppliers`);
      if (!response.ok) {
        console.warn('[Neture API] Suppliers API not available, returning empty array');
        return [];
      }
      const data = await response.json();
      return data.suppliers || [];
    } catch (error) {
      console.warn('[Neture API] Failed to fetch suppliers:', error);
      return [];
    }
  },

  /**
   * GET /api/v1/neture/suppliers/:slug
   */
  async getSupplierBySlug(slug: string): Promise<SupplierDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/suppliers/${slug}`);
    if (!response.ok) {
      throw new Error('Failed to fetch supplier detail');
    }
    return response.json();
  },

  /**
   * GET /api/v1/neture/partnership/requests
   */
  async getPartnershipRequests(status?: 'OPEN' | 'MATCHED' | 'CLOSED'): Promise<PartnershipRequest[]> {
    try {
      const url = status
        ? `${API_BASE_URL}/api/v1/neture/partnership/requests?status=${status}`
        : `${API_BASE_URL}/api/v1/neture/partnership/requests`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[Neture API] Partnership requests API not available, returning empty array');
        return [];
      }
      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.warn('[Neture API] Failed to fetch partnership requests:', error);
      return [];
    }
  },

  /**
   * GET /api/v1/neture/partnership/requests/:id
   */
  async getPartnershipRequestById(id: string): Promise<PartnershipRequestDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch partnership request detail');
    }
    return response.json();
  },

  /**
   * POST /api/v1/neture/partnership/requests
   * Create a new partnership request (requires auth)
   */
  async createPartnershipRequest(data: {
    sellerName: string;
    sellerServiceType?: string;
    sellerStoreUrl?: string;
    periodStart?: string;
    periodEnd?: string;
    revenueStructure?: string;
    promotionSns?: boolean;
    promotionContent?: boolean;
    promotionBanner?: boolean;
    promotionOther?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactKakao?: string;
    products?: Array<{ name: string; category?: string }>;
  }): Promise<{ success: boolean; data?: { id: string; status: string; createdAt: string }; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  },
};

// CMS Content API
export const cmsApi = {
  /**
   * GET /api/v1/cms/contents?serviceKey=neture
   */
  async getContents(): Promise<CmsContent[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/cms/contents?serviceKey=neture&status=published`
      );
      if (!response.ok) {
        console.warn('[CMS API] Contents API not available, returning empty array');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[CMS API] Failed to fetch contents:', error);
      return [];
    }
  },

  /**
   * GET /api/v1/cms/contents/:id
   */
  async getContentById(id: string): Promise<CmsContent> {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/contents/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch content detail');
    }
    const result = await response.json();
    return result.data;
  },
};

interface CmsContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  status: string;
  publishedAt: string | null;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
}

// ==================== Supplier Request API (WO-NETURE-SUPPLIER-REQUEST-API-V1) ====================

export type SupplierRequestStatus = 'pending' | 'approved' | 'rejected';

interface SupplierRequest {
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

interface SupplierRequestDetail {
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
  createdAt: string;
}

export const supplierApi = {
  /**
   * GET /api/v1/neture/supplier/requests
   * 공급자에게 들어온 신청 목록 조회
   */
  async getRequests(filters?: { status?: SupplierRequestStatus; serviceId?: string }): Promise<SupplierRequest[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.serviceId) params.append('serviceId', filters.serviceId);

      const url = `${API_BASE_URL}/api/v1/neture/supplier/requests${params.toString() ? `?${params}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

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

  /**
   * GET /api/v1/neture/supplier/requests/:id
   * 신청 상세 조회
   */
  async getRequestById(id: string): Promise<SupplierRequestDetail | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch request detail:', error);
      return null;
    }
  },

  /**
   * POST /api/v1/neture/supplier/requests/:id/approve
   * 신청 승인
   */
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

  /**
   * POST /api/v1/neture/supplier/requests/:id/reject
   * 신청 거절
   */
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

  /**
   * GET /api/v1/neture/supplier/products
   * 공급자 제품 목록
   */
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

  /**
   * PATCH /api/v1/neture/supplier/products/:id
   * 제품 상태 업데이트
   */
  async updateProduct(
    id: string,
    updates: { isActive?: boolean; acceptsApplications?: boolean }
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

  /**
   * GET /api/v1/neture/supplier/orders/summary
   * 서비스별 주문 요약
   */
  async getOrdersSummary(): Promise<OrderSummary[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/orders/summary`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('[Supplier API] Orders summary API not available');
        return [];
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch orders summary:', error);
      return [];
    }
  },
};

// ==================== Additional Types ====================

export type SupplierProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: SupplierProductPurpose;
  isActive: boolean;
  acceptsApplications: boolean;
  pendingRequestCount: number;
  activeServiceCount: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderSummary {
  serviceId: string;
  serviceName: string;
  approvedSellerCount: number;
  serviceUrl: string | null;
  message: string;
}

export type {
  Supplier,
  SupplierDetail,
  PartnershipRequest,
  PartnershipRequestDetail,
  CmsContent,
  SupplierRequest,
  SupplierRequestDetail,
  SupplierProduct,
  OrderSummary,
};
