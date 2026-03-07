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

// 연락처 공개 범위 (WO-O4O-SUPPLIER-PUBLIC-CONTACT-POLICY-V1)
export type ContactVisibility = 'public' | 'partners' | 'private';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

// fetch wrapper with timeout (increased to 10s for cold-start tolerance)
const fetchWithTimeout = async (url: string, options?: RequestInit, timeout = 10000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

interface TrustSignals {
  contactCompleteness: number; // 0-4
  hasApprovedPartners: boolean;
  recentActivity: boolean;
}

type ContactHint = 'available' | 'partner_exclusive' | 'not_registered' | 'private' | 'partners_only';

interface ContactHints {
  email: ContactHint;
  phone: ContactHint;
  website: ContactHint;
  kakao: ContactHint;
}

interface Supplier {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  productCount: number;
  trustSignals?: TrustSignals;
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
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    kakao?: string | null;
  };
  contactHints?: ContactHints;
  trustSignals?: TrustSignals;
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
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/suppliers`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`[Neture API] Suppliers ${response.status}`);
    }
    const data = await response.json();
    return data.suppliers || [];
  },

  /**
   * GET /api/v1/neture/suppliers/:slug
   */
  async getSupplierBySlug(slug: string): Promise<SupplierDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/suppliers/${slug}`, {
      credentials: 'include',
    });
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

      const response = await fetchWithTimeout(url, { credentials: 'include' });
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
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests/${id}`, {
      credentials: 'include',
    });
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

// ==================== Recruiting Products API (WO-PARTNER-RECRUIT-PHASE1-V1) ====================

export interface RecruitingProduct {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  is_partner_recruiting: boolean;
  created_at: string;
}

export const recruitingApi = {
  /**
   * GET /api/v1/neture/partner/recruiting-products
   * 파트너 모집 중인 제품 조회
   */
  async getRecruitingProducts(): Promise<RecruitingProduct[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/recruiting-products`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[Neture API] Recruiting products API not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Neture API] Failed to fetch recruiting products:', error);
      return [];
    }
  },
};

// Partner Dashboard API (WO-PARTNER-DASHBOARD-PHASE1-V1)
export interface PartnerDashboardItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  price: number;
  pharmacyName?: string;
  serviceId: string;
  status: string;
  contentCount: number;
  primaryContent: {
    contentId: string;
    contentSource: string;
    title: string;
    type: string;
  } | null;
  createdAt: string;
}

// WO-PARTNER-CONTENT-LINK-PHASE1-V1
export interface BrowsableContent {
  id: string;
  title: string;
  summary: string | null;
  type: string;
  source: 'cms' | 'supplier';
  imageUrl: string | null;
  createdAt: string;
}

export interface LinkedContent {
  linkId: string;
  contentId: string;
  contentSource: 'cms' | 'supplier';
  title: string;
  type: string;
  summary: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export const partnerDashboardApi = {
  /**
   * POST /api/v1/neture/partner/dashboard/items
   * 대시보드에 제품 추가
   */
  async addItem(productId: string, serviceId?: string): Promise<{ success: boolean; already_exists?: boolean; data?: PartnerDashboardItem }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId, serviceId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to add dashboard item: ${response.status}`);
    }
    return response.json();
  },

  /**
   * GET /api/v1/neture/partner/dashboard/items
   * 내 대시보드 제품 목록 조회
   */
  async getItems(): Promise<PartnerDashboardItem[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('[Neture API] Dashboard items API not available');
      return [];
    }
    const result = await response.json();
    return result.data || [];
  },

  /**
   * PATCH /api/v1/neture/partner/dashboard/items/:id
   * 대시보드 아이템 상태 토글
   * WO-PARTNER-DASHBOARD-UX-PHASE2-V1
   */
  async toggleStatus(itemId: string, status: 'active' | 'inactive'): Promise<{ id: string; status: string; updatedAt: string }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`Failed to toggle status: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * GET /api/v1/neture/partner/contents
   * 연결 가능한 콘텐츠 탐색
   * WO-PARTNER-CONTENT-LINK-PHASE1-V1
   */
  async browseContents(source?: string): Promise<BrowsableContent[]> {
    const params = source && source !== 'all' ? `?source=${source}` : '';
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/contents${params}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('[Neture API] Browse contents API not available');
      return [];
    }
    const result = await response.json();
    return result.data || [];
  },

