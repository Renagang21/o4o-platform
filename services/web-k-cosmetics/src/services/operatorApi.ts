/**
 * Operator Dashboard API
 * K-Cosmetics 운영자 대시보드 API
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.o4o.world';

export interface OperatorDashboardSummary {
  stats: {
    totalStores: number;
    activeOrders: number;
    monthlyRevenue: string;
    newSignups: number;
  };
  recentOrders: Array<{
    id: string;
    store: string;
    amount: string;
    status: string;
    time: string;
  }>;
  recentApplications: Array<{
    name: string;
    type: string;
    date: string;
    status: string;
  }>;
}

async function getAuthToken(): Promise<string | null> {
  // Try to get token from localStorage
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.accessToken || parsed.token || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export interface StoreMemberInfo {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  role: string;
  isActive: boolean;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  createdAt: string;
}

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options?.headers || {}) },
      credentials: 'include',
    });

    if (!response.ok) {
      console.error(`[OperatorAPI] ${endpoint} failed:`, response.status);
      return null;
    }

    const json = await response.json();
    return json.data || null;
  } catch (error) {
    console.error(`[OperatorAPI] ${endpoint} error:`, error);
    return null;
  }
}

export const operatorApi = {
  async getDashboardSummary(): Promise<OperatorDashboardSummary | null> {
    return fetchWithAuth<OperatorDashboardSummary>('/cosmetics/admin/dashboard/summary');
  },

  async getMembers(includeInactive = false): Promise<StoreMemberInfo[] | null> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return fetchWithAuth<StoreMemberInfo[]>(`/cosmetics/stores/admin/members${qs}`);
  },

  async deactivateMember(memberId: string): Promise<boolean> {
    const result = await fetchWithAuth(`/cosmetics/stores/admin/members/${memberId}/deactivate`, {
      method: 'PATCH',
    });
    return result !== null;
  },

  async reactivateMember(memberId: string): Promise<boolean> {
    const result = await fetchWithAuth(`/cosmetics/stores/admin/members/${memberId}/reactivate`, {
      method: 'PATCH',
    });
    return result !== null;
  },
};
