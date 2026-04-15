/**
 * Pharmacy API Client for GlycoPharm B2B
 * 약국 관리자용 API 연동
 */

import type {
  PharmacyStore,
  StoreApiResponse,
  StorePaginatedResponse,
} from '@/types/store';
import type { StoreMainData, CopyOptions } from '@/types/store-main';

import { api } from '@/lib/apiClient';

// 약국 대시보드 통계
export interface PharmacyStats {
  monthlySales: number;
  monthlyChange: number;
  newOrders: number;
  ordersChange: number;
  totalProducts: number;
  productsChange: number;
  totalCustomers: number;
  customersChange: number;
}

// Cockpit: 주문 채널 상태
export interface OrderChannelStatus {
  web: boolean;
  kiosk: 'none' | 'requested' | 'approved' | 'rejected';
  tablet: 'none' | 'requested' | 'approved' | 'rejected';
}

// Cockpit: 약국 상태 정보
export interface PharmacyStatus {
  pharmacyName: string;
  storeSlug?: string;
  storeStatus: 'pending' | 'preparing' | 'active' | 'suspended';
  applicationStatus: 'none' | 'draft' | 'submitted' | 'reviewing' | 'supplementing' | 'approved' | 'rejected';
  legalInfoStatus: 'complete' | 'incomplete' | 'needs_update';
  legalInfoIssues?: string[];
  orderChannelStatus?: OrderChannelStatus;
}

// Cockpit: 오늘의 운영 액션
export interface TodayActions {
  todayOrders: number;
  pendingOrders: number;
  pendingReceiveOrders: number; // 접수 대기 주문 (RECEIVED 처리 필요)
  pendingRequests: number; // 대기 중인 고객 요청 (Phase 1: Common Request)
  operatorNotices: number;
  applicationAlerts: number;
}

// Cockpit: 프랜차이즈 서비스 활용 현황
export interface FranchiseServices {
  signage: {
    enabled: boolean;
    activeContents: number;
    lastUpdated?: string;
  };
  marketTrial: {
    enabled: boolean;
    activeTrials: number;
  };
  forum: {
    enabled: boolean;
    ownedForums: number;
    joinedForums: number;
  };
}

// Cockpit: 콘텐츠 작업 공간
export interface ContentWorkspace {
  savedContents: number;
  recentContents: Array<{
    id: string;
    title: string;
    type: 'video' | 'document' | 'link';
    source: string;
    savedAt: string;
  }>;
}

// 최근 주문 요약
export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// 인기 상품 요약
export interface TopProduct {
  id: string;
  name: string;
  categoryName: string;
  soldCount: number;
  revenue: number;
}

// 약국 상품 (관리용)
export interface PharmacyProduct {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  salePrice?: number;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  thumbnailUrl?: string;
  isDropshipping: boolean;
  supplierId: string;
  supplierName: string;
  createdAt: string;
}

