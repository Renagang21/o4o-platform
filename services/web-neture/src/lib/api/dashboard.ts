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

// ==================== Partner Dashboard Summary Types ====================

export interface PartnerDashboardStats {
  totalRequests: number;
  openRequests: number;
  matchedRequests: number;
  closedRequests: number;
  connectedServiceCount: number;
  totalSupplierCount: number;
}

export interface ConnectedService {
  serviceId: string;
  serviceName: string;
  supplierCount: number;
  lastActivity: string;
}

export interface Notification {
  type: string;
  text: string;
  link: string;
}

export interface PartnerDashboardSummary {
  stats: PartnerDashboardStats;
  connectedServices: ConnectedService[];
  notifications: Notification[];
}

// ==================== Dashboard API ====================

export const dashboardApi = {
  async getSupplierDashboardSummary(): Promise<SupplierDashboardSummary | null> {
    try {
      const response = await api.get('/neture/supplier/dashboard/summary');
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch supplier dashboard summary:', error);
      return null;
    }
  },

  async getOperatorDashboard(): Promise<OperatorDashboardData | null> {
    try {
      const response = await api.get('/neture/operator/dashboard');
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch operator dashboard:', error);
      return null;
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

  async getPartnerDashboardSummary(): Promise<PartnerDashboardSummary | null> {
    try {
      const response = await api.get('/neture/partner/dashboard/summary');
      return response.data?.data ?? null;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch partner dashboard summary:', error);
      return null;
    }
  },
};
