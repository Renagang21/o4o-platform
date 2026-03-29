/**
 * Operator Category Mapping Rules API
 *
 * WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
 */
import { api } from '../apiClient';

export interface CategoryMappingRule {
  id: string;
  keyword: string;
  categoryId: string;
  categoryName?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  matchedKeyword: string;
  confidence: 'high' | 'low' | 'none';
}

export const operatorCategoryMappingApi = {
  async listRules(): Promise<CategoryMappingRule[]> {
    try {
      const res = await api.get('/neture/operator/category-mapping-rules');
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  async createRule(data: { keyword: string; categoryId: string; priority?: number }): Promise<{ success: boolean; error?: string; data?: CategoryMappingRule }> {
    try {
      const res = await api.post('/neture/operator/category-mapping-rules', data);
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'CREATE_FAILED' };
    }
  },

  async updateRule(id: string, data: Partial<{ keyword: string; categoryId: string; priority: number; isActive: boolean }>): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.patch(`/neture/operator/category-mapping-rules/${id}`, data);
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'UPDATE_FAILED' };
    }
  },

  async deleteRule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.delete(`/neture/operator/category-mapping-rules/${id}`);
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'DELETE_FAILED' };
    }
  },

  async testSuggest(productName: string): Promise<{ success: boolean; data?: CategorySuggestion }> {
    try {
      const res = await api.post('/neture/operator/category-mapping-rules/test', { productName });
      return res.data;
    } catch {
      return { success: false };
    }
  },
};
