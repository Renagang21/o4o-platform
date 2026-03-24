/**
 * Operator Curation API
 *
 * WO-NETURE-PRODUCT-CURATION-V1
 */

import { api } from '../apiClient';

export interface CurationItem {
  id: string;
  offerId: string;
  serviceKey: string;
  placement: string;
  categoryId: string | null;
  position: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  // JOINed fields
  productName: string;
  barcode: string;
  brandName: string | null;
  priceGeneral: number;
  distributionType: string;
  approvalStatus: string;
  categoryName: string | null;
}

export const operatorCurationApi = {
  async list(filters?: { serviceKey?: string; placement?: string }): Promise<CurationItem[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.serviceKey) params.set('serviceKey', filters.serviceKey);
      if (filters?.placement) params.set('placement', filters.placement);
      const qs = params.toString() ? `?${params}` : '';
      const response = await api.get(`/neture/operator/curations${qs}`);
      return response.data?.data || [];
    } catch (error) {
      console.warn('[Curation API] Failed to list curations:', error);
      return [];
    }
  },

  async create(data: {
    offerId: string;
    serviceKey: string;
    placement: string;
    categoryId?: string | null;
    position?: number;
    isActive?: boolean;
    startAt?: string | null;
    endAt?: string | null;
  }): Promise<{ success: boolean; data?: CurationItem; error?: string; message?: string }> {
    try {
      const response = await api.post('/neture/operator/curations', data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async update(
    id: string,
    updates: {
      placement?: string;
      categoryId?: string | null;
      position?: number;
      isActive?: boolean;
      startAt?: string | null;
      endAt?: string | null;
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/operator/curations/${id}`, updates);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/operator/curations/${id}`);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async reorder(ids: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch('/neture/operator/curations/reorder', { ids });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },
};