  /**
   * POST /api/v1/neture/partner/dashboard/items/:itemId/contents
   * 콘텐츠 연결
   */
  async linkContent(itemId: string, contentId: string, contentSource: string): Promise<{ success: boolean; already_linked?: boolean }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contentId, contentSource }),
    });
    if (!response.ok) {
      throw new Error(`Failed to link content: ${response.status}`);
    }
    return response.json();
  },

  /**
   * DELETE /api/v1/neture/partner/dashboard/items/:itemId/contents/:linkId
   * 콘텐츠 연결 해제
   */
  async unlinkContent(itemId: string, linkId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents/${linkId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to unlink content: ${response.status}`);
    }
  },

  /**
   * GET /api/v1/neture/partner/dashboard/items/:itemId/contents
   * 연결된 콘텐츠 조회
   */
  async getLinkedContents(itemId: string): Promise<LinkedContent[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('[Neture API] Linked contents API not available');
      return [];
    }
    const result = await response.json();
    return result.data || [];
  },

  /**
   * PATCH /api/v1/neture/partner/dashboard/items/:itemId/contents/reorder
   * 연결된 콘텐츠 순서 변경
   */
  async reorderContents(itemId: string, orderedIds: string[]): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      throw new Error('Failed to reorder contents');
    }
  },

  /**
   * PATCH /api/v1/neture/partner/dashboard/items/:itemId/contents/:linkId/primary
   * 대표 콘텐츠 지정
   */
  async setPrimaryContent(itemId: string, linkId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents/${linkId}/primary`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to set primary content');
    }
  },
};

// ==================== Content Asset Dashboard API (WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1) ====================

export interface DashboardAsset {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: 'draft' | 'active' | 'archived';
  sourceContentId?: string;
  copiedAt?: string;
  createdAt: string;
  viewCount?: number;
  recommendCount?: number;
  exposure?: string[];
}

export type DashboardSortType = 'recent' | 'views' | 'recommend';

export interface DashboardKpi {
  totalAssets: number;
  activeAssets: number;
  recentViewsSum: number;
  topRecommended: { id: string; title: string; recommendCount: number } | null;
}

export const contentAssetApi = {
  async getCopiedSourceIds(dashboardId: string): Promise<{ success: boolean; sourceIds: string[] }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/copied-source-ids?dashboardId=${encodeURIComponent(dashboardId)}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, sourceIds: [] };
      return response.json();
    } catch {
      return { success: false, sourceIds: [] };
    }
  },

  async listAssets(dashboardId: string, params?: {
    status?: 'draft' | 'active' | 'archived';
    sort?: DashboardSortType;
  }): Promise<{ success: boolean; data: DashboardAsset[] }> {
    try {
      const queryParams = new URLSearchParams({ dashboardId });
      if (params?.status) queryParams.set('status', params.status);
      if (params?.sort) queryParams.set('sort', params.sort);
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets?${queryParams.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, data: [] };
      return response.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getKpi(dashboardId: string): Promise<{ success: boolean; data: DashboardKpi }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/kpi?dashboardId=${encodeURIComponent(dashboardId)}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, data: { totalAssets: 0, activeAssets: 0, recentViewsSum: 0, topRecommended: null } };
      return response.json();
    } catch {
      return { success: false, data: { totalAssets: 0, activeAssets: 0, recentViewsSum: 0, topRecommended: null } };
    }
  },

  async updateAsset(id: string, data: {
    dashboardId: string;
    title?: string;
    description?: string;
  }): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error('Failed to update asset');
    return response.json();
  },

  async publishAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}/publish`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ dashboardId }) }
    );
    if (!response.ok) throw new Error('Failed to publish asset');
    return response.json();
  },

  async archiveAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}/archive`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ dashboardId }) }
    );
    if (!response.ok) throw new Error('Failed to archive asset');
    return response.json();
  },

  async deleteAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}?dashboardId=${encodeURIComponent(dashboardId)}`,
      { method: 'DELETE', credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to delete asset');
    return response.json();
  },

  async getSupplierSignal(): Promise<{ success: boolean; hasApprovedSupplier: boolean }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/supplier-signal`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, hasApprovedSupplier: false };
      return response.json();
    } catch {
      return { success: false, hasApprovedSupplier: false };
    }
  },
};

