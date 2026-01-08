/**
 * Store API Client for GlycoPharm B2C Store
 * 회원 약국 몰 API 연동
 */

import type {
  PharmacyStore,
  StoreProduct,
  StoreCategory,
  CartItem,
  StoreOrder,
  StoreApplication,
  StoreApplicationForm,
  StoreApiResponse,
  StorePaginatedResponse,
  ServiceContext,
} from '@/types/store';
import { DEFAULT_SERVICE_CONTEXT } from '@/types/store';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.glycopharm.co.kr';

class StoreApiClient {
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
  // Public Store API (소비자용 - 인증 불필요)
  // ============================================================================

  /**
   * 약국 몰 정보 조회 (slug 기준)
   */
  async getStoreBySlug(slug: string): Promise<StoreApiResponse<PharmacyStore>> {
    return this.request(`/api/v1/glycopharm/stores/${slug}`);
  }

  /**
   * 약국 몰 카테고리 목록
   * @param storeSlug 약국 slug
   * @param serviceContext 서비스 컨텍스트 (기본값: glycopharm)
   */
  async getStoreCategories(
    storeSlug: string,
    serviceContext: ServiceContext = DEFAULT_SERVICE_CONTEXT
  ): Promise<StoreApiResponse<StoreCategory[]>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/categories?serviceContext=${serviceContext}`);
  }

  /**
   * 약국 몰 상품 목록
   * @param storeSlug 약국 slug
   * @param params 검색/필터 파라미터 (serviceContext 기본값: glycopharm)
   */
  async getStoreProducts(
    storeSlug: string,
    params?: {
      categoryId?: string;
      search?: string;
      sort?: 'popular' | 'newest' | 'price_low' | 'price_high' | 'rating';
      page?: number;
      pageSize?: number;
      serviceContext?: ServiceContext;
    }
  ): Promise<StoreApiResponse<StorePaginatedResponse<StoreProduct>>> {
    const searchParams = new URLSearchParams();
    // 서비스 컨텍스트 (기본값: glycopharm)
    searchParams.set('serviceContext', params?.serviceContext || DEFAULT_SERVICE_CONTEXT);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/products?${queryString}`);
  }

  /**
   * 약국 몰 인기 상품
   * @param storeSlug 약국 slug
   * @param limit 개수 제한
   * @param serviceContext 서비스 컨텍스트 (기본값: glycopharm)
   */
  async getFeaturedProducts(
    storeSlug: string,
    limit = 8,
    serviceContext: ServiceContext = DEFAULT_SERVICE_CONTEXT
  ): Promise<StoreApiResponse<StoreProduct[]>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/products/featured?limit=${limit}&serviceContext=${serviceContext}`);
  }

  /**
   * 상품 상세 조회
   */
  async getProductDetail(storeSlug: string, productId: string): Promise<StoreApiResponse<StoreProduct>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/products/${productId}`);
  }

  // ============================================================================
  // Cart API (소비자용 - 인증 필요)
  // ============================================================================

  /**
   * 장바구니 조회
   */
  async getCart(storeSlug: string): Promise<StoreApiResponse<CartItem[]>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/cart`);
  }

  /**
   * 장바구니 상품 추가
   */
  async addToCart(
    storeSlug: string,
    productId: string,
    quantity: number
  ): Promise<StoreApiResponse<CartItem>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/cart`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  /**
   * 장바구니 상품 수량 변경
   */
  async updateCartItem(
    storeSlug: string,
    cartItemId: string,
    quantity: number
  ): Promise<StoreApiResponse<CartItem>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/cart/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  /**
   * 장바구니 상품 삭제
   */
  async removeFromCart(storeSlug: string, cartItemId: string): Promise<StoreApiResponse<void>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/cart/${cartItemId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 장바구니 비우기
   */
  async clearCart(storeSlug: string): Promise<StoreApiResponse<void>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/cart`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Order API (소비자용 - 인증 필요)
  // ============================================================================

  /**
   * 주문 생성
   */
  async createOrder(
    storeSlug: string,
    data: {
      items: Array<{ productId: string; quantity: number }>;
      shippingAddress: {
        recipient: string;
        phone: string;
        zipCode: string;
        address1: string;
        address2?: string;
        memo?: string;
      };
      paymentMethod: string;
    }
  ): Promise<StoreApiResponse<StoreOrder>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 내 주문 목록
   */
  async getMyOrders(
    storeSlug: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<StoreApiResponse<StorePaginatedResponse<StoreOrder>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/orders/mine${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(storeSlug: string, orderId: string): Promise<StoreApiResponse<StoreOrder>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/orders/${orderId}`);
  }

  /**
   * 주문 취소
   */
  async cancelOrder(storeSlug: string, orderId: string, reason?: string): Promise<StoreApiResponse<StoreOrder>> {
    return this.request(`/api/v1/glycopharm/stores/${storeSlug}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================================================
  // Store Application API (약국용 - 인증 필요)
  // ============================================================================

  /**
   * 판매 참여 신청서 조회 (임시저장 포함)
   */
  async getMyStoreApplication(): Promise<StoreApiResponse<StoreApplication | null>> {
    return this.request('/api/v1/glycopharm/store-applications/mine');
  }

  /**
   * 판매 참여 신청서 임시저장
   */
  async saveStoreApplicationDraft(
    form: Partial<StoreApplicationForm>
  ): Promise<StoreApiResponse<StoreApplication>> {
    return this.request('/api/v1/glycopharm/store-applications/draft', {
      method: 'POST',
      body: JSON.stringify(form),
    });
  }

  /**
   * 판매 참여 신청서 제출
   */
  async submitStoreApplication(
    form: StoreApplicationForm
  ): Promise<StoreApiResponse<StoreApplication>> {
    return this.request('/api/v1/glycopharm/store-applications', {
      method: 'POST',
      body: JSON.stringify(form),
    });
  }

  // ============================================================================
  // Admin API (운영자용 - 인증 필요)
  // ============================================================================

  /**
   * 판매 참여 신청 목록 조회 (운영자)
   */
  async getStoreApplications(
    params?: {
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<StoreApiResponse<StorePaginatedResponse<StoreApplication>>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    return this.request(`/api/v1/glycopharm/store-applications${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 판매 참여 신청 상세 조회 (운영자)
   */
  async getStoreApplicationDetail(id: string): Promise<StoreApiResponse<StoreApplication>> {
    return this.request(`/api/v1/glycopharm/store-applications/${id}`);
  }

  /**
   * 판매 참여 신청 승인 (운영자)
   */
  async approveStoreApplication(
    id: string,
    storeSlug: string
  ): Promise<StoreApiResponse<StoreApplication>> {
    return this.request(`/api/v1/glycopharm/store-applications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ storeSlug }),
    });
  }

  /**
   * 판매 참여 신청 반려 (운영자)
   */
  async rejectStoreApplication(
    id: string,
    reason: string
  ): Promise<StoreApiResponse<StoreApplication>> {
    return this.request(`/api/v1/glycopharm/store-applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * 판매 참여 신청 보완 요청 (운영자)
   */
  async requestSupplement(
    id: string,
    request: string
  ): Promise<StoreApiResponse<StoreApplication>> {
    return this.request(`/api/v1/glycopharm/store-applications/${id}/supplement`, {
      method: 'POST',
      body: JSON.stringify({ request }),
    });
  }
}

// Export singleton instance
export const storeApi = new StoreApiClient(API_BASE_URL);

// Also export the class for testing
export { StoreApiClient };
