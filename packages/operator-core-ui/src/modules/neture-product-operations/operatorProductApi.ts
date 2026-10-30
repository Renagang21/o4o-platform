import type { AxiosInstance } from 'axios';
import type { AdminProduct } from './admin-product';
export const OPERATOR_PRODUCTS_LOAD_FAILED = 'OPERATOR_PRODUCTS_LOAD_FAILED';
function describeApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof data.error === 'object') return data.error.code || data.error.message || 'UNKNOWN_ERROR';
  return error?.message || 'UNKNOWN_ERROR';
}
export function createOperatorProductApiApi(api: AxiosInstance) {
const operatorProductApi = {
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
    // The operator DTO uses masterName (ProductMaster.name). Never display an offer UUID as its name.
    return result.data.map((product: AdminProduct) => ({
      ...product,
      marketingName: product.masterName?.trim() || product.marketingName?.trim() || '(상품명 없음)',
    }));
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
return {operatorProductApi};
}
