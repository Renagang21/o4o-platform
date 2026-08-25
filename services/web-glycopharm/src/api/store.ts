/**
 * Store API Client — GlycoPharm 매장 공개 정보 (상품·카테고리·스토어프론트 구성)
 *
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
 *   "B2C Store" 성격을 제거하고 **정보 제공 전용** 클라이언트로 축소했다.
 *   소비자 장바구니·주문·결제는 O4O 범위가 아니다 (`O4O-STORE-COMMERCE-BOUNDARY-V1` §2 · §4).
 */

import type {
  PharmacyStore,
  StoreProduct,
  StoreCategory,
  StoreApplication,
  StoreApiResponse,
  StorePaginatedResponse,
  ServiceContext,
  HeroContent,
} from '@/types/store';
import { DEFAULT_SERVICE_CONTEXT } from '@/types/store';
import { api } from '@/lib/apiClient';

class StoreApiClient {
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
      throw {
        status: error.response?.status || 0,
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || errorData.error || 'Request failed',
      };
    }
  }

  // ============================================================================
  // Public Store API (소비자용 - 인증 불필요)
  // ============================================================================

  /**
   * 약국 몰 정보 조회 (slug 기준)
   */
  async getStoreBySlug(slug: string): Promise<StoreApiResponse<PharmacyStore>> {
    return this.request(`/glycopharm/stores/${slug}`);
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
    return this.request(`/glycopharm/stores/${storeSlug}/categories?serviceContext=${serviceContext}`);
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
    return this.request(`/glycopharm/stores/${storeSlug}/products?${queryString}`);
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
    return this.request(`/glycopharm/stores/${storeSlug}/products/featured?limit=${limit}&serviceContext=${serviceContext}`);
  }

  /**
   * 상품 상세 조회
   */
  async getProductDetail(storeSlug: string, productId: string): Promise<StoreApiResponse<StoreProduct>> {
    return this.request(`/glycopharm/stores/${storeSlug}/products/${productId}`);
  }

  // ============================================================================
  // Storefront Config API (WO-O4O-STOREFRONT-ACTIVATION-V1 Phase 3)
  // ============================================================================

  /**
   * 스토어 설정 조회 (theme, template)
   */
  async getStorefrontConfig(storeSlug: string): Promise<StoreApiResponse<Record<string, any>>> {
    return this.request(`/glycopharm/stores/${storeSlug}/storefront-config`);
  }

  /**
   * 스토어 설정 저장 (theme, template)
   */
  async updateStorefrontConfig(
    storeSlug: string,
    config: { theme?: string; template?: string }
  ): Promise<StoreApiResponse<Record<string, any>>> {
    return this.request(`/glycopharm/stores/${storeSlug}/storefront-config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // ============================================================================
  // Hero Content API (WO-O4O-STOREFRONT-ACTIVATION-V1 Phase 2)
  // ============================================================================

  /**
   * Hero 콘텐츠 조회
   */
  async getStoreHero(storeSlug: string): Promise<StoreApiResponse<HeroContent[]>> {
    return this.request(`/glycopharm/stores/${storeSlug}/hero`);
  }

  /**
   * Hero 콘텐츠 저장
   */
  async updateStoreHero(
    storeSlug: string,
    heroContents: HeroContent[]
  ): Promise<StoreApiResponse<HeroContent[]>> {
    return this.request(`/glycopharm/stores/${storeSlug}/hero`, {
      method: 'PUT',
      body: JSON.stringify({ heroContents }),
    });
  }

  // ============================================================================
  // WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
  //
  //   소비자용 Cart API 5종 · 소비자용 Order API 4종 제거.
  //   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1: 매장 경영자는 O4O로 소비자에게 판매하지 않는다.
  //   또한 이 9개 메서드가 호출하던 `/glycopharm/stores/:slug/cart` ·
  //   `/glycopharm/stores/:slug/orders*` 는 백엔드에 **라우트가 존재하지 않아** 404 였다 (DEAD).
  //   매장의 구매/발주(B2B) 내역은 `api/pharmacy.ts` 의 `/glycopharm/checkout/orders*` 축이 담당한다.
  // ============================================================================

  // ============================================================================
  // Store Application API (약국용 - 인증 필요)
  //
  // WO-O4O-GLYCOPHARM-STORE-APPLY-DEAD-CODE-REMOVAL-V1:
  //   소비자 측 submit/draft/getMyStoreApplication 3 메서드 제거.
  //   StoreApplyPage (/store/apply) 가 dead code 로 확정 (5개월 0 제출 + UI 진입로 0)
  //   되어 함께 삭제. operator/admin 측 API 는 그대로 보존 (list/detail/approve/
  //   reject/supplement 5 메서드 + StoreApprovalsPage / StoreApprovalDetailPage 활용).
  //
  // 선행: IR-O4O-BUSINESS-REGISTRATION-FIELDS-CROSSSERVICE-AUDIT-V1 (P0 조사 결과)
  //
  // ============================================================================

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
    return this.request(`/glycopharm/store-applications${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * 판매 참여 신청 상세 조회 (운영자)
   */
  async getStoreApplicationDetail(id: string): Promise<StoreApiResponse<StoreApplication>> {
    return this.request(`/glycopharm/store-applications/${id}`);
  }

  /**
   * 판매 참여 신청 승인 (운영자)
   */
  async approveStoreApplication(
    id: string,
    storeSlug: string
  ): Promise<StoreApiResponse<StoreApplication>> {
    return this.request(`/glycopharm/store-applications/${id}/approve`, {
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
    return this.request(`/glycopharm/store-applications/${id}/reject`, {
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
    return this.request(`/glycopharm/store-applications/${id}/supplement`, {
      method: 'POST',
      body: JSON.stringify({ request }),
    });
  }
}

// Export singleton instance
export const storeApi = new StoreApiClient();

// Also export the class for testing
export { StoreApiClient };
