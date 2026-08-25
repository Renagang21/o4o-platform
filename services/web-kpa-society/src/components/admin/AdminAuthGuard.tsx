/**
 * AdminAuthGuard - KPA-Society 관리자 권한 체크 컴포넌트
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   로컬 권한없음 카드를 공통 @o4o/ui AccessDenied 로 교체. 판정 로직은 변경하지 않는다.
 */

import { useEffect, useState } from 'react';
import { AccessDenied } from '@o4o/ui';
import { useAuth, User } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { ROLES } from '../../lib/role-constants';
import { isServiceAccessAllowed } from '../../lib/membershipGate';

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
        // WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
        //   /admin/* 전체가 role(또는 membershipRole) 하나로만 열려 있었다.
        //   canonical 계약은 **active membership + 필요한 role** 이다 — role 만으로는
        //   서비스 진입 자격을 대신할 수 없다. 정지/탈퇴된 kpa:admin 이 관리자 화면을
        //   그대로 열 수 있던 경로를 닫는다 (선행 WO ...SUSPENSION-ROLE-LIFECYCLE-
        //   CONTRACT-V1 §10-3 잔여).
        //   membership 판정 SSOT 는 lib/membershipGate (데이터원: GET /auth/me).
        //   platform:super_admin 은 isServiceAccessAllowed() 안에서 기존대로 우회한다.
        if (!isServiceAccessAllowed(user)) {
          setError('KPA 약사회 서비스 이용 자격이 없습니다.');
          setIsAuthorized(false);
          return;
        }

        const hasBranchAdminRole = checkBranchAdminRole(user);

        if (hasBranchAdminRole) {
          setIsAuthorized(true);
        } else {
          setError('관리자 권한이 없습니다.');
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
