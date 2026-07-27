/**
 * Operator Product Approval API
 *
 * WO-O4O-NETURE-OPERATOR-PRODUCT-API-SCOPE-FIX-V1
 *
 * neture:operator 스코프로 접근 가능한 상품 승인 API.
 * adminProductApi 대신 이 API를 operator 페이지에서 사용한다.
 */

import { api } from '../apiClient';
import type { AdminProduct } from './admin';

/**
 * WO-O4O-NETURE-OPERATOR-PRODUCTS-AND-OFFERS-LOAD-ERROR-CONTRACT-V1 (IR 묶음 2)
 *
 * 조회 실패(4xx/5xx/네트워크/깨진 payload)를 "정상 0건" 으로 삼키지 않는다.
 * 실패 시 고정 코드 throw(서버 원문은 console.warn 으로만 로깅), 정상 0건(200 빈 배열)만 성공 통과.
 * Backend 계약(read-only 확인): `GET /neture/operator/products` → `200 { success:true, data:[] }`
 * 정상 0건도 200+빈 배열. 4xx/5xx 는 실HTTP 오류(403=requireNetureScope). 404 경로 없음.
 */
export const OPERATOR_PRODUCTS_LOAD_FAILED = 'OPERATOR_PRODUCTS_LOAD_FAILED';

function describeApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof data.error === 'object') return data.error.code || data.error.message || 'UNKNOWN_ERROR';
  return error?.message || 'UNKNOWN_ERROR';
}

export const operatorProductApi = {
  async getProducts(status?: string): Promise<AdminProduct[]> {
    let response;
    try {
      const qs = status ? `?status=${status}` : '';
      response = await api.get(`/neture/operator/products${qs}`);
    } catch (error) {
      // 실패를 0건으로 오인시키지 않는다. 서버 원문은 로깅만, 소비 화면에는 고정 코드로 전달.
      console.warn('[Operator Product API] Failed to fetch products:', describeApiError(error));
      throw new Error(OPERATOR_PRODUCTS_LOAD_FAILED);
    }
    const result = response.data;
    if (result?.success !== true || !Array.isArray(result.data)) {
      console.warn('[Operator Product API] Unexpected products payload shape');
      throw new Error(OPERATOR_PRODUCTS_LOAD_FAILED);
    }
    return result.data;
  },

  async approveProduct(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/products/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectProduct(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/products/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  async batchApprove(ids: string[]) {
    const res = await api.post('/neture/operator/products/batch-approve', { ids });
    return res.data;
  },

  async batchReject(ids: string[], reason?: string) {
    const res = await api.post('/neture/operator/products/batch-reject', { ids, reason });
    return res.data;
  },
};