// CMS Content API (APP-CONTENT Phase 2 → Phase 3A: 추천/조회수/페이지네이션)
export const cmsApi = {
  /**
   * GET /api/v1/neture/content
   * Phase 3A: 서버사이드 pagination + 추천 정보 포함
   */
  async getContents(params?: {
    type?: string;
    sort?: 'latest' | 'featured' | 'views';
    page?: number;
    limit?: number;
  }): Promise<{ data: CmsContent[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.append('type', params.type);
      if (params?.sort) searchParams.append('sort', params.sort);
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      const qs = searchParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/neture/content${qs ? `?${qs}` : ''}`
      );
      if (!response.ok) {
        console.warn('[CMS API] Contents API not available, returning empty');
        return { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
      return {
        data: result.data || [],
        pagination: result.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.warn('[CMS API] Failed to fetch contents:', error);
      return { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    }
  },

  /**
   * GET /api/v1/neture/content/:id
   */
  async getContentById(id: string): Promise<CmsContent> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/content/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch content detail');
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * POST /api/v1/neture/content/:id/recommend
   * Phase 3A: 추천 토글
   */
  async toggleRecommend(id: string): Promise<{ recommendCount: number; isRecommendedByMe: boolean }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/content/${id}/recommend`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to toggle recommendation');
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * POST /api/v1/neture/content/:id/view
   * Phase 3A: 조회수 증가
   */
  async trackView(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/neture/content/${id}/view`, { method: 'POST' });
    } catch {
      // 조회수 실패는 무시
    }
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
  isOperatorPicked?: boolean;
  sortOrder: number;
  metadata?: Record<string, any> | null;
  createdAt: string;
  /** Phase 3A */
  viewCount?: number;
  recommendCount?: number;
  isRecommendedByMe?: boolean;
}

// ==================== Supplier Request API (WO-NETURE-SUPPLIER-REQUEST-API-V1) ====================

export type SupplierRequestStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked' | 'expired';

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
  suspendedAt: string | null;
  revokedAt: string | null;
  expiredAt: string | null;
  relationNote: string | null;
  effectiveUntil: string | null;
  createdAt: string;
}

// WO-O4O-NETURE-LIBRARY-UI-V1
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

  // WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1

  /**
   * POST /api/v1/neture/supplier/requests/:id/suspend
   * 공급 일시 중단
   */
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

  /**
   * POST /api/v1/neture/supplier/requests/:id/reactivate
   * 공급 재활성화
   */
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

  /**
   * POST /api/v1/neture/supplier/requests/:id/revoke
   * 공급 종료
   */
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
   * POST /api/v1/neture/supplier/products
   * 바코드 기반 신규 상품 등록
   */
  async createProduct(data: {
    barcode: string;
    distributionType?: string;
    manualData?: Record<string, any>;
    priceGeneral?: number;
    priceGold?: number | null;
    pricePlatinum?: number | null;
    consumerReferencePrice?: number | null;
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

  /**
   * PATCH /api/v1/neture/supplier/products/:id
   * 제품 상태 업데이트
   */
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

  /**
   * GET /api/v1/neture/supplier/orders/summary
   * 서비스별 주문 요약 (P1 §3.3 정밀화)
   */
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

  // ==================== Library API (WO-O4O-NETURE-LIBRARY-UI-V1) ====================

  /**
   * GET /api/v1/neture/library
   * 공급자 자료실 목록 조회
   */
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

  /**
   * POST /api/v1/neture/library
   * 자료 등록
   */
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

  /**
   * PATCH /api/v1/neture/library/:id
   * 자료 수정
   */
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

  /**
   * DELETE /api/v1/neture/library/:id
   * 자료 삭제
   */
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

  // WO-O4O-SUPPLIER-ORDER-PROCESSING-V1: 공급자 주문 관리

  /** GET /api/v1/neture/supplier/orders — 공급자 주문 목록 */
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

  /** GET /api/v1/neture/supplier/orders/:id — 공급자 주문 상세 */
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

  /** PATCH /api/v1/neture/supplier/orders/:id/status — 주문 상태 변경 */
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

  /** GET /api/v1/neture/supplier/orders/kpi — 주문 KPI (WO-O4O-SUPPLIER-DASHBOARD-V1) */
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

  // WO-O4O-INVENTORY-ENGINE-V1: 재고 관리

  /** GET /api/v1/neture/supplier/inventory — 재고 목록 */
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

  /** GET /api/v1/neture/supplier/inventory/:offerId — 재고 상세 */
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

  /** PATCH /api/v1/neture/supplier/inventory/:offerId — 재고 수정 */
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

  // WO-O4O-SHIPMENT-ENGINE-V1: 배송 관리

  /** POST /api/v1/neture/supplier/orders/:orderId/shipment — 송장 등록 */
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

  /** GET /api/v1/neture/supplier/orders/:orderId/shipment — 배송 조회 */
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

  /** PATCH /api/v1/neture/supplier/shipments/:id — 배송 상태 변경 */
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

  // WO-O4O-SETTLEMENT-ENGINE-V1: 정산 관리

  /** GET /api/v1/neture/supplier/settlements — 정산 목록 */
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

  /** GET /api/v1/neture/supplier/settlements/:id — 정산 상세 */
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

  /** GET /api/v1/neture/supplier/settlements/kpi — 정산 KPI */
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

// ==================== Seller API (WO-S2S-FLOW-RECOVERY-PHASE1-V1) ====================

/**
 * 판매자(Seller)가 공급자에게 취급 요청을 보내는 API
 */
export interface SellerApprovedProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  productCategory: string;
  productPurpose: string;
  serviceId: string;
  serviceName: string;
  approvedAt: string;
}

export const sellerApi = {
  /**
   * POST /api/v1/neture/supplier/requests
   * 판매자가 공급자 상품에 대한 취급 요청 생성
   */
  async createHandlingRequest(data: {
    supplierId: string;
    productId: string;
    productName: string;
    productCategory?: string;
    productPurpose?: string;
    serviceId: string;
    serviceName: string;
  }): Promise<{ success: boolean; error?: string; data?: { id: string; status: string; createdAt: string } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests`, {
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

  /**
   * GET /api/v1/neture/seller/my-products
   * 판매자의 승인된 취급 상품 목록 조회 (WO-S2S-FLOW-RECOVERY-PHASE3-V1 T2)
   */
  async getMyApprovedProducts(): Promise<{
    success: boolean;
    data?: SellerApprovedProduct[];
    error?: string;
  }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/seller/my-products`, {
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  /**
   * GET /api/v1/neture/seller/available-supply-products
   * 판매자용 공급 가능 제품 (PUBLIC + PRIVATE 배정)
   * WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1
   */
  async getAvailableSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/seller/available-supply-products`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Seller API] Failed to fetch available supply products:', error);
      return [];
    }
  },
};

// ==================== Admin Operator API (WO-NETURE-OPERATOR-UI-REALIZATION-V1) ====================

export interface NetureOperatorInfo {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export const adminOperatorApi = {
  async getOperators(includeInactive = false): Promise<NetureOperatorInfo[]> {
    try {
      const qs = includeInactive ? '?includeInactive=true' : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/operators${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        console.warn('[Admin API] Operators API not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch operators:', error);
      return [];
    }
  },

  async deactivateOperator(userId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/operators/${userId}/deactivate`,
        { method: 'PATCH', credentials: 'include' },
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  async reactivateOperator(userId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/operators/${userId}/reactivate`,
        { method: 'PATCH', credentials: 'include' },
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};

// ==================== Admin Supplier API (WO-O4O-ADMIN-UI-COMPLETION-V1) ====================

export interface AdminSupplier {
  id: string;
  name: string;
  representativeName: string;
  status: string;
  email: string;
  createdAt: string;
}

export const adminSupplierApi = {
  async getSuppliers(status?: string): Promise<AdminSupplier[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch suppliers:', error);
      return [];
    }
  },

  async getPendingSuppliers(): Promise<AdminSupplier[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/pending`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch pending suppliers:', error);
      return [];
    }
  },

  async approveSupplier(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/${id}/approve`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },

  async rejectSupplier(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async deactivateSupplier(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/${id}/deactivate`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Settlement API (WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1) ====================

const ADMIN_SETTLEMENT_KPI_DEFAULT: AdminSettlementKpi = {
  calculated_count: 0, calculated_amount: 0,
  approved_count: 0, approved_amount: 0,
  paid_count: 0, paid_amount: 0,
};

export const adminSettlementApi = {
  /** GET /api/v1/neture/admin/settlements — 운영자 정산 목록 */
  async getSettlements(
    params?: { page?: number; limit?: number; status?: SettlementStatus }
  ): Promise<SettlementsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Admin Settlement API] Failed to fetch settlements:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  /** GET /api/v1/neture/admin/settlements/kpi — 운영자 KPI */
  async getKpi(): Promise<AdminSettlementKpi> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/kpi`,
        { credentials: 'include' },
      );
      if (!response.ok) return ADMIN_SETTLEMENT_KPI_DEFAULT;
      const result = await response.json();
      return result.data || ADMIN_SETTLEMENT_KPI_DEFAULT;
    } catch {
      return ADMIN_SETTLEMENT_KPI_DEFAULT;
    }
  },

  /** GET /api/v1/neture/admin/settlements/:id — 운영자 정산 상세 */
  async getDetail(id: string): Promise<SettlementDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },

  /** POST /api/v1/neture/admin/settlements/calculate — 정산 일괄 계산 */
  async calculate(periodStart: string, periodEnd: string): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
        },
      );
      return await response.json();
    } catch { return { success: false, error: 'NETWORK_ERROR' }; }
  },

  /** PATCH /api/v1/neture/admin/settlements/:id/approve — 정산 승인 */
  async approve(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}/approve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  /** PATCH /api/v1/neture/admin/settlements/:id/pay — 정산 지급 처리 */
  async pay(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}/pay`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  /** PATCH /api/v1/neture/admin/settlements/:id/status — 정산 취소 */
  async cancel(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'cancelled', notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Product API (WO-O4O-ADMIN-UI-COMPLETION-V1) ====================

export interface AdminProduct {
  id: string;
  masterId: string;
  marketingName: string;
  supplierName: string;
  category: string;
  distributionType: string;
  approvalStatus: string;
  isActive: boolean;
  createdAt: string;
}

export const adminProductApi = {
  async getProducts(status?: string): Promise<AdminProduct[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch products:', error);
      return [];
    }
  },

  async getPendingProducts(): Promise<AdminProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products/pending`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch pending products:', error);
      return [];
    }
  },

  async approveProduct(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products/${id}/approve`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },

  async rejectProduct(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Master API (WO-O4O-ADMIN-UI-COMPLETION-V1) ====================

export interface AdminMaster {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  marketingName: string;
  brandName: string | null;
  manufacturerName: string;
  mfdsPermitNumber: string | null;
  isMfdsVerified: boolean;
  categoryId: string | null;
  brandId: string | null;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  createdAt: string;
}

export const adminMasterApi = {
  async getMasters(): Promise<AdminMaster[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch masters:', error);
      return [];
    }
  },

  async getMasterByBarcode(barcode: string): Promise<AdminMaster | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters/barcode/${encodeURIComponent(barcode)}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Admin API] Failed to fetch master by barcode:', error);
      return null;
    }
  },

  async resolveMaster(data: { barcode: string; manualData?: Record<string, unknown> }): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async updateMaster(id: string, data: Partial<AdminMaster>): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Public Product API (WO-O4O-SUPPLIER-PRODUCT-CREATE-PAGE-V1) ====================

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  children: CategoryTreeItem[];
}

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  manufacturerName: string | null;
  countryOfOrigin: string | null;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export const productApi = {
  async getCategories(): Promise<CategoryTreeItem[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/categories`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch categories:', error);
      return [];
    }
  },

  async getBrands(): Promise<BrandItem[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/brands`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch brands:', error);
      return [];
    }
  },

  async getMasterByBarcode(barcode: string): Promise<AdminMaster | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/masters/barcode/${encodeURIComponent(barcode)}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Product API] Failed to fetch master by barcode:', error);
      return null;
    }
  },

  async getProductImages(masterId: string): Promise<ProductImage[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/${masterId}/images`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch product images:', error);
      return [];
    }
  },

  async uploadProductImage(masterId: string, file: File): Promise<{ success: boolean; data?: ProductImage; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/${masterId}/images`,
        { method: 'POST', credentials: 'include', body: formData },
        30000,
      );
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async setPrimaryImage(imageId: string, masterId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/images/${imageId}/primary`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ masterId }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  async deleteProductImage(imageId: string, masterId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/images/${imageId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ masterId }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};

