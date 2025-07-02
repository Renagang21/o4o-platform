import create from 'zustand';
import { persist } from 'zustand/middleware';

export interface Partner {
  id: string;
  partnerCode: string;
  name: string;
  email: string;
  phone: string;
  description?: string;
  commissionRate: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  // totalEarnings 제거 - 오프라인 처리
  totalReferrals: number;
  createdAt: string;
}

export interface ReferralLink {
  id: string;
  productId: string;
  productName: string;
  referralUrl: string;
  clicks: number;
  conversions: number;
  // earnings 제거 - 오프라인 처리
  createdAt: string;
}

export interface PartnerStats {
  totalClicks: number;
  totalConversions: number;
  // totalEarnings 제거 - 오프라인 처리
  conversionRate: number;
  dailyStats: Array<{
    date: string;
    clicks: number;
    conversions: number;
    // earnings 제거 - 오프라인 처리
  }>;
}

export interface PartnerApplication {
  name: string;
  email: string;
  phone: string;
  description: string;
  agreeToTerms: boolean;
}
export interface PartnerState {
  // 현재 파트너 정보
  partner: Partner | null;
  
  // 추천 링크 목록
  referralLinks: ReferralLink[];
  
  // 통계 정보
  stats: PartnerStats | null;
  
  // 로딩 상태
  loading: {
    apply: boolean;
    profile: boolean;
    links: boolean;
    stats: boolean;
  };
  
  // 에러 상태
  error: string | null;
  
  // API 호출 함수들
  applyAsPartner: (application: PartnerApplication) => Promise<void>;
  getPartnerProfile: (partnerCode: string) => Promise<void>;
  generateReferralLink: (productId: string) => Promise<ReferralLink>;
  getReferralLinks: () => Promise<void>;
  getPartnerStats: () => Promise<void>;
  trackClick: (linkId: string) => Promise<void>;
  clearError: () => void;
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      partner: null,
      referralLinks: [],
      stats: null,
      loading: {
        apply: false,
        profile: false,
        links: false,
        stats: false,
      },
      error: null,

      // Partner 신청
      applyAsPartner: async (application: PartnerApplication) => {
        set((state) => ({ 
          ...state, 
          loading: { ...state.loading, apply: true },
          error: null 
        }));
        
        try {
          const response = await fetch('/api/partner/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(application),
          });
          
          if (!response.ok) {
            throw new Error('파트너 신청에 실패했습니다.');
          }
          
          const data = await response.json();
          set((state) => ({ 
            ...state, 
            partner: data.partner,
            loading: { ...state.loading, apply: false }
          }));
        } catch (error) {
          set((state) => ({ 
            ...state, 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            loading: { ...state.loading, apply: false }
          }));
          throw error;
        }
      },
      // Partner 프로필 조회
      getPartnerProfile: async (partnerCode: string) => {
        set((state) => ({ 
          ...state, 
          loading: { ...state.loading, profile: true },
          error: null 
        }));
        
        try {
          const response = await fetch(`/api/partner/profile/${partnerCode}`);
          
          if (!response.ok) {
            throw new Error('파트너 정보를 불러올 수 없습니다.');
          }
          
          const data = await response.json();
          set((state) => ({ 
            ...state, 
            partner: data.partner,
            loading: { ...state.loading, profile: false }
          }));
        } catch (error) {
          set((state) => ({ 
            ...state, 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            loading: { ...state.loading, profile: false }
          }));
        }
      },

      // 추천 링크 생성
      generateReferralLink: async (productId: string) => {
        set((state) => ({ 
          ...state, 
          loading: { ...state.loading, links: true },
          error: null 
        }));
        
        try {
          const response = await fetch('/api/partner/generate-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
          });
          
          if (!response.ok) {
            throw new Error('링크 생성에 실패했습니다.');
          }
          
          const data = await response.json();
          const newLink = data.referralLink;
          
          set((state) => ({ 
            ...state, 
            referralLinks: [...state.referralLinks, newLink],
            loading: { ...state.loading, links: false }
          }));
          
          return newLink;
        } catch (error) {
          set((state) => ({ 
            ...state, 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            loading: { ...state.loading, links: false }
          }));
          throw error;
        }
      },
      // 추천 링크 목록 조회
      getReferralLinks: async () => {
        set((state) => ({ 
          ...state, 
          loading: { ...state.loading, links: true },
          error: null 
        }));
        
        try {
          const response = await fetch('/api/partner/referral-links');
          
          if (!response.ok) {
            throw new Error('링크 목록을 불러올 수 없습니다.');
          }
          
          const data = await response.json();
          set((state) => ({ 
            ...state, 
            referralLinks: data.links,
            loading: { ...state.loading, links: false }
          }));
        } catch (error) {
          set((state) => ({ 
            ...state, 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            loading: { ...state.loading, links: false }
          }));
        }
      },

      // 파트너 통계 조회
      getPartnerStats: async () => {
        set((state) => ({ 
          ...state, 
          loading: { ...state.loading, stats: true },
          error: null 
        }));
        
        try {
          const response = await fetch('/api/partner/stats');
          
          if (!response.ok) {
            throw new Error('통계 정보를 불러올 수 없습니다.');
          }
          
          const data = await response.json();
          set((state) => ({ 
            ...state, 
            stats: data.stats,
            loading: { ...state.loading, stats: false }
          }));
        } catch (error) {
          set((state) => ({ 
            ...state, 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            loading: { ...state.loading, stats: false }
          }));
        }
      },

      // 클릭 추적
      trackClick: async (linkId: string) => {
        try {
          await fetch('/api/partner/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkId }),
          });
          // 클릭 추적은 백그라운드에서 실행, UI 업데이트 없음
        } catch (error) {
          console.error('클릭 추적 실패:', error);
          // 클릭 추적 실패는 사용자에게 표시하지 않음
        }
      },

      // 에러 클리어
      clearError: () => {
        set((state) => ({ ...state, error: null }));
      },
    }),
    {
      name: 'partner-storage',
      partialize: (state) => ({
        partner: state.partner,
        referralLinks: state.referralLinks,
      }),
    }
  )
);