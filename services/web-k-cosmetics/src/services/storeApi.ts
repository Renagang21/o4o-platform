/**
 * Store API - K-Cosmetics 매장 콕핏 API
 * WO-KCOS-STORES-PHASE3-STORE-COCKPIT-V1
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.o4o.world';

// ============================================================================
// Types
// ============================================================================

export interface StoreInfo {
  id: string;
  name: string;
  code: string;
  businessNumber: string;
  ownerName: string;
  contactPhone?: string;
  address?: string;
  region?: string;
  status: string;
  memberCount: number;
  listingCount: number;
  myRole: string;
  createdAt: string;
}

export interface StoreSummaryStats {
  todayOrders: number;
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  totalOrders: number;
}

export interface ChannelBreakdown {
  channel: string;
  orderCount: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  channel: string | null;
  createdAt: string;
}

export interface StoreSummary {
  stats: StoreSummaryStats;
  channelBreakdown: ChannelBreakdown[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
}

export interface StoreListing {
  id: string;
  productId: string;
  priceOverride?: number | null;
  isVisible: boolean;
  sortOrder: number;
  product?: {
    id: string;
    name: string;
    brand?: { id: string; name: string };
  };
  createdAt: string;
}

// ============================================================================
// Auth Helper
// ============================================================================

async function getAuthToken(): Promise<string | null> {
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

async function fetchWithAuth<T>(endpoint: string): Promise<T | null> {
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/cosmetics/stores${endpoint}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      console.error(`[StoreAPI] ${endpoint} failed:`, response.status);
      return null;
    }

    const json = await response.json();
    return json.data || null;
  } catch (error) {
    console.error(`[StoreAPI] ${endpoint} error:`, error);
    return null;
  }
}

// ============================================================================
// API Functions
// ============================================================================

export const storeApi = {
  /** 내 매장 목록 */
  async getMyStores(): Promise<StoreInfo[] | null> {
    return fetchWithAuth<StoreInfo[]>('/me');
  },

  /** 매장 상세 */
  async getStoreDetail(storeId: string): Promise<StoreInfo | null> {
    return fetchWithAuth<StoreInfo>(`/${storeId}`);
  },

  /** 매장 KPI 요약 */
  async getStoreSummary(storeId: string): Promise<StoreSummary | null> {
    return fetchWithAuth<StoreSummary>(`/${storeId}/summary`);
  },

  /** 매장 상품 리스팅 */
  async getStoreListings(storeId: string, query?: { page?: number; limit?: number }): Promise<{
    listings: StoreListing[];
    meta: { total: number };
  } | null> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${API_URL}/cosmetics/stores/${storeId}/listings${qs ? `?${qs}` : ''}`;
      const response = await fetch(url, { headers, credentials: 'include' });

      if (!response.ok) return null;

      const json = await response.json();
      return {
        listings: json.data || [],
        meta: json.meta || { total: 0 },
      };
    } catch {
      return null;
    }
  },

  /** 매장 멤버 목록 */
  async getStoreMembers(storeId: string): Promise<Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: string;
  }> | null> {
    return fetchWithAuth(`/${storeId}/members`);
  },
};