// ==================== Admin Service Approval API (WO-O4O-ADMIN-UI-COMPLETION-V1) ====================

export interface ServiceApproval {
  id: string;
  productName: string;
  supplierName: string;
  sellerOrg: string;
  serviceId: string;
  status: string;
  requestedAt: string;
  decidedAt?: string;
  rejectReason?: string;
}

export const adminServiceApprovalApi = {
  async getServiceApprovals(status?: string): Promise<ServiceApproval[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch service approvals:', error);
      return [];
    }
  },

  async approveServiceApproval(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals/${id}/approve`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },

  async rejectServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async revokeServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals/${id}/revoke`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Registration API (WO-O4O-ADMIN-UI-COMPLETION-V1) ====================

export const adminRegistrationApi = {
  async getRequests(filters?: { status?: string }): Promise<any[]> {
    try {
      const qs = filters?.status ? `?status=${filters.status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/requests${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch registration requests:', error);
      return [];
    }
  },
};

// ==================== Catalog Import API (WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1) ====================

export const catalogImportApi = {
  async uploadFile(file: File, extensionKey: string, supplierId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extension_key', extensionKey);
    formData.append('supplier_id', supplierId);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs`,
      { method: 'POST', credentials: 'include', body: formData },
      30000,
    );
    return response.json();
  },

  async listJobs(supplierId?: string): Promise<any> {
    const qs = supplierId ? `?supplier_id=${supplierId}` : '';
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs${qs}`,
      { credentials: 'include' },
    );
    return response.json();
  },

  async getJob(jobId: string): Promise<any> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs/${jobId}`,
      { credentials: 'include' },
    );
    return response.json();
  },

  async validateJob(jobId: string): Promise<any> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs/${jobId}/validate`,
      { method: 'POST', credentials: 'include' },
    );
    return response.json();
  },

  async applyJob(jobId: string, supplierId: string): Promise<any> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs/${jobId}/apply`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: supplierId }),
      },
    );
    return response.json();
  },
};

