/**
 * Dashboard Summary APIs
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
import { getAccessToken } from '../../contexts/AuthContext';

// WO-O4O-DASHBOARD-AUTH-API-NORMALIZE-V1: Bearer token headers for cross-domain
function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/dashboard/summary`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!response.ok) {
        console.warn('[Dashboard API] Supplier dashboard summary not available');
        return null;
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch supplier dashboard summary:', error);
      return null;
    }
  },

  async getOperatorDashboard(): Promise<OperatorDashboardData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/operator/dashboard`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!response.ok) {
        console.warn('[Dashboard API] Operator dashboard not available');
        return null;
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch operator dashboard:', error);
      return null;
    }
  },

  async getSellerSignal(): Promise<{ success: boolean; hasApprovedSeller: boolean }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/seller-signal`,
        { credentials: 'include', headers: authHeaders() }
      );
      if (!response.ok) return { success: false, hasApprovedSeller: false };
      return response.json();
    } catch {
      return { success: false, hasApprovedSeller: false };
    }
  },

  async getPartnerDashboardSummary(): Promise<PartnerDashboardSummary | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/partner/dashboard/summary`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!response.ok) {
        console.warn('[Dashboard API] Partner dashboard summary not available');
        return null;
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch partner dashboard summary:', error);
      return null;
    }
  },
};