// 약국 주문 (관리용)
export interface PharmacyOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: PharmacyOrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: 'pending' | 'received' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    recipient: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// 약국 고객
export interface PharmacyCustomer {
  id: string;
  userId?: string; // WO-O4O-CARE-IDENTITY-UNIFICATION-USERS-ID-V1
  name: string;
  phone: string;
  email?: string;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'prediabetes';
  lastOrderAt?: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

// Store AI Summary 응답 (WO-O4O-STORE-HUB-AI-SUMMARY-V1)
export interface StoreAiSummaryData {
  summary: string;
  issues: Array<{ type: string; severity: string; message: string; metric?: string }>;
  actions: Array<{ label: string; priority: string; reason: string }>;
  model: string;
  createdAt: string;
  snapshotId: string;
}

// Product AI Insight 응답 (WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1)
export interface ProductAiInsightData {
  summary: string;
  productHighlights: Array<{ productId: string; productName: string; highlight: string; metric?: string }>;
  issues: Array<{ type: string; severity: string; message: string; productId?: string; productName?: string }>;
  actions: Array<{ label: string; priority: string; reason: string; productId?: string }>;
  model: string;
  createdAt: string;
}

// Product AI Tag 응답 (WO-O4O-PRODUCT-AI-TAGGING-V1)
export interface ProductAiTagData {
  id: string;
  tag: string;
  confidence: number;
  source: 'ai' | 'manual';
  model?: string | null;
  createdAt: string;
}

// AI 추천 상품 (WO-O4O-AI-PRODUCT-RECOMMENDATION-V1)
export interface RecommendedProductData {
  id: string;
  regulatoryName: string;
  marketingName: string;
  tags: string[];
  specification: string | null;
  categoryName: string | null;
  brandName: string | null;
  matchingTags: number;
  score: number;
  reason: string;
}

// KPI 요약 (WO-O4O-STORE-COPILOT-DASHBOARD-V1)
export interface KpiSummaryData {
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  monthRevenue: number;
  avgOrderValue: number;
  lastMonthRevenue: number;
}

// 상품 스냅샷 (WO-O4O-STORE-COPILOT-DASHBOARD-V1)
export interface ProductSnapshotData {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  snapshotDate: string;
  qrScans: number;
  orders: number;
  revenue: number;
  conversionRate: number;
}

// AI Tag 검색 결과 (WO-O4O-AI-TAG-SEARCH-V1)
export interface ProductSearchResultData {
  id: string;
  regulatoryName: string;
  marketingName: string;
  tags: string[];
  specification: string | null;
  categoryName: string | null;
  brandName: string | null;
  score: number;
}

class PharmacyApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body as string) : undefined;

    try {
      const response = method === 'GET'
        ? await api.get(endpoint)
        : method === 'POST'
          ? await api.post(endpoint, body)
          : method === 'PATCH'
            ? await api.patch(endpoint, body)
            : method === 'PUT'
              ? await api.put(endpoint, body)
              : await api.delete(endpoint);
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || {};
      const nested = typeof errorData.error === 'object' ? errorData.error : {};
      throw {
        status: error.response?.status || 0,
        code: errorData.code || nested.code || 'UNKNOWN_ERROR',
        message: errorData.message || nested.message || (typeof errorData.error === 'string' ? errorData.error : 'Request failed'),
      };
    }
  }

  /** Unwrap standard { success, data } API envelope returned by Care endpoints */
  private unwrap<T>(res: unknown): T {
    const obj = res as Record<string, unknown>;
    return obj && typeof obj === 'object' && 'data' in obj ? (obj.data as T) : (res as T);
  }

  // ============================================================================
  // Dashboard API
  // ============================================================================

  /**
   * 약국 대시보드 통계 조회
   */
  async getDashboardStats(): Promise<StoreApiResponse<PharmacyStats>> {
    return this.request('/glycopharm/pharmacy/dashboard/stats');
  }

  /**
   * 최근 주문 목록
   */
  async getRecentOrders(limit = 5): Promise<StoreApiResponse<RecentOrder[]>> {
    return this.request(`/glycopharm/pharmacy/dashboard/recent-orders?limit=${limit}`);
  }

  /**
   * 인기 상품 목록
   */
  async getTopProducts(limit = 5): Promise<StoreApiResponse<TopProduct[]>> {
    return this.request(`/glycopharm/pharmacy/dashboard/top-products?limit=${limit}`);
  }

  // ============================================================================
  // Cockpit API (Dashboard 2.0)
  // ============================================================================

  /**
   * 약국 상태 정보 조회
   */
  async getPharmacyStatus(): Promise<StoreApiResponse<PharmacyStatus>> {
    return this.request('/glycopharm/pharmacy/cockpit/status');
  }

  /**
   * 오늘의 운영 액션 조회
   */
  async getTodayActions(): Promise<StoreApiResponse<TodayActions>> {
    return this.request('/glycopharm/pharmacy/cockpit/today-actions');
  }

  /**
   * 프랜차이즈 서비스 활용 현황
   */
  async getFranchiseServices(): Promise<StoreApiResponse<FranchiseServices>> {
    return this.request('/glycopharm/pharmacy/cockpit/franchise-services');
  }

  /**
   * 콘텐츠 작업 공간
   */
  async getContentWorkspace(): Promise<StoreApiResponse<ContentWorkspace>> {
    return this.request('/glycopharm/pharmacy/cockpit/content-workspace');
  }

  /**
   * 매장 메인 데이터 조회 (WO-STORE-MAIN-PAGE-PHASE1-V1)
   */
  async getStoreMain(): Promise<StoreApiResponse<StoreMainData>> {
    return this.request('/glycopharm/pharmacy/cockpit/store-main');
  }

  /**
   * Store AI 요약 조회 (WO-O4O-STORE-HUB-AI-SUMMARY-V1)
   */
  async getStoreAiSummary(): Promise<StoreApiResponse<StoreAiSummaryData | null>> {
    return this.request('/store-hub/ai/summary');
  }

  /**
   * Store AI 스냅샷 생성 + 인사이트 트리거 (WO-O4O-STORE-HUB-AI-SUMMARY-V1)
   */
  async createStoreAiSnapshot(): Promise<StoreApiResponse<{ id: string }>> {
    return this.request('/store-hub/ai/snapshot', { method: 'POST' });
  }

  /**
   * 상품 AI 인사이트 조회 (WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1)
   */
  async getProductAiInsight(): Promise<StoreApiResponse<ProductAiInsightData | null>> {
    return this.request('/store-hub/ai/products/insight');
  }

  /**
   * 상품 AI 스냅샷 생성 + 인사이트 트리거 (WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1)
   */
  async createProductAiSnapshot(): Promise<StoreApiResponse<{ count: number }>> {
    return this.request('/store-hub/ai/products/snapshot', { method: 'POST' });
  }

  /**
   * 상품 AI 태그 조회 (WO-O4O-PRODUCT-AI-TAGGING-V1)
   */
  async getProductAiTags(productId: string): Promise<StoreApiResponse<{ aiTags: ProductAiTagData[]; manualTags: ProductAiTagData[] }>> {
    return this.request(`/products/${productId}/ai-tags`);
  }

  /**
   * 상품 AI 태그 재생성 (WO-O4O-PRODUCT-AI-TAGGING-V1)
   */
  async regenerateProductAiTags(productId: string): Promise<StoreApiResponse<{ message: string }>> {
    return this.request(`/products/${productId}/ai-tags/regenerate`, { method: 'POST' });
  }

  /**
   * 수동 태그 추가 (WO-O4O-PRODUCT-AI-TAGGING-V1)
   */
  async addProductManualTag(productId: string, tag: string): Promise<StoreApiResponse<ProductAiTagData>> {
    return this.request(`/products/${productId}/ai-tags/manual`, {
      method: 'POST',
      body: JSON.stringify({ tag }),
    });
  }

  /**
   * 태그 삭제 (WO-O4O-PRODUCT-AI-TAGGING-V1)
   */
  async deleteProductAiTag(productId: string, tagId: string): Promise<StoreApiResponse<void>> {
    return this.request(`/products/${productId}/ai-tags/${tagId}`, { method: 'DELETE' });
  }

  /**
   * AI 태그 기반 상품 검색 (WO-O4O-AI-TAG-SEARCH-V1)
   */
  async searchProductsByAiTag(query: string): Promise<StoreApiResponse<{ products: ProductSearchResultData[]; query: string; total: number }>> {
    return this.request(`/products/search/ai?q=${encodeURIComponent(query)}`);
  }

  /**
   * 태그 기반 상품 추천 (WO-O4O-AI-PRODUCT-RECOMMENDATION-V1)
   */
  async getProductRecommendations(tags: string[]): Promise<StoreApiResponse<{ products: RecommendedProductData[]; total: number; context: string }>> {
    return this.request(`/products/recommend?tags=${encodeURIComponent(tags.join(','))}`);
  }

  /**
   * 매장 컨텍스트 기반 상품 추천 (WO-O4O-AI-PRODUCT-RECOMMENDATION-V1)
   */
  async getStoreProductRecommendations(): Promise<StoreApiResponse<{ products: RecommendedProductData[]; total: number; context: string }>> {
    return this.request('/products/recommend/store');
  }

  /**
   * KPI 요약 조회 (WO-O4O-STORE-COPILOT-DASHBOARD-V1)
   */
  async getKpiSummary(): Promise<StoreApiResponse<KpiSummaryData>> {
    return this.request('/store-hub/kpi-summary');
  }

  /**
   * 상품 스냅샷 조회 (WO-O4O-STORE-COPILOT-DASHBOARD-V1)
   */
  async getProductSnapshots(): Promise<StoreApiResponse<ProductSnapshotData[]>> {
    return this.request('/store-hub/ai/products/snapshots');
  }

  /**
   * 허브 상품 복사 (WO-APP-DATA-HUB-PHASE2-B)
   */
  async copyStoreItem(
    itemId: string,
    options: CopyOptions
  ): Promise<StoreApiResponse<{ id: string; message: string }>> {
    return this.request(`/glycopharm/pharmacy/cockpit/store-main/${itemId}/copy`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // ============================================================================
  // Products API
  // ============================================================================

  /**
   * 내 약국 상품 목록
   */
  async getProducts(params?: {
    categoryId?: string;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<StoreApiResponse<StorePaginatedResponse<PharmacyProduct>>> {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(`/glycopharm/pharmacy/products${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 상품 상세 조회
   */
  async getProductDetail(productId: string): Promise<StoreApiResponse<PharmacyProduct>> {
    return this.request(`/glycopharm/pharmacy/products/${productId}`);
  }

  /**
   * 상품 등록 (공급자 상품 선택)
   */
  async addProduct(data: {
    supplierProductId: string;
    price?: number;
    stock?: number;
  }): Promise<StoreApiResponse<PharmacyProduct>> {
    return this.request('/glycopharm/pharmacy/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 상품 수정
   */
  async updateProduct(
    productId: string,
    data: Partial<{ price: number; salePrice: number; stock: number; status: string }>
  ): Promise<StoreApiResponse<PharmacyProduct>> {
    return this.request(`/glycopharm/pharmacy/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * 상품 삭제
   */
  async deleteProduct(productId: string): Promise<StoreApiResponse<void>> {
    return this.request(`/glycopharm/pharmacy/products/${productId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 상품 카테고리 목록
   */
  async getCategories(): Promise<StoreApiResponse<{ id: string; name: string }[]>> {
    return this.request('/glycopharm/pharmacy/categories');
  }

  // ============================================================================
  // Orders API
  // ============================================================================

  /**
   * 내 약국 주문 목록
   */
  async getOrders(params?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<StoreApiResponse<StorePaginatedResponse<PharmacyOrder>>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(`/glycopharm/pharmacy/orders${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(orderId: string): Promise<StoreApiResponse<PharmacyOrder>> {
    return this.request(`/glycopharm/pharmacy/orders/${orderId}`);
  }

  /**
   * 주문 상태 변경
   */
  async updateOrderStatus(
    orderId: string,
    status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string
  ): Promise<StoreApiResponse<PharmacyOrder>> {
    return this.request(`/glycopharm/pharmacy/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, trackingNumber }),
    });
  }

  /**
   * 주문 접수 처리 (RECEIVED)
   * 약국이 주문을 확인하고 운영 책임을 인지했음을 표시
   */
  async receiveOrder(orderId: string): Promise<StoreApiResponse<PharmacyOrder>> {
    return this.request(`/glycopharm/pharmacy/orders/${orderId}/receive`, {
      method: 'PATCH',
    });
  }

  // ============================================================================
  // Customers API
  // ============================================================================

  /**
   * 내 약국 고객 목록
   */
  async getCustomers(params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<StoreApiResponse<StorePaginatedResponse<PharmacyCustomer>>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(`/glycopharm/pharmacy/customers${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 당뇨인 등록
   * WO-GLYCOPHARM-PHARMACY-PATIENT-REGISTER-FORM-COMPLETE-V1
   */
  async createCustomer(data: {
    name: string;
    phone?: string;
    email?: string;
    gender?: 'male' | 'female';
    birthYear?: number;
    notes?: string;
  }): Promise<StoreApiResponse<{ id: string; user_id?: string; name: string; phone: string; email: string; gender: string | null; birth_year: number | null; created_at: string }>> {
    return this.request('/glycopharm/pharmacy/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 고객 상세 조회
   */
  async getCustomerDetail(customerId: string): Promise<StoreApiResponse<PharmacyCustomer>> {
    return this.request(`/glycopharm/pharmacy/customers/${customerId}`);
  }

  /**
   * 고객 주문 내역
   */
  async getCustomerOrders(
    customerId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<StoreApiResponse<StorePaginatedResponse<PharmacyOrder>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(
      `/glycopharm/pharmacy/customers/${customerId}/orders${queryString ? `?${queryString}` : ''}`
    );
  }

  // ============================================================================
  // Store Settings API
  // ============================================================================

  /**
   * 내 약국 정보 조회
   */
  async getMyStore(): Promise<StoreApiResponse<PharmacyStore>> {
    return this.request('/glycopharm/pharmacy/store');
  }

  /**
   * 내 약국 정보 수정
   */
  async updateMyStore(data: Partial<{
    description: string;
    operatingHours: PharmacyStore['operatingHours'];
    shippingInfo: PharmacyStore['shippingInfo'];
    returnPolicy: string;
  }>): Promise<StoreApiResponse<PharmacyStore>> {
    return this.request('/glycopharm/pharmacy/store', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

}

// Export singleton instance
export const pharmacyApi = new PharmacyApiClient();

// Also export the class for testing
export { PharmacyApiClient };
