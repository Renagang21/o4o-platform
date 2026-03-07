/**
 * Dashboard Summary APIs
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';

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

// ==================== Admin Dashboard Summary Types ====================

export interface AdminDashboardStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalPartnershipRequests: number;
  openPartnershipRequests: number;
  totalContents: number;
  publishedContents: number;
}

export interface ServiceStatus {
  serviceId: string;
  serviceName: string;
  suppliers: number;
  partners: number;
  status: string;
}

export interface RecentApplication {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  text: string;
  time: string;
}

export interface AppContentSummary {
  totalPublished: number;
  recentItems: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    isPinned: boolean;
    publishedAt: string | null;
    createdAt: string;
  }>;
}

export interface AppSignageSummary {
  totalMedia: number;
  totalPlaylists: number;
  recentMedia: Array<{
    id: string;
    name: string;
    mediaType: string;
    url: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    metadata: Record<string, unknown>;
  }>;
  recentPlaylists: Array<{
    id: string;
    name: string;
    description: string | null;
    itemCount: number;
    totalDuration: number;
  }>;
}

export interface AppForumSummary {
  totalPosts: number;
  recentPosts: Array<{
    id: string;
    title: string;
    authorName: string | null;
    createdAt: string;
    categoryName: string | null;
  }>;
}

export interface AdminDashboardSummary {
  stats: AdminDashboardStats;
  content?: AppContentSummary;
  signage?: AppSignageSummary;
  forum?: AppForumSummary;
  serviceStatus: ServiceStatus[];
  recentApplications: RecentApplication[];
  recentActivities: RecentActivityItem[];
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

  async getAdminDashboardSummary(): Promise<AdminDashboardSummary | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/admin/dashboard/summary`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[Dashboard API] Admin dashboard summary not available');
        return null;
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('[Dashboard API] Failed to fetch admin dashboard summary:', error);
      return null;
    }
  },

  async getSellerSignal(): Promise<{ success: boolean; hasApprovedSeller: boolean }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/seller-signal`,
        { credentials: 'include' }
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
