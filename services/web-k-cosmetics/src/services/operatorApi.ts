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

export const operatorApi = {
  async getDashboardSummary(): Promise<OperatorDashboardSummary | null> {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/cosmetics/admin/dashboard/summary`, {
        headers,
      });

      if (!response.ok) {
        console.error('Failed to fetch operator dashboard summary:', response.status);
        return null;
      }

      const json = await response.json();
      return json.data || null;
    } catch (error) {
      console.error('Error fetching operator dashboard summary:', error);
      return null;
    }
  },
};
