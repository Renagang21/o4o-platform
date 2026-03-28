/**
 * Service Approval API Client
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
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
  // WO-NETURE-OPERATOR-REVIEW-UX-V1: 규제/완성도 필드
  regulatoryType: string | null;
  mfdsPermitNumber: string | null;
  isMfdsVerified: boolean;
  offerApprovalStatus: string;
  distributionType: string | null;
  completenessScore: number;
  // WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1: 카드 UI 추가 필드
  imageUrl: string | null;
  brandName: string | null;
  priceGeneral: number | null;
  // WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: 품질 판단 필드
  hasShortDescription: boolean;
  hasDetailDescription: boolean;
  imageCount: number;
}

export interface ServiceApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  todayPending: number; // WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
}

// WO-NETURE-APPROVAL-ANALYTICS-LITE-V1 + ENHANCEMENT-V1 + ACTIONABLE-INSIGHTS-V1
export interface ApprovalAnalytics {
  summary: { total: number; approved: number; rejected: number; pending: number; approvalRate: number };
  topRejectionReasons: Array<{ reason: string; count: number }>;
  avgProcessingTimeHours: number;
  supplierApprovalRates: Array<{ supplierId: string; supplierName: string; approvalRate: number; total: number }>;
  alerts?: {
    lowQualitySuppliers: Array<{ supplierId: string; supplierName: string; approvalRate: number; total: number }>;
    stalePendingCount: number;
  };
}

export const operatorServiceApprovalApi = {
  async list(params?: {
    status?: string;
    serviceKey?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    minScore?: number;
    maxScore?: number;
    hasIssues?: string;
  }): Promise<{
    data: ServiceApprovalItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const sp = new URLSearchParams();
      if (params?.status) sp.set('status', params.status);
      if (params?.serviceKey) sp.set('serviceKey', params.serviceKey);
      if (params?.search) sp.set('search', params.search);
      if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
      if (params?.dateTo) sp.set('dateTo', params.dateTo);
      if (params?.page) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(params.limit));
      if (params?.minScore != null) sp.set('minScore', String(params.minScore));
      if (params?.maxScore != null) sp.set('maxScore', String(params.maxScore));
      if (params?.hasIssues) sp.set('hasIssues', params.hasIssues);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      const response = await api.get(`/neture/operator/service-approvals${qs}`);
      const result = response.data;
      return {
        data: result.data || [],
        pagination: result.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
      };
    } catch (err: any) {
      if (err?.response?.status === 403) {
        throw new Error('접근 권한이 없습니다');
      }
      return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
  },

  async stats(): Promise<ServiceApprovalStats> {
    try {
      const response = await api.get('/neture/operator/service-approvals/stats');
      return response.data?.data || { pending: 0, approved: 0, rejected: 0, total: 0, todayPending: 0 };
    } catch (err: any) {
      if (err?.response?.status === 403) {
        throw new Error('접근 권한이 없습니다');
      }
      return { pending: 0, approved: 0, rejected: 0, total: 0, todayPending: 0 };
    }
  },

  async approve(id: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/operator/service-approvals/${id}/approve`, { reason });
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

  // WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
  async batchApprove(ids: string[], reason?: string): Promise<{ success: boolean; error?: string; data?: { approved: number; failed: number } }> {
    try {
      const response = await api.post('/neture/operator/service-approvals/batch-approve', { ids, reason });
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'NETWORK_ERROR' };
    }
  },

  async batchReject(ids: string[], reason?: string): Promise<{ success: boolean; error?: string; data?: { rejected: number; failed: number } }> {
    try {
      const response = await api.post('/neture/operator/service-approvals/batch-reject', { ids, reason });
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'NETWORK_ERROR' };
    }
  },

  // WO-NETURE-APPROVAL-ANALYTICS-LITE-V1 + ENHANCEMENT-V1
  async analytics(period?: string): Promise<ApprovalAnalytics | null> {
    try {
      const qs = period && period !== 'all' ? `?period=${period}` : '';
      const response = await api.get(`/neture/operator/approval-analytics${qs}`);
      return response.data?.data || null;
    } catch {
      return null;
    }
  },
};