// ==================== Additional Types ====================

export type SupplierProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

export type DistributionType = 'PUBLIC' | 'PRIVATE';

interface SupplierProduct {
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
  // WO-O4O-SUPPLIER-PRODUCTS-PAGE-V1
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

// P1 §3.3: Enhanced order summary types
interface ServiceSummary {
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

interface OrderSummaryResponse {
  services: ServiceSummary[];
  totalApprovedSellers: number;
  totalPendingRequests: number;
}

// Legacy type for backwards compatibility
interface OrderSummary {
  serviceId: string;
  serviceName: string;
  approvedSellerCount: number;
  serviceUrl: string | null;
  message: string;
}

// ==================== Dashboard Summary API ====================

// Supplier Dashboard Summary Types
interface SupplierDashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  recentApprovals: number;
  totalProducts: number;
  activeProducts: number;
  totalContents: number;
  publishedContents: number;
  connectedServices: number;
}

interface ServiceStat {
  serviceId: string;
  serviceName: string;
  pending: number;
  approved: number;
  rejected: number;
}

interface RecentActivity {
  id: string;
  type: string;
  sellerName: string;
  productName: string;
  serviceName: string;
  timestamp: string;
}

interface SupplierDashboardSummary {
  stats: SupplierDashboardStats;
  serviceStats: ServiceStat[];
  recentActivity: RecentActivity[];
}

// Admin/Operator Dashboard Summary Types
interface AdminDashboardStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalPartnershipRequests: number;
  openPartnershipRequests: number;
  totalContents: number;
  publishedContents: number;
}

