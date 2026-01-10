/**
 * Unified Dashboard v1.1 - User Context Hook
 * 사용자 컨텍스트 판단 로직
 *
 * Role 기반이 아닌 Context 기반으로 카드 노출 결정
 * v1.1: 임원 컨텍스트 확장
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@o4o/auth-context';
import type { UserContextType, ExecutiveContext } from './types';

export interface UseUserContextReturn {
  contexts: UserContextType[];
  primaryContext: UserContextType;
  isSeller: boolean;
  isSupplier: boolean;
  isPartner: boolean;
  isOperator: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  isLoading: boolean;
  shouldShowCard: (showCondition: 'always' | UserContextType[]) => boolean;
  // v1.1: 임원 컨텍스트 상세 정보
  executiveContexts: ExecutiveContext[];
}

/**
 * v1.1: Mock 임원 컨텍스트 로드
 * 실제 구현 시 API에서 가져옴
 */
function getMockExecutiveContexts(userId: string | number): ExecutiveContext[] {
  // Mock: 일부 사용자에게 임원 컨텍스트 부여 (테스트용)
  // 실제 구현 시 API 호출로 대체
  const userIdStr = String(userId);

  // Demo: 특정 조건에서 임원 컨텍스트 반환
  if (userIdStr.endsWith('1') || userIdStr.endsWith('5')) {
    return [
      {
        id: 'exec-1',
        type: 'executive_branch',
        organizationId: 'branch-001',
        organizationName: '서울지부',
        position: '부회장',
        term: {
          startAt: new Date('2025-01-01'),
          endAt: new Date('2026-12-31'),
        },
        status: 'active',
      },
    ];
  }

  if (userIdStr.endsWith('3')) {
    return [
      {
        id: 'exec-2',
        type: 'executive_chapter',
        organizationId: 'chapter-001',
        organizationName: '강남분회',
        position: '총무',
        term: {
          startAt: new Date('2025-03-01'),
        },
        status: 'active',
      },
      {
        id: 'exec-3',
        type: 'executive_branch',
        organizationId: 'branch-002',
        organizationName: '경기지부',
        position: '이사',
        term: {
          startAt: new Date('2024-01-01'),
          endAt: new Date('2025-12-31'),
        },
        status: 'active',
      },
    ];
  }

  return [];
}

/**
 * 사용자의 역할/권한을 컨텍스트로 변환
 */
export function useUserContext(): UseUserContextReturn {
  const { user, isLoading } = useAuth();

  const contextData = useMemo(() => {
    const contexts: UserContextType[] = [];
    let executiveContexts: ExecutiveContext[] = [];

    if (!user) {
      return {
        contexts: [],
        primaryContext: 'seller' as UserContextType,
        isSeller: false,
        isSupplier: false,
        isPartner: false,
        isOperator: false,
        isAdmin: false,
        isExecutive: false,
        executiveContexts: [],
      };
    }

    const role = user.role?.toLowerCase() || '';
    const permissions = user.permissions || [];

    // Role에서 컨텍스트 파생
    if (role === 'admin' || role === 'super_admin') {
      contexts.push('admin');
    }

    if (role === 'seller' || permissions.includes('seller.dashboard')) {
      contexts.push('seller');
    }

    if (role === 'supplier' || permissions.includes('supplier.dashboard')) {
      contexts.push('supplier');
    }

    if (role === 'partner' || permissions.includes('partner.dashboard')) {
      contexts.push('partner');
    }

    // 운영자 컨텍스트 (membership/operator 흡수)
    if (role === 'operator' || permissions.includes('membership.manage') || permissions.includes('operator.dashboard')) {
      contexts.push('operator');
    }

    // v1.1: 임원 컨텍스트 (Role이 아닌 별도 데이터 구조)
    // Mock 데이터 또는 API에서 임원 컨텍스트 로드
    executiveContexts = getMockExecutiveContexts(user.id);

    // active 상태인 임원 컨텍스트가 있으면 executive 추가
    const hasActiveExecutive = executiveContexts.some((ctx) => ctx.status === 'active');
    if (hasActiveExecutive) {
      contexts.push('executive');
    }

    // 기존 permission 기반 임원 체크도 유지 (하위 호환)
    if (!hasActiveExecutive && (permissions.includes('executive.dashboard') || permissions.includes('kpa.executive'))) {
      contexts.push('executive');
    }

    // 기본 컨텍스트가 없으면 seller 추가
    if (contexts.length === 0) {
      contexts.push('seller');
    }

    // Primary context 결정 (우선순위: admin > executive > operator > supplier > partner > seller)
    let primaryContext: UserContextType = 'seller';
    if (contexts.includes('admin')) primaryContext = 'admin';
    else if (contexts.includes('executive')) primaryContext = 'executive';
    else if (contexts.includes('operator')) primaryContext = 'operator';
    else if (contexts.includes('supplier')) primaryContext = 'supplier';
    else if (contexts.includes('partner')) primaryContext = 'partner';

    return {
      contexts,
      primaryContext,
      isSeller: contexts.includes('seller'),
      isSupplier: contexts.includes('supplier'),
      isPartner: contexts.includes('partner'),
      isOperator: contexts.includes('operator'),
      isAdmin: contexts.includes('admin'),
      isExecutive: contexts.includes('executive'),
      executiveContexts: executiveContexts.filter((ctx) => ctx.status === 'active'),
    };
  }, [user]);

  const shouldShowCard = useCallback(
    (showCondition: 'always' | UserContextType[]): boolean => {
      if (showCondition === 'always') {
        return true;
      }
      return showCondition.some((ctx) => contextData.contexts.includes(ctx));
    },
    [contextData.contexts]
  );

  return {
    ...contextData,
    isLoading,
    shouldShowCard,
  };
}
