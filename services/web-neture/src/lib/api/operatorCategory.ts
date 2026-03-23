/**
 * Operator Category API
 *
 * WO-NETURE-CATEGORY-MANAGEMENT-V1
 * 운영자 카테고리 CRUD
 */
import { api } from '../apiClient';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  isRegulated: boolean;
  createdAt: string;
  updatedAt: string;
  children: CategoryNode[];
}

export const operatorCategoryApi = {
  /** 카테고리 트리 조회 */
  async getCategories(): Promise<CategoryNode[]> {
    try {
      const res = await api.get('/neture/operator/categories');
      return res.data?.data || [];
    } catch (error) {
      console.warn('[Category API] Failed to fetch categories:', error);
      return [];
    }
  },

  /** 카테고리 생성 */
  async createCategory(data: {
    name: string;
    parentId?: string | null;
    isRegulated: boolean;
  }): Promise<{ success: boolean; data?: CategoryNode; error?: string }> {
    try {
      const res = await api.post('/neture/operator/categories', data);
      return res.data;
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || 'CREATE_FAILED',
      };
    }
  },

  /** 카테고리 수정 */
  async updateCategory(
    id: string,
    data: Partial<{ name: string; isRegulated: boolean; isActive: boolean; sortOrder: number }>,
  ): Promise<{ success: boolean; data?: CategoryNode; error?: string }> {
    try {
      const res = await api.patch(`/neture/operator/categories/${id}`, data);
      return res.data;
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || 'UPDATE_FAILED',
      };
    }
  },

  /** 카테고리 삭제 */
  async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.delete(`/neture/operator/categories/${id}`);
      return res.data;
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || 'DELETE_FAILED',
      };
    }
  },
};