interface ServiceStatus {
  serviceId: string;
  serviceName: string;
  suppliers: number;
  partners: number;
  status: string;
}

interface RecentApplication {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
}

interface RecentActivityItem {
  id: string;
  type: string;
  text: string;
  time: string;
}

// APP Summary types for operator dashboard
interface AppContentSummary {
  totalPublished: number;
  recentItems: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    isPinned: boolean;
    publishedAt: string | null;
    createdAt: string;
  }>;
}

interface AppSignageSummary {
  totalMedia: number;
  totalPlaylists: number;
  recentMedia: Array<{
    id: string;
    name: string;
    mediaType: string;
    url: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    metadata: Record<string, unknown>;
  }>;
  recentPlaylists: Array<{
    id: string;
    name: string;
    description: string | null;
    itemCount: number;
    totalDuration: number;
  }>;
}

interface AppForumSummary {
  totalPosts: number;
  recentPosts: Array<{
    id: string;
    title: string;
    authorName: string | null;
    createdAt: string;
    categoryName: string | null;
  }>;
}

interface AdminDashboardSummary {
  stats: AdminDashboardStats;
  content?: AppContentSummary;
  signage?: AppSignageSummary;
  forum?: AppForumSummary;
  serviceStatus: ServiceStatus[];
  recentApplications: RecentApplication[];
  recentActivities: RecentActivityItem[];
}

