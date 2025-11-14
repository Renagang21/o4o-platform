/**
 * Dropshipping Authorization API Service
 * Phase 3-6: Supplier-Seller Product Authorization
 */

import { authClient } from '@o4o/auth-client';
import {
  AuthorizationStatus,
  ProductAuthorizationSummary,
  CreateAuthorizationRequest,
  CreateAuthorizationResponse,
  GetAuthorizationsQuery,
  GetAuthorizationsResponse,
  ApproveAuthorizationResponse,
  RejectAuthorizationRequest,
  RejectAuthorizationResponse,
  RevokeAuthorizationResponse,
} from '../types/dropshipping-authorization';

// Mock data for development
const MOCK_AUTHORIZATIONS: ProductAuthorizationSummary[] = [
  {
    id: 'auth-1',
    supplier_product_id: '1',
    supplier_product_name: '프리미엄 유기농 사과',
    seller_id: 'seller-1',
    seller_name: '건강식품몰',
    seller_email: 'seller1@example.com',
    status: 'pending',
    message: '저희 온라인몰에서 유기농 과일 카테고리를 집중 육성하고 있습니다.',
    created_at: '2025-11-12T10:00:00Z',
    updated_at: '2025-11-12T10:00:00Z',
  },
  {
    id: 'auth-2',
    supplier_product_id: '2',
    supplier_product_name: '신선한 유기농 배',
    seller_id: 'seller-1',
    seller_name: '건강식품몰',
    seller_email: 'seller1@example.com',
    status: 'approved',
    message: '품질 좋은 과일을 찾고 있었습니다.',
    created_at: '2025-11-10T09:00:00Z',
    updated_at: '2025-11-11T14:00:00Z',
  },
  {
    id: 'auth-3',
    supplier_product_id: '1',
    supplier_product_name: '프리미엄 유기농 사과',
    seller_id: 'seller-2',
    seller_name: '자연드림',
    seller_email: 'seller2@example.com',
    status: 'approved',
    message: '유기농 인증 제품을 찾고 있습니다.',
    created_at: '2025-11-11T11:00:00Z',
    updated_at: '2025-11-11T15:00:00Z',
  },
  {
    id: 'auth-4',
    supplier_product_id: '3',
    supplier_product_name: '국내산 감자',
    seller_id: 'seller-3',
    seller_name: '마켓컬리',
    seller_email: 'seller3@example.com',
    status: 'rejected',
    message: '국내산 신선 농산물 판매를 시작하려 합니다.',
    rejection_reason: '기존 계약 판매자와의 독점 계약으로 인해 현재 추가 승인이 어렵습니다.',
    created_at: '2025-11-13T08:00:00Z',
    updated_at: '2025-11-13T16:00:00Z',
  },
  {
    id: 'auth-5',
    supplier_product_id: '4',
    supplier_product_name: '친환경 토마토',
    seller_id: 'seller-1',
    seller_name: '건강식품몰',
    seller_email: 'seller1@example.com',
    status: 'pending',
    message: '토마토 제품군 확대를 위해 신청합니다.',
    created_at: '2025-11-14T07:00:00Z',
    updated_at: '2025-11-14T07:00:00Z',
  },
];

// Enable/disable mock mode
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_AUTHORIZATION !== 'false'
  && import.meta.env.MODE === 'development';

/**
 * Mock API delay
 */
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Authorization API client
 */
