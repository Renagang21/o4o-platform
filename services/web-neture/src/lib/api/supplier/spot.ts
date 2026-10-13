import { api } from '../../apiClient';
import type { SpotPricePolicy } from './product.types';
import {
  SUPPLIER_SPOT_POLICIES_LOAD_FAILED,
  SUPPLIER_SPOT_POLICIES_FORBIDDEN,
  extractApiError,
} from './errors';

export const supplierSpotApi = {
  // ==================== WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1 ====================

  /** 스팟 정책 생성 */
  async createSpotPolicy(data: {
    offerId: string;
    policyName: string;
    spotPrice: number;
    startAt: string;
    endAt: string;
  }): Promise<{ success: boolean; data?: SpotPricePolicy; error?: string }> {
    try {
      const response = await api.post('/neture/supplier/spot-policies', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  /** 상품별 스팟 정책 목록 */
  /**
   * WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1
   *
   * backend 계약(정적 확인 — spot-price-policy.controller.ts:61-75 / service.ts:56):
   *   200 + []      정상 "정책 없음". offer 미존재·타인 offer 도 동일하게 [] 다
   *                 (`repo.find({ offerId, supplierId })` — **404 개념이 없다**)
   *   403           supplier 권한 없음 (`user.supplierId` 부재)
   *   500           서버 오류
   * 따라서 not-found 상태는 만들지 않고, 403 만 별도 코드로 구분한다.
   */
  async listSpotPolicies(offerId: string): Promise<SpotPricePolicy[]> {
    let response;
    try {
      response = await api.get(`/neture/supplier/spot-policies/offer/${offerId}`);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.warn('[Supplier API] Failed to list spot policies:', extractApiError(error));
      throw new Error(
        status === 403 ? SUPPLIER_SPOT_POLICIES_FORBIDDEN : SUPPLIER_SPOT_POLICIES_LOAD_FAILED,
      );
    }
    const result = response.data;
    if (!result?.success || !Array.isArray(result.data)) {
      console.warn('[Supplier API] Unexpected spot policies payload shape');
      throw new Error(SUPPLIER_SPOT_POLICIES_LOAD_FAILED);
    }
    return result.data as SpotPricePolicy[];
  },

  /** 스팟 정책 상태 변경 */
  async changeSpotPolicyStatus(
    id: string,
    status: 'ACTIVE' | 'CANCELLED',
  ): Promise<{ success: boolean; data?: SpotPricePolicy; error?: string }> {
    try {
      const response = await api.patch(`/neture/supplier/spot-policies/${id}/status`, { status });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },
};
