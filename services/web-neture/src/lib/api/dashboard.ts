/**
 * Dashboard Summary APIs
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from '../apiClient';

// ==================== Supplier Dashboard Summary Types ====================

export interface SupplierDashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  recentApprovals: number;
  totalProducts: number;
  activeProducts: number;
  totalContents: number;
  publishedContents: number;
  connectedServices: number;
}

export interface ServiceStat {
  serviceId: string;
  serviceName: string;
  pending: number;
  approved: number;
  rejected: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  sellerName: string;
  productName: string;
  serviceName: string;
  timestamp: string;
}

export interface SupplierDashboardSummary {
  stats: SupplierDashboardStats;
  serviceStats: ServiceStat[];
  recentActivity: RecentActivity[];
}

// ==================== Operator Dashboard 5-Block Types (WO-O4O-LEGACY-ADMIN-DASHBOARD-SUNSET-V1) ====================

export interface OperatorDashboardData {
  kpis: Array<{ key: string; label: string; value: number | string; delta?: number; status?: string; link?: string }>;
  aiSummary?: Array<{ id: string; message: string; level: string; link?: string }>;
  actionQueue: Array<{ id: string; label: string; count: number; link: string }>;
  activityLog: Array<{ id: string; message: string; timestamp: string }>;
  quickActions: Array<{ id: string; label: string; link: string; icon?: string }>;
}

// (은퇴) Partner Dashboard Summary Types — WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1

// ==================== Admin Dashboard 4-Block (WO-O4O-ADMIN-OPERATOR-DASHBOARD-SEPARATION-V1) ====================

export async function fetchAdminDashboard() {
  try {
    const response = await api.get('/neture/admin/dashboard');
    return response.data?.data ?? null;
  } catch (error) {
    console.warn('[Admin Dashboard] Fetch failed:', error);
    if ((error as any)?.response?.status === 404) return null;
    throw error;
  }
}

// ==================== Dashboard API ====================

export const dashboardApi = {
  async getSupplierDashboardSummary(): Promise<SupplierDashboardSummary | null> {
    try {
      const response = await api.get('/neture/supplier/dashboard/summary');
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch supplier dashboard summary:', error);
      if ((error as any)?.response?.status === 404) return null;
      throw error;
    }
  },

  async getOperatorDashboard(): Promise<OperatorDashboardData | null> {
    try {
      const response = await api.get('/neture/operator/dashboard');
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch operator dashboard:', error);
      if ((error as any)?.response?.status === 404) return null;
      throw error;
    }
  },

  // WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1: content.ts(contentAssetApi) 에서 이동. backend /dashboard/assets/supplier-signal 은 product_approvals 기반으로 보존된다.
  async getSupplierSignal(): Promise<{ success: boolean; hasApprovedSupplier: boolean }> {
    try {
      const response = await api.get('/dashboard/assets/supplier-signal');
      return response.data;
    } catch {
      return { success: false, hasApprovedSupplier: false };
    }
  },

  async getSellerSignal(): Promise<{ success: boolean; hasApprovedSeller: boolean }> {
    try {
      const response = await api.get('/dashboard/assets/seller-signal');
      return response.data;
    } catch {
      return { success: false, hasApprovedSeller: false };
    }
  },

};