export const authorizationAPI = {
  /**
   * Create authorization request (Seller 측)
   * 판매 신청
   */
  async createAuthorization(
    payload: CreateAuthorizationRequest
  ): Promise<CreateAuthorizationResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const newAuth: ProductAuthorizationSummary = {
        id: `auth-${Date.now()}`,
        supplier_product_id: payload.supplier_product_id,
        supplier_product_name: '상품명', // Mock
        seller_id: 'current-seller',
        seller_name: '현재 판매자',
        seller_email: 'seller@example.com',
        status: 'pending',
        message: payload.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_AUTHORIZATIONS.unshift(newAuth);

      return {
        success: true,
        data: newAuth,
        message: '판매 신청이 완료되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.post(
      '/api/v1/seller/product-authorizations',
      payload
    );
    return response.data;
  },

  /**
   * Fetch my authorizations (Seller 측)
   * 내 판매 신청 목록 조회
   */
  async fetchMyAuthorizations(): Promise<ProductAuthorizationSummary[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      // Mock: 현재 seller의 authorization만 필터링
      return MOCK_AUTHORIZATIONS.filter((auth) => auth.seller_id === 'seller-1');
    }

    // Real API call
    const response = await authClient.api.get('/api/v1/seller/product-authorizations');
    return response.data.data || [];
  },

  /**
   * Fetch all authorizations (Supplier 측)
   * 판매자 신청 목록 조회 (필터링)
   */
  async fetchAuthorizations(
    query: GetAuthorizationsQuery = {}
  ): Promise<GetAuthorizationsResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      let filtered = [...MOCK_AUTHORIZATIONS];

      // Status filter
      if (query.status) {
        filtered = filtered.filter((auth) => auth.status === query.status);
      }

      // Product filter
      if (query.supplier_product_id) {
        filtered = filtered.filter(
          (auth) => auth.supplier_product_id === query.supplier_product_id
        );
      }

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = filtered.slice(start, end);

      return {
        success: true,
        data: {
          authorizations: paginated,
          pagination: {
            total: filtered.length,
            page,
            limit,
            total_pages: Math.ceil(filtered.length / limit),
          },
        },
      };
    }

    // Real API call
    const response = await authClient.api.get(
      '/api/v1/supplier/product-authorizations',
      { params: query }
    );
    return response.data;
  },

  /**
   * Approve authorization (Supplier 측)
   * 판매 승인
   */
  async approveAuthorization(id: string): Promise<ApproveAuthorizationResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const authIndex = MOCK_AUTHORIZATIONS.findIndex((a) => a.id === id);
      if (authIndex === -1) {
        throw new Error('승인 정보를 찾을 수 없습니다');
      }

      MOCK_AUTHORIZATIONS[authIndex].status = 'approved';
      MOCK_AUTHORIZATIONS[authIndex].updated_at = new Date().toISOString();

      return {
        success: true,
        data: MOCK_AUTHORIZATIONS[authIndex],
        message: '판매가 승인되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/supplier/product-authorizations/${id}/approve`
    );
    return response.data;
  },

  /**
   * Reject authorization (Supplier 측)
   * 판매 거절
   */
  async rejectAuthorization(
    id: string,
    payload: RejectAuthorizationRequest
  ): Promise<RejectAuthorizationResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const authIndex = MOCK_AUTHORIZATIONS.findIndex((a) => a.id === id);
      if (authIndex === -1) {
        throw new Error('승인 정보를 찾을 수 없습니다');
      }

      MOCK_AUTHORIZATIONS[authIndex].status = 'rejected';
      MOCK_AUTHORIZATIONS[authIndex].rejection_reason = payload.reason;
      MOCK_AUTHORIZATIONS[authIndex].updated_at = new Date().toISOString();

      return {
        success: true,
        data: MOCK_AUTHORIZATIONS[authIndex],
        message: '판매가 거절되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/supplier/product-authorizations/${id}/reject`,
      payload
    );
    return response.data;
  },

  /**
   * Revoke authorization (Supplier 측)
   * 승인 취소
   */
  async revokeAuthorization(id: string): Promise<RevokeAuthorizationResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const authIndex = MOCK_AUTHORIZATIONS.findIndex((a) => a.id === id);
      if (authIndex === -1) {
        throw new Error('승인 정보를 찾을 수 없습니다');
      }

      MOCK_AUTHORIZATIONS[authIndex].status = 'revoked';
      MOCK_AUTHORIZATIONS[authIndex].updated_at = new Date().toISOString();

      return {
        success: true,
        data: MOCK_AUTHORIZATIONS[authIndex],
        message: '승인이 취소되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/supplier/product-authorizations/${id}/revoke`
    );
    return response.data;
  },
};
