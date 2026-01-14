/**
 * Pharmacy API Client for GlycoPharm B2B
 * 약국 관리자용 API 연동
 */

import type {
  PharmacyStore,
  StoreApiResponse,
  StorePaginatedResponse,
} from '@/types/store';

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

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

class PharmacyApiClient {
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
      throw {
        status: response.status,
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || errorData.error || 'Request failed',
      };
    }

    return response.json();
  }

  // ============================================================================
  // Dashboard API
  // ============================================================================

  /**
   * 약국 대시보드 통계 조회
   */
  async getDashboardStats(): Promise<StoreApiResponse<PharmacyStats>> {
    return this.request('/api/v1/glycopharm/pharmacy/dashboard/stats');
  }

  /**
   * 최근 주문 목록
   */
  async getRecentOrders(limit = 5): Promise<StoreApiResponse<RecentOrder[]>> {
    return this.request(`/api/v1/glycopharm/pharmacy/dashboard/recent-orders?limit=${limit}`);
  }

  /**
   * 인기 상품 목록
   */
  async getTopProducts(limit = 5): Promise<StoreApiResponse<TopProduct[]>> {
    return this.request(`/api/v1/glycopharm/pharmacy/dashboard/top-products?limit=${limit}`);
  }

  // ============================================================================
  // Cockpit API (Dashboard 2.0)
  // ============================================================================

  /**
   * 약국 상태 정보 조회
   */
  async getPharmacyStatus(): Promise<StoreApiResponse<PharmacyStatus>> {
    return this.request('/api/v1/glycopharm/pharmacy/cockpit/status');
  }

  /**
   * 오늘의 운영 액션 조회
   */
  async getTodayActions(): Promise<StoreApiResponse<TodayActions>> {
    return this.request('/api/v1/glycopharm/pharmacy/cockpit/today-actions');
  }

  /**
   * 프랜차이즈 서비스 활용 현황
   */
  async getFranchiseServices(): Promise<StoreApiResponse<FranchiseServices>> {
    return this.request('/api/v1/glycopharm/pharmacy/cockpit/franchise-services');
  }

  /**
   * 콘텐츠 작업 공간
   */
  async getContentWorkspace(): Promise<StoreApiResponse<ContentWorkspace>> {
    return this.request('/api/v1/glycopharm/pharmacy/cockpit/content-workspace');
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
    return this.request(`/api/v1/glycopharm/pharmacy/products${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 상품 상세 조회
   */
  async getProductDetail(productId: string): Promise<StoreApiResponse<PharmacyProduct>> {
    return this.request(`/api/v1/glycopharm/pharmacy/products/${productId}`);
  }

  /**
   * 상품 등록 (공급자 상품 선택)
   */
  async addProduct(data: {
    supplierProductId: string;
    price?: number;
    stock?: number;
  }): Promise<StoreApiResponse<PharmacyProduct>> {
    return this.request('/api/v1/glycopharm/pharmacy/products', {
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
    return this.request(`/api/v1/glycopharm/pharmacy/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * 상품 삭제
   */
  async deleteProduct(productId: string): Promise<StoreApiResponse<void>> {
    return this.request(`/api/v1/glycopharm/pharmacy/products/${productId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 상품 카테고리 목록
   */
  async getCategories(): Promise<StoreApiResponse<{ id: string; name: string }[]>> {
    return this.request('/api/v1/glycopharm/pharmacy/categories');
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
    return this.request(`/api/v1/glycopharm/pharmacy/orders${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(orderId: string): Promise<StoreApiResponse<PharmacyOrder>> {
    return this.request(`/api/v1/glycopharm/pharmacy/orders/${orderId}`);
  }

  /**
   * 주문 상태 변경
   */
  async updateOrderStatus(
    orderId: string,
    status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string
  ): Promise<StoreApiResponse<PharmacyOrder>> {
    return this.request(`/api/v1/glycopharm/pharmacy/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, trackingNumber }),
    });
  }

  /**
   * 주문 접수 처리 (RECEIVED)
   * 약국이 주문을 확인하고 운영 책임을 인지했음을 표시
   */
  async receiveOrder(orderId: string): Promise<StoreApiResponse<PharmacyOrder>> {
    return this.request(`/api/v1/glycopharm/pharmacy/orders/${orderId}/receive`, {
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
    return this.request(`/api/v1/glycopharm/pharmacy/customers${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 고객 상세 조회
   */
  async getCustomerDetail(customerId: string): Promise<StoreApiResponse<PharmacyCustomer>> {
    return this.request(`/api/v1/glycopharm/pharmacy/customers/${customerId}`);
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
      `/api/v1/glycopharm/pharmacy/customers/${customerId}/orders${queryString ? `?${queryString}` : ''}`
    );
  }

  // ============================================================================
  // Store Settings API
  // ============================================================================

  /**
   * 내 약국 정보 조회
   */
  async getMyStore(): Promise<StoreApiResponse<PharmacyStore>> {
    return this.request('/api/v1/glycopharm/pharmacy/store');
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
    return this.request('/api/v1/glycopharm/pharmacy/store', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const pharmacyApi = new PharmacyApiClient(API_BASE_URL);

// Also export the class for testing
export { PharmacyApiClient };
