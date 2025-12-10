/**
 * OrganizationContext
 *
 * 조직 스코프를 관리하는 전역 Context.
 * 로그인 후 사용자의 primaryOrganization을 자동 로드하고
 * API 호출 시 organizationId를 자동 포함합니다.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

// Organization 타입 정의
export interface Organization {
  id: string;
  name: string;
  code: string;
  type: 'national' | 'division' | 'branch';
  level: number;
  path: string;
  parentId?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
}

// 사용자 조직 멤버십
export interface OrganizationMembership {
  organizationId: string;
  organization: Organization;
  role: 'member' | 'manager' | 'admin';
  isPrimary: boolean;
  joinedAt: string;
}

// Context 값 타입
export interface OrganizationContextValue {
  // 현재 선택된 조직
  organization: Organization | null;
  // 사용자의 모든 조직 멤버십
  memberships: OrganizationMembership[];
  // 로딩 상태
  isLoading: boolean;
  // 에러 상태
  error: string | null;
  // 조직 선택 함수
  setOrganization: (org: Organization | null) => void;
  // 조직 ID로 선택
  selectOrganizationById: (orgId: string) => Promise<void>;
  // 조직 정보 새로고침
  reloadOrganization: () => Promise<void>;
  // API 호출용 organizationId getter
  getOrganizationId: () => string | undefined;
  // 조직 타입 배지 텍스트
  getTypeBadge: () => string;
  // 조직 계층 경로
  getHierarchyPath: () => string;
}

// Context 생성
const OrganizationContext = createContext<OrganizationContextValue | null>(null);

// Provider Props
interface OrganizationProviderProps {
  children: ReactNode;
}

/**
 * OrganizationProvider
 *
 * 앱 전체에 조직 컨텍스트를 제공합니다.
 */
