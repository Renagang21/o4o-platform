import type {AxiosInstance} from 'axios';
import type {SettlementStatus,SettlementsResponse,SettlementDetail,AdminSettlementKpi} from './settlement-types';
export function createAdminSettlementApi(api:AxiosInstance) {
const ADMIN_SETTLEMENT_KPI_DEFAULT: AdminSettlementKpi = {
  calculated_count: 0, calculated_amount: 0,
  approved_count: 0, approved_amount: 0,
  paid_count: 0, paid_amount: 0,
};

const adminSettlementApi = {
  async getSettlements(
    params?: { page?: number; limit?: number; status?: SettlementStatus }
  ): Promise<SettlementsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await api.get(`/neture/admin/settlements${qs}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Admin Settlement API] Failed to fetch settlements:', error);
      throw error;
    }
  },

  async getKpi(): Promise<AdminSettlementKpi> {
    try {
      const response = await api.get('/neture/admin/settlements/kpi');
      return response.data.data || ADMIN_SETTLEMENT_KPI_DEFAULT;
    } catch {
      return ADMIN_SETTLEMENT_KPI_DEFAULT;
    }
  },

  async getDetail(id: string): Promise<SettlementDetail | null> {
    try {
      const response = await api.get(`/neture/admin/settlements/${id}`);
      return response.data.data || null;
    } catch { return null; }
  },

  async calculate(periodStart: string, periodEnd: string): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await api.post('/neture/admin/settlements/calculate', {
        period_start: periodStart,
        period_end: periodEnd,
      });
      return response.data;
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response;
      const conflict = response?.data;
      if (response?.status === 409 && conflict?.error &&
          ['DUPLICATE_SETTLEMENT', 'SETTLEMENT_ORDER_SUPPLIER_CONFLICT'].includes(conflict.error)) {
        return { success: false, error: conflict.error, message: typeof conflict.message === 'string' ? conflict.message : undefined };
      }
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async approve(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/settlements/${id}/approve`, { notes });
      return true;
    } catch { return false; }
  },

  async pay(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/settlements/${id}/pay`, { notes });
      return true;
    } catch { return false; }
  },

  async cancel(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/settlements/${id}/status`, { status: 'cancelled', notes });
      return true;
    } catch { return false; }
  },
};


return adminSettlementApi;
}
