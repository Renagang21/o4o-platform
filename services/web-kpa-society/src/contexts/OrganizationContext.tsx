/**
 * OrganizationContext - 현재 조직 컨텍스트 관리
 * WO-KPA-COMMITTEE-INTRANET-V1
 * WO-CONTEXT-SWITCH-FOUNDATION-V1: persistence, auth 연동, ActiveContext 추가
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Organization, OrganizationMember, MemberRole } from '../types/organization';
import type { ActiveContext, PersistedContext } from '../types/organization';
import {
  ALL_ORGANIZATIONS,
  getOrganizationById,
  getOrganizationChain,
  getOrganizationMembers,
  SAMPLE_BRANCH,
} from '../data/sampleOrganizations';

const STORAGE_KEY = 'kpa_active_context';

interface OrganizationContextType {
  // === 기존 API (보존) ===
  currentOrganization: Organization;
  organizationChain: Organization[];
  accessibleOrganizations: Organization[];
  currentRole: MemberRole;
  permissions: OrganizationMember['permissions'];
  setCurrentOrganization: (orgId: string) => void;
  getOrganizationsByType: (type: Organization['type']) => Organization[];
  getChildOrganizations: (parentId: string) => Organization[];

  // === WO-CONTEXT-SWITCH-FOUNDATION-V1 ===
  activeContext: ActiveContext | null;
  hasMultipleContexts: boolean;
  isContextSet: boolean;
  clearContext: () => void;

  // === WO-CONTEXT-JOIN-REQUEST-MVP-V1 ===
  refreshAccessibleOrganizations: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

interface OrganizationProviderProps {
  children: ReactNode;
}

/**
 * Role → 접근 가능 조직 매핑 (Phase 1: sample data 기반)
 */
function getAccessibleOrganizationsForRole(role: string | undefined): Organization[] {
  if (!role) return ALL_ORGANIZATIONS;
  switch (role) {
    case 'super_admin':
    case 'operator':
    case 'district_admin':
      return ALL_ORGANIZATIONS;
    case 'branch_admin':
      return ALL_ORGANIZATIONS.filter(
        (org) => org.type === 'branch' || org.type === 'division' || org.type === 'committee'
      );
    case 'pharmacist':
    default:
      return ALL_ORGANIZATIONS;
  }
}

/**
 * localStorage에서 영속된 컨텍스트 복원
 */
function restorePersistedContext(): Organization | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const persisted: PersistedContext = JSON.parse(stored);
    const org = getOrganizationById(persisted.organizationId);
    return org || null;
  } catch {
    return null;
  }
}

/**
 * 컨텍스트를 localStorage에 영속
 */
function persistContext(org: Organization, role: MemberRole): void {
  const persisted: PersistedContext = {
    organizationId: org.id,
    contextType: org.type,
    role,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user } = useAuth();

  // 초기 조직: localStorage 복원 → 기본값 SAMPLE_BRANCH
  const initialOrg = restorePersistedContext() || SAMPLE_BRANCH;
  const [currentOrganization, setCurrentOrg] = useState<Organization>(initialOrg);
  const [organizationChain, setOrganizationChain] = useState<Organization[]>(
    getOrganizationChain(initialOrg.id)
  );

  // WO-PHARMACY-CONTEXT-AUTO-REFRESH-V1: refresh counter to force re-computation
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Role 기반 접근 가능 조직
  const accessibleOrganizations = useMemo(
    () => getAccessibleOrganizationsForRole(user?.roles?.[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.roles, refreshCounter]
  );

  // 기본 역할: officer (Phase 1)
  const [currentRole] = useState<MemberRole>('officer');

  // 권한
  const permissions: OrganizationMember['permissions'] = useMemo(() => ({
    canWriteNotice: currentRole === 'chair' || currentRole === 'officer',
    canCreateMeeting: currentRole === 'chair',
    canUploadDocument: currentRole === 'chair' || currentRole === 'officer',
    canChangeSettings: currentRole === 'chair',
  }), [currentRole]);

  // 조직 전환 + 영속
  const setCurrentOrganization = useCallback((orgId: string) => {
    const org = getOrganizationById(orgId);
    if (org) {
      setCurrentOrg(org);
      setOrganizationChain(getOrganizationChain(orgId));
      persistContext(org, currentRole);
    }
  }, [currentRole]);

  const getOrganizationsByType = useCallback((type: Organization['type']) => {
    return accessibleOrganizations.filter((org) => org.type === type);
  }, [accessibleOrganizations]);

  const getChildOrganizations = useCallback((parentId: string) => {
    return accessibleOrganizations.filter((org) => org.parentId === parentId);
  }, [accessibleOrganizations]);

  // === WO-CONTEXT-SWITCH-FOUNDATION-V1 ===

  const activeContext: ActiveContext | null = useMemo(() => ({
    organization: currentOrganization,
    chain: organizationChain,
    contextType: currentOrganization.type,
    role: currentRole,
    permissions,
  }), [currentOrganization, organizationChain, currentRole, permissions]);

  const hasMultipleContexts = accessibleOrganizations.length > 1;
  const isContextSet = true; // Phase 1: 항상 기본 조직이 설정됨

  const clearContext = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentOrg(SAMPLE_BRANCH);
    setOrganizationChain(getOrganizationChain(SAMPLE_BRANCH.id));
  }, []);

  // === WO-CONTEXT-JOIN-REQUEST-MVP-V1 + WO-PHARMACY-CONTEXT-AUTO-REFRESH-V1 ===
  // 승인 후 프론트엔드에서 호출하여 accessibleOrganizations 갱신
  // Sample data 기반: refreshCounter 증가로 useMemo 재실행 트리거
  // 실제 API 연동 시: fetch → setAccessibleOrganizations 로 교체
  const refreshAccessibleOrganizations = useCallback(() => {
    setRefreshCounter((c) => c + 1);

    // 현재 org가 refresh 후에도 접근 가능한지 검증
    const refreshed = getAccessibleOrganizationsForRole(user?.roles?.[0]);
    const stillAccessible = refreshed.some((org) => org.id === currentOrganization.id);
    if (!stillAccessible && refreshed.length > 0) {
      const fallback = refreshed[0];
      setCurrentOrg(fallback);
      setOrganizationChain(getOrganizationChain(fallback.id));
      persistContext(fallback, currentRole);
    }
  }, [user?.roles, currentOrganization.id, currentRole]);

  // WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: 로그인/로그아웃 시 컨텍스트 초기화
  useEffect(() => {
    // 로그아웃 시
    if (!user) {
      clearContext();
      return;
    }

    // 로그인 시 (user.id가 변경된 경우)
    // 이전 사용자의 organization context가 유지되는 것을 방지
    const prevUserId = localStorage.getItem('last_logged_in_user_id');
    const currentUserId = user.id;

    if (prevUserId && prevUserId !== currentUserId) {
      // 사용자가 변경됨 → organization context 초기화
      clearContext();
    }

    // 현재 사용자 ID 저장
    localStorage.setItem('last_logged_in_user_id', currentUserId);
  }, [user, clearContext]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizationChain,
        accessibleOrganizations,
        currentRole,
        permissions,
        setCurrentOrganization,
        getOrganizationsByType,
        getChildOrganizations,
        activeContext,
        hasMultipleContexts,
        isContextSet,
        clearContext,
        refreshAccessibleOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

// 현재 조직의 멤버 조회 훅
export function useOrganizationMembers() {
  const { currentOrganization } = useOrganization();
  return getOrganizationMembers(currentOrganization.id);
}
