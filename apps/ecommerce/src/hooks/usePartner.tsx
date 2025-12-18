/**
 * Partner Context & Hook
 *
 * 파트너 상태 관리 및 Context Provider
 *
 * @package Phase K - Partner Flow
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authClient } from '@o4o/auth-client';
import {
  captureAttribution,
  mapAttributionToUser,
  cleanUrlAfterCapture,
} from '../lib/partner-attribution';

/**
 * 파트너 링크 정보
 */
export interface PartnerLink {
  id: string;
  code: string;
  targetType: string;
  targetId?: string;
  clickCount: number;
  conversionCount: number;
  createdAt: string;
}

/**
 * 파트너 통계
 */
export interface PartnerStats {
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  conversionRate: number;
  pendingEarnings: number;
}

/**
 * 파트너 정보
 */
export interface Partner {
  id: string;
  userId: string;
  name: string;
  level: 'newbie' | 'standard' | 'pro' | 'elite';
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  commissionRate: number;
  profileImage?: string;
  socialLinks?: Record<string, string>;
  createdAt: string;
}

/**
 * Partner Context 상태
 */
export interface PartnerContextState {
  // 상태
  currentPartner: Partner | null;
  isPartner: boolean;
  isLoading: boolean;
  error: string | null;

  // 링크 & 통계
  links: PartnerLink[];
  stats: PartnerStats;

  // 액션
  refreshPartner: () => Promise<void>;
  createLink: (targetType: string, targetId?: string) => Promise<PartnerLink | null>;
  fetchLinks: () => Promise<void>;
  fetchStats: () => Promise<void>;

  // 가입
  signup: (name: string, socialLinks?: Record<string, string>) => Promise<boolean>;
}

const defaultStats: PartnerStats = {
  totalClicks: 0,
  totalConversions: 0,
  totalEarnings: 0,
  conversionRate: 0,
  pendingEarnings: 0,
};

const PartnerContext = createContext<PartnerContextState | null>(null);

/**
 * Partner Context Provider
 */
export function PartnerProvider({ children }: { children: ReactNode }) {
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [stats, setStats] = useState<PartnerStats>(defaultStats);

  // Attribution 캡처 (마운트 시)
  useEffect(() => {
    const attribution = captureAttribution();
    if (attribution?.source === 'url') {
      // URL에서 캡처한 경우 히스토리 정리
      cleanUrlAfterCapture();
    }
  }, []);

  // 로그인 상태 변경 시 파트너 정보 로드
  useEffect(() => {
    const loadPartner = async () => {
      const user = authClient.getCurrentUser();
      if (!user) {
        setCurrentPartner(null);
        setIsLoading(false);
        return;
      }

      // userId-partnerCode 매핑 (Attribution)
      mapAttributionToUser(user.id);

      try {
        const response = await authClient.api.get<{ data: Partner }>(
          '/api/partner/me'
        );
        if (response.data) {
          setCurrentPartner(response.data);
        }
      } catch (err: any) {
        // 404는 파트너가 아닌 것 (정상)
        if (err?.response?.status !== 404) {
          console.error('Failed to load partner info:', err);
        }
        setCurrentPartner(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPartner();
  }, []);

  // 파트너 정보 새로고침
  const refreshPartner = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authClient.api.get<{ data: Partner }>(
        '/api/partner/me'
      );
      setCurrentPartner(response.data || null);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        setError('파트너 정보를 불러오는 데 실패했습니다.');
      }
      setCurrentPartner(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 링크 목록 조회
  const fetchLinks = useCallback(async () => {
    if (!currentPartner) return;
    try {
      const response = await authClient.api.get<{ data: PartnerLink[] }>(
        '/api/partner/links'
      );
      setLinks(response.data || []);
    } catch (err) {
      console.error('Failed to fetch links:', err);
    }
  }, [currentPartner]);

  // 통계 조회
  const fetchStats = useCallback(async () => {
    if (!currentPartner) return;
    try {
      const response = await authClient.api.get<{ data: PartnerStats }>(
        '/api/partner/dashboard'
      );
      setStats(response.data || defaultStats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [currentPartner]);

  // 링크 생성
  const createLink = useCallback(
    async (
      targetType: string,
      targetId?: string
    ): Promise<PartnerLink | null> => {
      if (!currentPartner) return null;
      try {
        const response = await authClient.api.post<{ data: PartnerLink }>(
          '/api/partner/links',
          { targetType, targetId }
        );
        const newLink = response.data;
        if (newLink) {
          setLinks((prev) => [newLink, ...prev]);
        }
        return newLink || null;
      } catch (err) {
        console.error('Failed to create link:', err);
        return null;
      }
    },
    [currentPartner]
  );

  // 파트너 가입
  const signup = useCallback(
    async (
      name: string,
      socialLinks?: Record<string, string>
    ): Promise<boolean> => {
      try {
        const response = await authClient.api.post<{ data: Partner }>(
          '/api/partner/signup',
          { name, socialLinks }
        );
        if (response.data) {
          setCurrentPartner(response.data);
          return true;
        }
        return false;
      } catch (err: any) {
        setError(err?.response?.data?.message || '가입에 실패했습니다.');
        return false;
      }
    },
    []
  );

  const value: PartnerContextState = {
    currentPartner,
    isPartner: !!currentPartner,
    isLoading,
    error,
    links,
    stats,
    refreshPartner,
    createLink,
    fetchLinks,
    fetchStats,
    signup,
  };

  return (
    <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>
  );
}

/**
 * Partner Context Hook
 */
export function usePartner(): PartnerContextState {
  const context = useContext(PartnerContext);
  if (!context) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return context;
}

/**
 * 파트너 여부만 간단히 확인하는 Hook
 */
export function useIsPartner(): { isPartner: boolean; isLoading: boolean } {
  const { isPartner, isLoading } = usePartner();
  return { isPartner, isLoading };
}
