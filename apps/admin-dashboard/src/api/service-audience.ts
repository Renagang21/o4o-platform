import { api } from './base';

export interface ServiceAudiencePolicy {
  serviceKey: string;
  serviceName: string;
  isPharmacyTargetService: boolean;
  note: string | null;
  updatedAt: string | null;
  persisted: boolean;
}

export const serviceAudiencePolicyApi = {
  async list(): Promise<ServiceAudiencePolicy[]> {
    try {
      const response = await api.get('/neture/admin/service-audience-policies');
      return response.data?.data ?? [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Service Audience API] Failed to list:', error);
      throw error;
    }
  },

  async update(
    serviceKey: string,
    payload: { isPharmacyTargetService?: boolean; note?: string | null },
  ): Promise<{ success: boolean; error?: string; data?: ServiceAudiencePolicy }> {
    try {
      const response = await api.put(`/neture/admin/service-audience-policies/${serviceKey}`, payload);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error?.code || 'UPDATE_FAILED' };
    }
  },
};
