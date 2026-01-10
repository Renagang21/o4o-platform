/**
 * Unified Dashboard v1 - User Context Hook
 * PoC: 사용자 컨텍스트 판단 로직
 *
 * Role 기반이 아닌 Context 기반으로 카드 노출 결정
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@o4o/auth-context';
import type { UserContextType } from './types';

export interface UseUserContextReturn {
  contexts: UserContextType[];
  primaryContext: UserContextType;
  isSeller: boolean;
  isSupplier: boolean;
  isPartner: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  isLoading: boolean;
  shouldShowCard: (showCondition: 'always' | UserContextType[]) => boolean;
}

/**
 * 사용자의 역할/권한을 컨텍스트로 변환
 */
export function useUserContext(): UseUserContextReturn {
  const { user, isLoading } = useAuth();

  const contextData = useMemo(() => {
    const contexts: UserContextType[] = [];

    if (!user) {
      return {
        contexts: [],
        primaryContext: 'seller' as UserContextType,
        isSeller: false,
        isSupplier: false,
        isPartner: false,
        isAdmin: false,
        isExecutive: false,
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

    // 임원 컨텍스트 (향후 확장)
    // 임원은 Role과 분리된 별도 구조
    if (permissions.includes('executive.dashboard') || permissions.includes('kpa.executive')) {
      contexts.push('executive');
    }

    // 기본 컨텍스트가 없으면 seller 추가
    if (contexts.length === 0) {
      contexts.push('seller');
    }

    // Primary context 결정 (우선순위: admin > executive > supplier > partner > seller)
    let primaryContext: UserContextType = 'seller';
    if (contexts.includes('admin')) primaryContext = 'admin';
    else if (contexts.includes('executive')) primaryContext = 'executive';
    else if (contexts.includes('supplier')) primaryContext = 'supplier';
    else if (contexts.includes('partner')) primaryContext = 'partner';

    return {
      contexts,
      primaryContext,
      isSeller: contexts.includes('seller'),
      isSupplier: contexts.includes('supplier'),
      isPartner: contexts.includes('partner'),
      isAdmin: contexts.includes('admin'),
      isExecutive: contexts.includes('executive'),
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