export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [organization, setOrganizationState] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();

  // URL에서 orgId 파라미터 추출
  const extractOrgIdFromUrl = useCallback((): string | null => {
    // /org/:orgId 패턴 체크
    const orgMatch = location.pathname.match(/^\/org\/([^/]+)/);
    if (orgMatch) {
      return orgMatch[1];
    }

    // Query parameter 체크
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('orgId');
  }, [location.pathname, location.search]);

  // 사용자의 조직 멤버십 로드
  const loadUserMemberships = useCallback(async (): Promise<OrganizationMembership[]> => {
    try {
      const response = await authClient.api.get('/organizations/my-memberships');
      return response.data.memberships || [];
    } catch (err) {
      console.error('Failed to load user memberships:', err);
      return [];
    }
  }, []);

  // 조직 상세 정보 로드
  const loadOrganization = useCallback(async (orgId: string): Promise<Organization | null> => {
    try {
      const response = await authClient.api.get(`/organizations/${orgId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to load organization:', err);
      return null;
    }
  }, []);

  // 조직 선택 함수
  const setOrganization = useCallback((org: Organization | null) => {
    setOrganizationState(org);
    if (org) {
      // localStorage에 선택한 조직 저장
      localStorage.setItem('selectedOrganizationId', org.id);
    } else {
      localStorage.removeItem('selectedOrganizationId');
    }
  }, []);

  // ID로 조직 선택
  const selectOrganizationById = useCallback(async (orgId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const org = await loadOrganization(orgId);
      if (org) {
        setOrganization(org);
      } else {
        setError('조직을 찾을 수 없습니다.');
      }
    } catch (err) {
      setError('조직 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [loadOrganization, setOrganization]);

  // 초기 로드 및 조직 정보 새로고침
  const reloadOrganization = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. 사용자 멤버십 로드
      const userMemberships = await loadUserMemberships();
      setMemberships(userMemberships);

      // 2. URL에서 orgId 확인
      const urlOrgId = extractOrgIdFromUrl();

      // 3. 저장된 조직 ID 확인
      const savedOrgId = localStorage.getItem('selectedOrganizationId');

      // 4. 조직 결정 순서: URL > 저장된 값 > primaryOrganization
      let targetOrgId: string | null = null;

      if (urlOrgId) {
        // URL에 조직 ID가 있으면 우선 사용
        targetOrgId = urlOrgId;
      } else if (savedOrgId) {
        // 저장된 조직 ID 확인
        const isMember = userMemberships.some(m => m.organizationId === savedOrgId);
        if (isMember) {
          targetOrgId = savedOrgId;
        }
      }

      // 5. 아직 없으면 primaryOrganization 사용
      if (!targetOrgId && userMemberships.length > 0) {
        const primaryMembership = userMemberships.find(m => m.isPrimary);
        if (primaryMembership) {
          targetOrgId = primaryMembership.organizationId;
        } else {
          // primary가 없으면 첫 번째 멤버십 사용
          targetOrgId = userMemberships[0].organizationId;
        }
      }

      // 6. 조직 로드
      if (targetOrgId) {
        const org = await loadOrganization(targetOrgId);
        if (org) {
          setOrganization(org);
        }
      }
    } catch (err) {
      console.error('Error reloading organization:', err);
      setError('조직 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [loadUserMemberships, loadOrganization, extractOrgIdFromUrl, setOrganization]);

  // URL 변경 시 조직 갱신
  useEffect(() => {
    const urlOrgId = extractOrgIdFromUrl();
    if (urlOrgId && urlOrgId !== organization?.id) {
      selectOrganizationById(urlOrgId);
    }
  }, [location.pathname, extractOrgIdFromUrl, organization?.id, selectOrganizationById]);

  // 초기 로드
  useEffect(() => {
    // 로그인 상태 확인 후 로드
    const token = localStorage.getItem('accessToken');
    if (token) {
      reloadOrganization();
    } else {
      setIsLoading(false);
    }
  }, []);

  // API 호출용 organizationId getter
  const getOrganizationId = useCallback((): string | undefined => {
    return organization?.id;
  }, [organization?.id]);

  // 조직 타입 배지
  const getTypeBadge = useCallback((): string => {
    if (!organization) return '';
    switch (organization.type) {
      case 'national':
        return '본부';
      case 'division':
        return '지부';
      case 'branch':
        return '분회';
      default:
        return '';
    }
  }, [organization]);

  // 계층 경로
  const getHierarchyPath = useCallback((): string => {
    if (!organization) return '';
    // path를 사람이 읽을 수 있는 형태로 변환
    // 예: "/national/seoul/gangnam" -> "본부 > 서울지부 > 강남분회"
    return organization.path
      .split('/')
      .filter(Boolean)
      .join(' > ');
  }, [organization]);

  // Context 값 메모이제이션
  const value = useMemo<OrganizationContextValue>(() => ({
    organization,
    memberships,
    isLoading,
    error,
    setOrganization,
    selectOrganizationById,
    reloadOrganization,
    getOrganizationId,
    getTypeBadge,
    getHierarchyPath,
  }), [
    organization,
    memberships,
    isLoading,
    error,
    setOrganization,
    selectOrganizationById,
    reloadOrganization,
    getOrganizationId,
    getTypeBadge,
    getHierarchyPath,
  ]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * useOrganization Hook
 *
 * OrganizationContext 사용을 위한 커스텀 훅
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

/**
 * useOrganizationId Hook
 *
 * 현재 선택된 조직 ID만 반환하는 간편 훅
 */
export function useOrganizationId(): string | undefined {
  const { organization } = useOrganization();
  return organization?.id;
}

/**
 * withOrganization HOC
 *
 * 조직 컨텍스트를 props로 주입하는 HOC
 */
export function withOrganization<P extends object>(
  Component: React.ComponentType<P & { organization: Organization | null }>
) {
  return function WithOrganizationComponent(props: P) {
    const { organization } = useOrganization();
    return <Component {...props} organization={organization} />;
  };
}

export default OrganizationContext;
