/**
 * AdminAuthGuard - 지부 관리자 권한 체크 컴포넌트
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   로컬 권한없음 카드를 공통 @o4o/ui AccessDenied 로 교체. 판정 로직은 변경하지 않는다.
 */

import { useEffect, useState } from 'react';
import { AccessDenied } from '@o4o/ui';
import { useAuth, User } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { ROLES } from '../../lib/role-constants';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        setError('로그인이 필요합니다.');
        setIsAuthorized(false);
        return;
      }

      try {
        const hasBranchAdminRole = checkBranchAdminRole(user);

        if (hasBranchAdminRole) {
          setIsAuthorized(true);
        } else {
          setError('지부 관리자 권한이 없습니다.');
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Authorization check failed:', err);
        setError('권한 확인 중 오류가 발생했습니다.');
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [user, isAuthenticated, authLoading]);

  if (authLoading || isAuthorized === null) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthorized) {
    return (
      <AccessDenied
        message={error ?? undefined}
        showLogin={!isAuthenticated}
        showHome={isAuthenticated}
        homeLabel="메인으로 돌아가기"
      />
    );
  }

  return <>{children}</>;
}

/**
 * WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: kpa:admin 또는 membershipRole === 'admin'
 */
function checkBranchAdminRole(user: User): boolean {
  return user.roles.includes(ROLES.KPA_ADMIN) || user.membershipRole === 'admin';
}
