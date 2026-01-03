/**
 * Glycopharm API Client
 * Work Order: glycopharm-web API 연동 (Alpha v1)
 *
 * API Endpoints:
 * - Applications: /glycopharm/applications (약국 서비스 신청)
 * - Pharmacies: /glycopharm/pharmacies (약국 정보)
 *
 * 참고: KPA 프론트엔드 연동 패턴을 100% 재사용
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export type ServiceType = 'dropshipping' | 'sample_sales' | 'digital_signage';
export type ApplicationStatus = 'submitted' | 'approved' | 'rejected';

export interface GlycopharmApplication {
  id: string;
  pharmacyName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  status: ApplicationStatus;
  note?: string;
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

// Alias for compatibility with pages
export interface PharmacyApplication {
  id: string;
  pharmacyName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  address?: string;
  phone?: string;
  status: ApplicationStatus;
  note?: string;
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

export interface CreateApplicationRequest {
  pharmacyName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  address?: string;
  phone?: string;
  note?: string;
}

export interface ApplicationsResponse {
  success: boolean;
  applications: PharmacyApplication[];
}

export interface CreateApplicationResponse {
  success: boolean;
  message: string;
  application: GlycopharmApplication;
}

export interface PharmacyInfo {
  id: string;
  name: string;
  businessNumber: string;
  address: string;
  phone: string;
  activeServices: ServiceType[];
  storeSlug?: string;
  isStoreActive: boolean;
  joinedAt: string;
}

// Pharmacy entity for dashboard
export interface Pharmacy {
  id: string;
  pharmacyName: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  activeServices: ServiceType[];
  approvedAt: string;
}

export interface PharmacyMeResponse {
  success: boolean;
  pharmacy: Pharmacy | null;
  isParticipant: boolean;
}

export interface ApiError {
  status: number;
  error: string;
  code: string;
  message?: string;
}

// ============================================================================
// Order Types (H8-2)
// ============================================================================

export type OrderStatus = 'CREATED' | 'PAID' | 'FAILED';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  pharmacy_id: string;
  pharmacy_name?: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: string;
  note?: string;
  paid_at?: string;
  payment_method?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderListItem {
  id: string;
  pharmacy_id: string;
  pharmacy_name?: string;
  status: OrderStatus;
  total_amount: number;
  item_count: number;
  created_at: string;
}

export interface CreateOrderItemRequest {
  product_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  pharmacy_id: string;
  items: CreateOrderItemRequest[];
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: string;
  note?: string;
}

export interface PayOrderRequest {
  payment_method: string;
  payment_id?: string;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
}

export interface OrderListResponse {
  success: boolean;
  data: OrderListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // For cookie-based auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        error: errorData.error || 'Request failed',
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message,
      } as ApiError;
    }

    return response.json();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // ============================================================================
  // Applications API
  // ============================================================================

  /**
   * POST /glycopharm/applications
   * 약국 서비스 참여 신청
   */
  async createApplication(data: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    return this.request('/glycopharm/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /glycopharm/applications/mine
   * 내 신청 목록 조회
   */
  async getMyApplications(status?: ApplicationStatus): Promise<ApplicationsResponse> {
    const endpoint = status
      ? `/glycopharm/applications/mine?status=${status}`
      : '/glycopharm/applications/mine';

    return this.request(endpoint);
  }

  /**
   * GET /glycopharm/applications/:id
   * 특정 신청 상세 조회
   */
  async getApplication(id: string): Promise<{ success: boolean; data: GlycopharmApplication }> {
    return this.request(`/glycopharm/applications/${id}`);
  }

  // ============================================================================
  // Pharmacy API
  // ============================================================================

  /**
   * GET /glycopharm/pharmacies/me
   * 내 약국 정보 조회 (참여 중인 경우)
   */
  async getMyPharmacy(): Promise<PharmacyMeResponse> {
    return this.request('/glycopharm/pharmacies/me');
  }

  // ============================================================================
  // Orders API (H8-2)
  // ============================================================================

  /**
   * POST /glycopharm/orders
   * 주문 생성
   */
  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    return this.request('/glycopharm/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /glycopharm/orders/mine
   * 내 주문 목록 조회
   */
  async getMyOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<OrderListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/glycopharm/orders/mine?${queryString}`
      : '/glycopharm/orders/mine';

    return this.request(endpoint);
  }

  /**
   * GET /glycopharm/orders/:id
   * 주문 상세 조회
   */
  async getOrder(id: string): Promise<OrderResponse> {
    return this.request(`/glycopharm/orders/${id}`);
  }

  /**
   * POST /glycopharm/orders/:id/pay
   * 주문 결제 처리
   */
  async payOrder(id: string, data: PayOrderRequest): Promise<OrderResponse> {
    return this.request(`/glycopharm/orders/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const glycopharmApi = new GlycopharmApiClient(API_BASE_URL);

// Also export the class for testing
export { GlycopharmApiClient };
