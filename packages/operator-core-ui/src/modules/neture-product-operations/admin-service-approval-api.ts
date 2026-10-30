import type { AxiosInstance } from 'axios';

export interface ServiceApproval {
  id: string;
  productName: string;
  supplierName: string;
  sellerOrg: string;
  serviceId: string;
  status: string;
  requestedAt: string;
  decidedAt?: string;
  rejectReason?: string;
}

export function createAdminServiceApprovalApi(api: AxiosInstance) { return {
  async getServiceApprovals(status?: string): Promise<ServiceApproval[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/admin/service-approvals${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      throw error;
    }
  },

  async approveServiceApproval(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/service-approvals/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/service-approvals/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  async revokeServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/service-approvals/${id}/revoke`, { reason });
      return true;
    } catch { return false; }
  },
}; }
