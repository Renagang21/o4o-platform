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
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/suppliers`);
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

      const response = await fetchWithTimeout(url);
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

  // ==================== Content CRUD (P1) ====================

  /**
   * GET /api/v1/neture/supplier/contents
   * 콘텐츠 목록
   */
  async getContents(filters?: { type?: ContentType; status?: ContentStatus }): Promise<SupplierContentItem[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);

      const url = `${API_BASE_URL}/api/v1/neture/supplier/contents${params.toString() ? `?${params}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('[Supplier API] Contents API not available');
        return [];
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch contents:', error);
      return [];
    }
  },

  /**
   * GET /api/v1/neture/supplier/contents/:id
   * 콘텐츠 상세
   */
  async getContentById(id: string): Promise<SupplierContentDetail | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/contents/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch content detail:', error);
      return null;
    }
  },

  /**
   * POST /api/v1/neture/supplier/contents
   * 콘텐츠 생성
   */
  async createContent(data: {
    type: ContentType;
    title: string;
    description?: string;
    body?: string;
    imageUrl?: string;
    availableServices?: string[];
    availableAreas?: string[];
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/contents`, {
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
   * PATCH /api/v1/neture/supplier/contents/:id
   * 콘텐츠 수정
   */
  async updateContent(
    id: string,
    updates: {
      title?: string;
      description?: string;
      body?: string;
      imageUrl?: string;
      status?: ContentStatus;
      availableServices?: string[];
      availableAreas?: string[];
    }
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/contents/${id}`, {
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
   * DELETE /api/v1/neture/supplier/contents/:id
   * 콘텐츠 삭제
   */
  async deleteContent(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/contents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
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

// Content types (P1)
export type ContentType = 'description' | 'image' | 'banner' | 'guide';
export type ContentStatus = 'draft' | 'published';

interface SupplierContentItem {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  status: ContentStatus;
  availableServices: string[];
  availableAreas: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface SupplierContentDetail extends SupplierContentItem {
  body: string;
  imageUrl: string;
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

interface AdminDashboardSummary {
  stats: AdminDashboardStats;
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
  OrderSummaryResponse,
  ServiceSummary,
  SupplierContentItem,
  SupplierContentDetail,
  SupplierDashboardSummary,
  SupplierDashboardStats,
  ServiceStat,
  RecentActivity,
  AdminDashboardSummary,
  AdminDashboardStats,
  ServiceStatus,
  RecentApplication,
  RecentActivityItem,
  PartnerDashboardSummary,
  PartnerDashboardStats,
  ConnectedService,
  Notification,
};
