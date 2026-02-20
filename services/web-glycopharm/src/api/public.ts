/**
 * Public API Client - 인증 불필요 공개 API
 *
 * Work Order: WO-GP-HOME-RESTRUCTURE-V1 (Phase 6)
 *
 * 용도:
 * - Home 화면 데이터 로딩
 * - 인증 없이 접근 가능한 공개 콘텐츠
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export interface NowRunningItem {
  id: string;
  type: 'trial' | 'event' | 'campaign';
  title: string;
  supplier?: string;
  deadline?: string;
  participants?: number;
  link: string;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  link: string;
}

export interface PublicApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    source: 'static' | 'database';
    pinnedCount?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// WO-HOME-UX-ZERO-STATE-V1: Metric status for zero-state UX
export type MetricStatus = 'OK' | 'ZERO' | 'TABLE_MISSING' | 'NOT_ACTIVATED';

// WO-HOME-LIVE-PREVIEW-V1: Home Preview 데이터 타입
export interface HomePreviewData {
  care: {
    totalPatients: number;
    totalPatientsStatus?: MetricStatus;
    highRiskCount: number;
    highRiskCountStatus?: MetricStatus;
    recentCoaching: number;
    recentCoachingStatus?: MetricStatus;
    recentAnalysis: number;
    recentAnalysisStatus?: MetricStatus;
    recentChanges: Array<{
      tirChange?: number;
      cvChange?: number;
      riskTrend: 'improving' | 'stable' | 'worsening';
    }>;
  };
  store: {
    monthlyOrders: number;
    monthlyOrdersStatus?: MetricStatus;
    pendingRequests: number;
    pendingRequestsStatus?: MetricStatus;
    activeProducts: number;
    activeProductsStatus?: MetricStatus;
    monthlyRevenue: number;
    monthlyRevenueStatus?: MetricStatus;
  };
}

// ============================================================================
// Fallback Data (API 실패 시 사용)
// ============================================================================

const fallbackNowRunning: NowRunningItem[] = [
  {
    id: '1',
    type: 'trial',
    title: '당뇨병 환자용 신규 영양제 Trial',
    supplier: '글루코헬스',
    deadline: '2026.01.31',
    participants: 23,
    link: '/store/market-trial',
  },
  {
    id: '2',
    type: 'event',
    title: '혈당관리 앱 연동 이벤트',
    supplier: 'GlucoseView',
    deadline: '2026.02.15',
    link: '/store/market-trial',
  },
  {
    id: '3',
    type: 'campaign',
    title: '당뇨인의 날 캠페인',
    deadline: '2026.03.14',
    link: '/forum-ext',
  },
];

const fallbackNotices: Notice[] = [
  {
    id: '1',
    title: '[공지] GlycoPharm 서비스 업데이트 안내 (v2.0)',
    date: '2026.01.06',
    isPinned: true,
    link: '/forum-ext',
  },
  {
    id: '2',
    title: '[안내] Market Trial 참여 가이드',
    date: '2026.01.05',
    isPinned: true,
    link: '/forum-ext',
  },
  {
    id: '3',
    title: '1월 Signage 콘텐츠 업데이트',
    date: '2026.01.03',
    isPinned: false,
    link: '/forum-ext',
  },
  {
    id: '4',
    title: '협력 공급사 추가 안내',
    date: '2026.01.02',
    isPinned: false,
    link: '/forum-ext',
  },
];

// ============================================================================
// API Client
// ============================================================================

class PublicApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        code: errorData.error?.code || 'UNKNOWN_ERROR',
        message: errorData.error?.message || 'Request failed',
      };
    }

    return response.json();
  }

  /**
   * 진행 중인 Trial/Event/Campaign 조회
   */
  async getNowRunning(): Promise<NowRunningItem[]> {
    try {
      const response = await this.request<PublicApiResponse<NowRunningItem[]>>(
        '/api/v1/glycopharm/public/now-running'
      );
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch now-running, using fallback:', error);
      return fallbackNowRunning;
    }
  }

  /**
   * 운영 공지 조회
   */
  async getNotices(): Promise<Notice[]> {
    try {
      const response = await this.request<PublicApiResponse<Notice[]>>(
        '/api/v1/glycopharm/public/notices'
      );
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch notices, using fallback:', error);
      return fallbackNotices;
    }
  }

  /**
   * Health check
   */
  async health(): Promise<boolean> {
    try {
      await this.request<{ success: boolean }>('/api/v1/glycopharm/public/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * WO-HOME-LIVE-PREVIEW-V1: Home Preview 집계 데이터
   * 인증 토큰이 있으면 pharmacy-scoped, 없으면 global aggregate
   */
  async getHomePreview(accessToken?: string | null): Promise<HomePreviewData> {
    const fallback: HomePreviewData = {
      care: { totalPatients: 0, highRiskCount: 0, recentCoaching: 0, recentAnalysis: 0, recentChanges: [] },
      store: { monthlyOrders: 0, pendingRequests: 0, activeProducts: 0, monthlyRevenue: 0 },
    };

    try {
      const url = `${this.baseUrl}/api/v1/home/preview`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return fallback;

      const json = await response.json();
      return json.data || fallback;
    } catch {
      return fallback;
    }
  }
}

// Export singleton instance
export const publicApi = new PublicApiClient(API_BASE_URL);

// Export fallback data for direct use
export { fallbackNowRunning, fallbackNotices };

// Also export the class for testing
export { PublicApiClient };
