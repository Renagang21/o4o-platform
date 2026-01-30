/**
 * GlycoPharm API Client
 * glycopharm-web API 연동 (Alpha v1)
 *
 * API 엔드포인트:
 * - Applications: /api/v1/glycopharm/applications (참여/서비스 신청)
 * - Pharmacies: /api/v1/glycopharm/pharmacies (약국 정보)
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export type ServiceType = 'dropshipping' | 'sample_sales' | 'digital_signage';
export type ApplicationStatus = 'submitted' | 'approved' | 'rejected';
export type OrganizationType = 'pharmacy' | 'pharmacy_chain';

export interface GlycopharmApplication {
  id: string;
  userId: string;
  organizationType: OrganizationType;
  organizationName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  status: ApplicationStatus;
  note?: string;
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

export interface SubmitApplicationRequest {
  organizationType: OrganizationType;
  organizationName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  note?: string;
}

export interface SubmitApplicationResponse {
  success: boolean;
  message: string;
  application: GlycopharmApplication;
}

export interface MyApplicationsResponse {
  success: boolean;
  applications: GlycopharmApplication[];
}

export interface PharmacyInfo {
  id: string;
  name: string;
  businessNumber: string;
  address?: string;
  phone?: string;
  activeServices: ServiceType[];
  joinedAt: string;
}

export interface MyPharmacyResponse {
  success: boolean;
  data: PharmacyInfo | null;
}

export interface ApiError {
  status: number;
  error: string;
  code: string;
  message?: string;
}

// ============================================================================
// Operator Dashboard Types (WO-GLYCOPHARM-DASHBOARD-P1-A)
// ============================================================================

export interface OperatorDashboardData {
  serviceStatus: {
    activePharmacies: number;
    approvedStores: number;
    warnings: number;
    lastUpdated: string;
  };
  storeStatus: {
    pendingApprovals: number;
    supplementRequests: number;
    activeStores: number;
    inactiveStores: number;
  };
  channelStatus: {
    web: { active: number; pending: number; inactive: number };
    kiosk: { active: number; pending: number; inactive: number };
    tablet: { active: number; pending: number; inactive: number };
  };
  contentStatus: {
    hero: { total: number; active: number };
    featured: { total: number; operatorPicked: number };
    eventNotice: { total: number; active: number };
  };
  trialStatus: {
    activeTrials: number;
    connectedPharmacies: number;
    pendingConnections: number;
  };
  forumStatus: {
    open: number;
    readonly: number;
    closed: number;
    totalPosts: number;
  };
  productStats: {
    total: number;
    active: number;
    draft: number;
  };
  orderStats: {
    totalOrders: number;
    paidOrders: number;
    totalRevenue: number;
  };
}

export interface OperatorDashboardResponse {
  success: boolean;
  data: OperatorDashboardData;
}

// ============================================================================
// Operator Orders Types (WO-GLYCOPHARM-ORDERS-API)
// ============================================================================

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

// ============================================================================
// Operator Products Types
// ============================================================================

export type ProductStatus = 'active' | 'draft' | 'outOfStock' | 'discontinued';

export interface OperatorProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  basePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  status: ProductStatus;
  salesCount: number;
  createdAt: string;
  imageUrl?: string;
}

export interface OperatorProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  draftProducts: number;
  totalInventoryValue: number;
  avgMargin: number;
}

export interface OperatorProductsResponse {
  success: boolean;
  data: {
    products: OperatorProduct[];
    stats: OperatorProductStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ============================================================================
// Operator Pharmacies Types
// ============================================================================

export type PharmacyStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type PharmacyTier = 'gold' | 'silver' | 'bronze' | 'standard';

export interface OperatorPharmacy {
  id: string;
  name: string;
  ownerName: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  status: PharmacyStatus;
  tier: PharmacyTier;
  joinedAt: string;
  monthlyOrders: number;
  monthlyRevenue: number;
  growthRate: number;
  lastActivityAt: string;
}

export interface OperatorPharmacyStats {
  totalPharmacies: number;
  activePharmacies: number;
  pendingApprovals: number;
  issuePharmacies: number;
  totalMonthlyRevenue: number;
  avgOrdersPerPharmacy: number;
}

export interface OperatorPharmaciesResponse {
  success: boolean;
  data: {
    pharmacies: OperatorPharmacy[];
    stats: OperatorPharmacyStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface OperatorOrder {
  id: string;
  orderNumber: string;
  pharmacyName: string;
  pharmacyRegion: string;
  items: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export interface OperatorOrderStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  avgOrderValue: number;
}

export interface OperatorOrdersResponse {
  success: boolean;
  data: {
    orders: OperatorOrder[];
    stats: OperatorOrderStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ============================================================================
// Admin Types (운영 API)
// ============================================================================

export interface AdminApplication extends GlycopharmApplication {
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminApplicationsResponse {
  success: boolean;
  applications: AdminApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminApplicationDetailResponse {
  success: boolean;
  application: AdminApplication;
  pharmacy: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    ownerName?: string;
    businessNumber?: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface ReviewApplicationRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ReviewApplicationResponse {
  success: boolean;
  message: string;
  application: {
    id: string;
    status: ApplicationStatus;
    decidedAt: string;
    decidedBy: string;
    rejectionReason?: string;
  };
  pharmacy: {
    id: string;
    name: string;
    code: string;
    status: string;
  } | null;
}

// ============================================================================
// API Client
// ============================================================================

class GlycopharmApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Cross-domain: Bearer Token 인증 (localStorage에서 토큰 가져옴)
    const accessToken = getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    };

    // credentials: 'include'는 같은 도메인에서만 쿠키를 전송 (폴백)
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        status: response.status,
        error: errorData.error || 'Request failed',
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message,
      };
      throw error;
    }

    return response.json();
  }

  // ============================================================================
  // Applications API (참여/서비스 신청)
  // ============================================================================

  /**
   * 약국 참여 / 서비스 신청
   */
  async submitApplication(data: SubmitApplicationRequest): Promise<SubmitApplicationResponse> {
    return this.request('/api/v1/glycopharm/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 내 신청 목록 조회
   */
  async getMyApplications(status?: ApplicationStatus): Promise<MyApplicationsResponse> {
    const endpoint = status
      ? `/api/v1/glycopharm/applications/mine?status=${status}`
      : '/api/v1/glycopharm/applications/mine';

    return this.request(endpoint);
  }

  /**
   * 신청 상세 조회
   */
  async getApplication(id: string): Promise<{ success: boolean; application: GlycopharmApplication }> {
    return this.request(`/api/v1/glycopharm/applications/${id}`);
  }

  // ============================================================================
  // Pharmacies API (약국 정보)
  // ============================================================================

  /**
   * 내 약국 정보 조회 (참여 후)
   */
  async getMyPharmacy(): Promise<MyPharmacyResponse> {
    return this.request('/api/v1/glycopharm/pharmacies/me');
  }

  // ============================================================================
  // Admin API (운영자 전용)
  // ============================================================================

  /**
   * 모든 신청 목록 조회 (운영자 전용)
   */
  async getAdminApplications(params?: {
    status?: ApplicationStatus;
    serviceType?: ServiceType;
    organizationType?: OrganizationType;
    page?: number;
    limit?: number;
  }): Promise<AdminApplicationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.serviceType) searchParams.set('serviceType', params.serviceType);
    if (params?.organizationType) searchParams.set('organizationType', params.organizationType);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/glycopharm/applications/admin/all${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * 신청 상세 조회 (운영자 전용)
   */
  async getAdminApplicationDetail(id: string): Promise<AdminApplicationDetailResponse> {
    return this.request(`/api/v1/glycopharm/applications/${id}/admin`);
  }

  /**
   * 신청 승인/반려 (운영자 전용)
   */
  async reviewApplication(id: string, data: ReviewApplicationRequest): Promise<ReviewApplicationResponse> {
    return this.request(`/api/v1/glycopharm/applications/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Operator Dashboard API (WO-GLYCOPHARM-DASHBOARD-P1-A)
  // ============================================================================

  /**
   * 운영자 대시보드 통계 조회
   */
  async getOperatorDashboard(): Promise<OperatorDashboardResponse> {
    return this.request('/api/v1/glycopharm/operator/dashboard');
  }

  /**
   * 운영자 주문 목록 조회
   */
  async getOperatorOrders(params?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
    dateFilter?: string;
    search?: string;
  }): Promise<OperatorOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.dateFilter) searchParams.set('dateFilter', params.dateFilter);
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/glycopharm/operator/orders${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * 운영자 상품 목록 조회
   */
  async getOperatorProducts(params?: {
    status?: ProductStatus;
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<OperatorProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/glycopharm/operator/products${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * 운영자 약국 목록 조회
   */
  async getOperatorPharmacies(params?: {
    status?: PharmacyStatus;
    tier?: PharmacyTier;
    region?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<OperatorPharmaciesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.tier) searchParams.set('tier', params.tier);
    if (params?.region) searchParams.set('region', params.region);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/glycopharm/operator/pharmacies${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }
}

  // ========================================================================
  // Featured Products (Operator)
  // WO-FEATURED-CURATION-API-V1
  // ========================================================================

  /**
   * Featured 상품 목록 조회
   */
  async getFeaturedProducts(params: {
    service: string;
    context: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    searchParams.set('service', params.service);
    searchParams.set('context', params.context);

    const endpoint = `/api/v1/glycopharm/operator/featured-products?${searchParams.toString()}`;
    return this.request(endpoint);
  }

  /**
   * Featured 상품 추가
   */
  async addFeaturedProduct(data: {
    service: string;
    context: string;
    productId: string;
  }): Promise<any> {
    const endpoint = `/api/v1/glycopharm/operator/featured-products`;
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Featured 상품 순서 변경
   */
  async reorderFeaturedProducts(ids: string[]): Promise<any> {
    const endpoint = `/api/v1/glycopharm/operator/featured-products/order`;
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Featured 상품 활성/비활성
   */
  async updateFeaturedProductActive(id: string, isActive: boolean): Promise<any> {
    const endpoint = `/api/v1/glycopharm/operator/featured-products/${id}`;
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  /**
   * Featured 상품 제거
   */
  async removeFeaturedProduct(id: string): Promise<any> {
    const endpoint = `/api/v1/glycopharm/operator/featured-products/${id}`;
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const glycopharmApi = new GlycopharmApiClient(API_BASE_URL);

// Also export the class for testing
export { GlycopharmApiClient };
