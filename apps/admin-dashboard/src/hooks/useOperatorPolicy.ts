/**
 * useOperatorPolicy Hook
 *
 * WO-KPA-OPERATOR-UI-POLICY-REFLECTION-V1
 * WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1: 서비스 엔트리 기반 스코프 우선
 *
 * 운영자 정책 기반 UI 제어를 위한 React Hook
 * - 스코프 기반 메뉴/버튼 노출 제어
 * - 기능별 권한 검사
 * - 정책 정보 조회
 * - 서비스 엔트리 기반 기본 스코프 적용
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  type OperatorScopeKey,
  type OperatorPolicy,
  OPERATOR_POLICIES,
  getOperatorPolicy,
  canOperatorUseFeature,
  isValidOperatorScope,
} from '@o4o/types';
import {
  type ServiceEntryPoint,
  type ServiceEntryConfig,
  detectServiceEntryFromPath,
  getServiceEntryConfig,
} from '@/config/service-entry';

// ============================================================================
// Types
// ============================================================================

export interface OperatorPolicyHookResult {
  /** 현재 활성 운영자 스코프 키 (없으면 null) */
  activeScopeKey: OperatorScopeKey | null;

  /** 현재 활성 운영자 정책 (없으면 null) */
  activePolicy: OperatorPolicy | null;

  /** 운영자인지 여부 */
  isOperator: boolean;

  /** 사용자의 모든 운영자 스코프 키 목록 */
  operatorScopeKeys: OperatorScopeKey[];

  /** 특정 기능 사용 가능 여부 확인 */
  canUseFeature: (feature: keyof OperatorPolicy['features']) => boolean;

  /** 특정 콘텐츠 타입 관리 가능 여부 확인 */
  canManageContentType: (contentType: string) => boolean;

  /** 포럼 생성 가능 여부 */
  canCreateForum: boolean;

  /** 콘텐츠 관리 가능 여부 */
  canManageContent: boolean;

  /** 인증 관리 가능 여부 */
  canManageCertification: boolean;

  /** 정책 관리 가능 여부 */
  canManagePolicy: boolean;

  /** 공구 관리 가능 여부 (kpa_society only) */
  canManageGroupBuy: boolean;

  /** 스코프 표시 이름 */
  scopeDisplayName: string | null;

  /** 스코프 설명 */
  scopeDescription: string | null;

  // WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1
  /** 현재 서비스 엔트리 포인트 (없으면 null) */
  currentServiceEntry: ServiceEntryPoint | null;

  /** 현재 서비스 엔트리 설정 (없으면 null) */
  currentServiceConfig: ServiceEntryConfig | null;

  /** 서비스 기본 스코프 키 */
  serviceDefaultScopeKey: OperatorScopeKey | null;

  /** 현재 스코프가 서비스 기본과 일치하는지 */
  isScopeMatchingService: boolean;
}

// ============================================================================
// Scope Detection Utilities
// ============================================================================

/**
 * 스코프 문자열에서 운영자 스코프 키 추출
 * 예: 'glucoseview:customer:manage' → 'glycocare'
 * 예: 'kpa:membership:manage' → 'kpa_society'
 */
function extractOperatorScopeFromScope(scope: string): OperatorScopeKey | null {
  if (scope.startsWith('glucoseview:')) {
    return 'glycocare';
  }
  if (scope.startsWith('kpa:')) {
    return 'kpa_society';
  }
  return null;
}

/**
 * 스코프가 운영자 레벨인지 확인
 * 운영자 스코프는 ':manage', ':moderate' 등의 관리 권한 포함
 */
function isOperatorLevelScope(scope: string): boolean {
  const operatorKeywords = [':manage', ':moderate', ':write', ':policy', ':certification'];
  return operatorKeywords.some(keyword => scope.includes(keyword));
}

/**
 * 사용자 스코프에서 운영자 스코프 키 목록 추출
 */
