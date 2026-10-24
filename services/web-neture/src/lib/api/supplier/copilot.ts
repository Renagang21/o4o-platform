import { api } from '../../apiClient';
import type {
  SupplierKpiSummary,
  ProductPerformanceItem,
  DistributionItem,
  TrendingProductItem,
} from './product.types';

// ==================== Supplier Copilot API ====================
//
// WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §E:
// 기본 지표는 SQL 집계다. 2026-10-24 사용자 승인으로 자기 공급자 집계의 내부 AI 설명을 추가했다.
// AI 설명은 명시적 요청만 처리하며 등록·게시·주문·정산을 실행하지 않는다.

export const supplierCopilotApi = {
  async explainOverview() {
    const { data } = await api.post('/neture/supplier/copilot/ai-overview', {});
    if (data?.success !== true || !data.data) throw new Error('AI_UNAVAILABLE');
    return data.data;
  },
  async getKpi(): Promise<SupplierKpiSummary> {
    try {
      const response = await api.get('/neture/supplier/copilot/kpi');
      const result = response.data;
      return (
        result.data || {
          registeredProducts: 0,
          activeProducts: 0,
          storeListings: 0,
          recentOrders: 0,
        }
      );
    } catch (error) {
      console.warn('[Supplier Copilot] KPI fetch failed:', error);
      throw error;
    }
  },

  async getProductPerformance(): Promise<ProductPerformanceItem[]> {
    try {
      const response = await api.get('/neture/supplier/copilot/products/performance');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Performance fetch failed:', error);
      throw error;
    }
  },

  async getDistribution(): Promise<DistributionItem[]> {
    try {
      const response = await api.get('/neture/supplier/copilot/distribution');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Distribution fetch failed:', error);
      throw error;
    }
  },

  async getTrendingProducts(): Promise<TrendingProductItem[]> {
    try {
      const response = await api.get('/neture/supplier/copilot/products/trending');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Supplier Copilot] Trending fetch failed:', error);
      throw error;
    }
  },
};
