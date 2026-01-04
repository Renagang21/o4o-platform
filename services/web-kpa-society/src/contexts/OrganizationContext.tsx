/**
 * OrganizationContext - 현재 조직 컨텍스트 관리
 * WO-KPA-COMMITTEE-INTRANET-V1
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Organization, OrganizationMember, MemberRole } from '../types/organization';
import {
  ALL_ORGANIZATIONS,
  getOrganizationById,
  getOrganizationChain,
  getOrganizationMembers,
  SAMPLE_BRANCH,
} from '../data/sampleOrganizations';

interface OrganizationContextType {
  // 현재 선택된 조직
  currentOrganization: Organization;
  // 조직 체인 (위원회 → 분회 → 지부)
  organizationChain: Organization[];
  // 사용자가 접근 가능한 조직 목록
  accessibleOrganizations: Organization[];
  // 현재 사용자의 역할
  currentRole: MemberRole;
  // 현재 사용자의 권한
  permissions: OrganizationMember['permissions'];
  // 조직 변경
  setCurrentOrganization: (orgId: string) => void;
  // 조직 유형별 필터링
  getOrganizationsByType: (type: Organization['type']) => Organization[];
  // 특정 조직의 하위 조직 조회
  getChildOrganizations: (parentId: string) => Organization[];
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  // 기본 조직: 샘플지부
  const [currentOrganization, setCurrentOrg] = useState<Organization>(SAMPLE_BRANCH);
  const [organizationChain, setOrganizationChain] = useState<Organization[]>([SAMPLE_BRANCH]);

  // 샘플: 모든 조직 접근 가능
  const accessibleOrganizations = ALL_ORGANIZATIONS;

  // 샘플: 기본 역할은 officer
  const [currentRole] = useState<MemberRole>('officer');

  // 권한 (역할 기반)
  const permissions: OrganizationMember['permissions'] = {
    canWriteNotice: currentRole === 'chair' || currentRole === 'officer',
    canCreateMeeting: currentRole === 'chair',
    canUploadDocument: currentRole === 'chair' || currentRole === 'officer',
    canChangeSettings: currentRole === 'chair',
  };

  const setCurrentOrganization = useCallback((orgId: string) => {
    const org = getOrganizationById(orgId);
    if (org) {
      setCurrentOrg(org);
      setOrganizationChain(getOrganizationChain(orgId));
    }
  }, []);

  const getOrganizationsByType = useCallback((type: Organization['type']) => {
    return accessibleOrganizations.filter((org) => org.type === type);
  }, [accessibleOrganizations]);

  const getChildOrganizations = useCallback((parentId: string) => {
    return accessibleOrganizations.filter((org) => org.parentId === parentId);
  }, [accessibleOrganizations]);

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