function extractOperatorScopeKeys(scopes: string[]): OperatorScopeKey[] {
  const scopeKeySet = new Set<OperatorScopeKey>();

  for (const scope of scopes) {
    if (isOperatorLevelScope(scope)) {
      const scopeKey = extractOperatorScopeFromScope(scope);
      if (scopeKey) {
        scopeKeySet.add(scopeKey);
      }
    }
  }

  return Array.from(scopeKeySet);
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useOperatorPolicy(): OperatorPolicyHookResult {
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const userScopes = user?.scopes ?? [];
  const userRoles = user?.roles ?? [user?.role].filter(Boolean) as string[];

  // WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1: 현재 서비스 엔트리 감지
  const currentServiceEntry = useMemo(() => {
    return detectServiceEntryFromPath(location.pathname);
  }, [location.pathname]);

  const currentServiceConfig = useMemo(() => {
    return currentServiceEntry ? getServiceEntryConfig(currentServiceEntry) : null;
  }, [currentServiceEntry]);

  const serviceDefaultScopeKey = currentServiceConfig?.defaultScopeKey ?? null;

  // 운영자 스코프 키 추출 (메모이제이션)
  const operatorScopeKeys = useMemo(() => {
    // 역할에 'operator'가 있거나, 스코프에서 운영자 권한이 있는 경우
    const hasOperatorRole = userRoles.includes('operator');
    const extractedKeys = extractOperatorScopeKeys(userScopes);

    // 역할에 operator가 있으면 스코프 기반으로만 판단
    if (hasOperatorRole || extractedKeys.length > 0) {
      return extractedKeys;
    }

    return [];
  }, [userScopes, userRoles]);

  // WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1:
  // 서비스 기본 스코프를 우선 사용, 없으면 첫 번째 운영자 스코프 사용
  const activeScopeKey = useMemo(() => {
    // 서비스 기본 스코프가 있고, 사용자가 해당 스코프를 가지고 있으면 우선 사용
    if (serviceDefaultScopeKey && operatorScopeKeys.includes(serviceDefaultScopeKey)) {
      return serviceDefaultScopeKey;
    }
    // 그렇지 않으면 첫 번째 운영자 스코프 사용
    return operatorScopeKeys[0] ?? null;
  }, [serviceDefaultScopeKey, operatorScopeKeys]);

  // 스코프가 서비스 기본과 일치하는지
  const isScopeMatchingService = activeScopeKey === serviceDefaultScopeKey;

  // 활성 정책
  const activePolicy = activeScopeKey ? getOperatorPolicy(activeScopeKey) : null;

  // 운영자 여부
  const isOperator = operatorScopeKeys.length > 0;

  // 기능 사용 가능 여부 체크 함수
  const canUseFeature = useMemo(() => {
    return (feature: keyof OperatorPolicy['features']): boolean => {
      if (!activeScopeKey) return false;
      return canOperatorUseFeature(activeScopeKey, feature);
    };
  }, [activeScopeKey]);

  // 콘텐츠 타입 관리 가능 여부
  const canManageContentType = useMemo(() => {
    return (contentType: string): boolean => {
      if (!activePolicy) return false;
      return activePolicy.contentTypes.includes(contentType);
    };
  }, [activePolicy]);

  // 편의 속성들
  const canCreateForum = activeScopeKey
    ? canOperatorUseFeature(activeScopeKey, 'canCreateForum')
    : false;

  const canManageContent = activeScopeKey
    ? canOperatorUseFeature(activeScopeKey, 'canManageContent')
    : false;

  const canManageCertification = activeScopeKey
    ? canOperatorUseFeature(activeScopeKey, 'canManageCertification')
    : false;

  const canManagePolicy = activeScopeKey
    ? canOperatorUseFeature(activeScopeKey, 'canManagePolicy')
    : false;

  // 공구 관리는 kpa_society만 가능 (콘텐츠 타입으로 체크)
  const canManageGroupBuy = activePolicy?.contentTypes.includes('events') ?? false;

  return {
    activeScopeKey,
    activePolicy,
    isOperator,
    operatorScopeKeys,
    canUseFeature,
    canManageContentType,
    canCreateForum,
    canManageContent,
    canManageCertification,
    canManagePolicy,
    canManageGroupBuy,
    scopeDisplayName: activePolicy?.displayName ?? null,
    scopeDescription: activePolicy?.description ?? null,
    // WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1
    currentServiceEntry,
    currentServiceConfig,
    serviceDefaultScopeKey,
    isScopeMatchingService,
  };
}

export default useOperatorPolicy;
