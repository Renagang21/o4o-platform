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
// Copilot 은 SQL 집계 기반 지표만 제공한다. 공급자 표면에서 내부 LLM 을 호출하는
// 진입점(AI insight · AI tag)은 없다. 문안 생성은 외부 LLM('ChatGPT로 작업')이 담당한다.

export const supplierCopilotApi = {
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