// Partner Dashboard Summary Types
interface PartnerDashboardStats {
  totalRequests: number;
  openRequests: number;
  matchedRequests: number;
  closedRequests: number;
  connectedServiceCount: number;
  totalSupplierCount: number;
}

interface ConnectedService {
  serviceId: string;
  serviceName: string;
  supplierCount: number;
  lastActivity: string;
}

interface Notification {
  type: string;
  text: string;
  link: string;
}

interface PartnerDashboardSummary {
  stats: PartnerDashboardStats;
  connectedServices: ConnectedService[];
  notifications: Notification[];
}

// Dashboard API
export const dashboardApi = {
  /**
   * GET /api/v1/neture/supplier/dashboard/summary
   * 공급자 대시보드 통계 요약
   */
  async getSupplierDashboardSummary(): Promise<SupplierDashboardSummary | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/dashboard/summary`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('[Dashboard API] Supplier dashboard summary not available');
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch supplier dashboard summary:', error);
      return null;
    }
  },

  /**
   * GET /api/v1/neture/admin/dashboard/summary
   * 운영자/관리자 대시보드 통계 요약
   */
  async getAdminDashboardSummary(): Promise<AdminDashboardSummary | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/admin/dashboard/summary`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('[Dashboard API] Admin dashboard summary not available');
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch admin dashboard summary:', error);
      return null;
    }
  },

  /**
   * GET /api/v1/neture/partner/dashboard/summary
   * 파트너 대시보드 통계 요약
   */
  /**
   * 공급자 행동 신호: 승인된 판매자 파트너십 존재 여부
   */
  async getSellerSignal(): Promise<{ success: boolean; hasApprovedSeller: boolean }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/seller-signal`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, hasApprovedSeller: false };
      return response.json();
    } catch {
      return { success: false, hasApprovedSeller: false };
    }
  },

  async getPartnerDashboardSummary(): Promise<PartnerDashboardSummary | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/partner/dashboard/summary`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('[Dashboard API] Partner dashboard summary not available');
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch partner dashboard summary:', error);
      return null;
    }
  },
};

// ==================== Operator Supply API (WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1) ====================

interface OperatorSupplyProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  distributionType?: DistributionType;
  supplierId: string;
  supplierName: string;
  supplyStatus: 'available' | 'pending' | 'approved' | 'rejected';
  requestId: string | null;
  rejectReason: string | null;
  // WO-O4O-STORE-CART-PAGE-V1: 가격/이미지/규격/바코드
  priceGeneral: number;
  consumerReferencePrice: number | null;
  approvalStatus: string;
  barcode: string;
  specification: string | null;
  primaryImageUrl: string | null;
}

