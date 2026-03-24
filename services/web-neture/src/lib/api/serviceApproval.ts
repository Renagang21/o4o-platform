/**
 * Service Approval API Client
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 * Operator: 서비스 레벨 상품 승인 관리 API
 */

import { api } from '../apiClient';

export interface ServiceApprovalItem {
  id: string;
  offerId: string;
  serviceKey: string;
  approvalStatus: string;
  decidedBy: string | null;
  decidedAt: string | null;
  reason: string | null;
  createdAt: string;
  productName: string;
  barcode: string;
  supplierName: string;
}

export interface ServiceApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export const operatorServiceApprovalApi = {
  async list(params?: {
    status?: string;
    serviceKey?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ServiceApprovalItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const sp = new URLSearchParams();
      if (params?.status) sp.set('status', params.status);
      if (params?.serviceKey) sp.set('serviceKey', params.serviceKey);
      if (params?.page) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      const response = await api.get(`/neture/operator/service-approvals${qs}`);
      const result = response.data;
      return {
        data: result.data || [],
        pagination: result.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
      };
    } catch {
      return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
  },

  async stats(): Promise<ServiceApprovalStats> {
    try {
      const response = await api.get('/neture/operator/service-approvals/stats');
      return response.data?.data || { pending: 0, approved: 0, rejected: 0, total: 0 };
    } catch {
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  },

  async approve(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/operator/service-approvals/${id}/approve`);
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'NETWORK_ERROR' };
    }
  },

  async reject(id: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/operator/service-approvals/${id}/reject`, { reason });
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'NETWORK_ERROR' };
    }
  },
};