const operatorSupplyApi = {
  async getSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/operator/supply-products`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        console.warn('[Operator API] Supply products not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Operator API] Failed to fetch supply products:', error);
      return [];
    }
  },

  async createSupplyRequest(data: {
    supplierId: string;
    productId: string;
    productName: string;
    serviceId: string;
    serviceName: string;
  }): Promise<{ success: boolean; error?: string; existingStatus?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.status === 409) {
      return { success: false, error: 'DUPLICATE_REQUEST', existingStatus: result.existingStatus };
    }

    if (!response.ok) {
      return { success: false, error: result.error || 'UNKNOWN_ERROR' };
    }

    return { success: true };
  },
};

export type {
  ContactHint,
  ContactHints,
  TrustSignals,
  Supplier,
  SupplierDetail,
  PartnershipRequest,
  PartnershipRequestDetail,
  CmsContent,
  SupplierRequest,
  SupplierRequestDetail,
  SupplierProduct,
  OrderSummary,
  OrderSummaryResponse,
  ServiceSummary,
  SupplierDashboardSummary,
  SupplierDashboardStats,
  ServiceStat,
  RecentActivity,
  AdminDashboardSummary,
  AdminDashboardStats,
  AppContentSummary,
  AppSignageSummary,
  AppForumSummary,
  ServiceStatus,
  RecentApplication,
  RecentActivityItem,
  PartnerDashboardSummary,
  PartnerDashboardStats,
  ConnectedService,
  Notification,
  OperatorSupplyProduct,
  PartnerRecruitment,
};

export { operatorSupplyApi };

// ==================== Supplier Profile API ====================

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

// Profile Completeness (WO-O4O-SUPPLIER-PROFILE-COMPLETENESS-V1)
export interface ProfileCompleteness {
  total: number;
  completed: number;
  missing: string[];
}

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

// ==================== Partner Recruitment API (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

interface PartnerRecruitment {
  id: string;
  productId: string;
  productName: string;
  manufacturer: string;
  consumerPrice: number;
  commissionRate: number;
  sellerId: string;
  sellerName: string;
  shopUrl: string;
  serviceName: string;
  serviceId: string;
  imageUrl: string;
  status: 'recruiting' | 'closed';
}

export const partnerRecruitmentApi = {
  async getRecruitments(status?: string): Promise<PartnerRecruitment[]> {
    const url = status
      ? `${API_BASE_URL}/api/v1/neture/partner/recruitments?status=${status}`
      : `${API_BASE_URL}/api/v1/neture/partner/recruitments`;
    const response = await fetchWithTimeout(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`[Recruitment API] ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  async apply(recruitmentId: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partner/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ recruitmentId }),
    });
    const result = await response.json();
    if (response.status === 409) {
      return { success: false, error: 'DUPLICATE_APPLICATION' };
    }
    if (!response.ok) {
      return { success: false, error: result.error || 'UNKNOWN_ERROR' };
    }
    return { success: true };
  },
};

// ==================== Store API (WO-O4O-STORE-CART-PAGE-V1) ====================

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
}

// WO-O4O-STORE-ORDERS-PAGE-V1: 주문 타입

export interface StoreOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: any | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: Record<string, any> | null;
  // WO-O4O-STORE-ORDER-DETAIL-PAGE-V1: enriched fields
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
  // WO-O4O-STORE-ORDER-DETAIL-PAGE-V1: 배송 정보
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

// WO-O4O-SUPPLIER-ORDER-PROCESSING-V1: 공급자 주문 목록 타입

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

// WO-O4O-SUPPLIER-DASHBOARD-V1: 공급자 주문 KPI

export interface SupplierOrderKpi {
  today_orders: number;
  pending_processing: number;
  pending_shipping: number;
  total_orders: number;
}

// WO-O4O-INVENTORY-ENGINE-V1: 재고 관리

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

// WO-O4O-SHIPMENT-ENGINE-V1: 배송 관리

export interface Shipment {
  id: string;
  order_id: string;
  supplier_id: string;
  carrier_code: string;
  carrier_name: string;
  tracking_number: string;
  status: string; // preparing | shipped | in_transit | delivered
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

// WO-O4O-SETTLEMENT-ENGINE-V1: 정산 관리

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

// WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1: Admin Settlement KPI

export interface AdminSettlementKpi {
  calculated_count: number;
  calculated_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_count: number;
  paid_amount: number;
}

export const storeApi = {
  /** POST /api/v1/neture/seller/orders — B2B 주문 생성 (6-gate 서버 검증) */
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

  /** GET /api/v1/neture/seller/orders — 주문 목록 (WO-O4O-STORE-ORDERS-PAGE-V1) */
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

  /** GET /api/v1/neture/seller/orders/:orderId/shipment — 배송 조회 (WO-O4O-SHIPMENT-ENGINE-V1) */
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

  /** GET /api/v1/neture/seller/orders/:id — 주문 상세 (WO-O4O-STORE-ORDERS-PAGE-V1) */
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
};
