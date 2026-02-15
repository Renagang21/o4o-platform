/**
 * BranchAdminAuthGuard - 분회 관리자 권한 체크 컴포넌트
 *
 * 분회 관리자 페이지에 접근하기 전에 권한을 확인합니다.
 * - 로그인 여부 확인
 * - 해당 분회의 관리자 권한 확인
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, User } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { colors } from '../../styles/theme';

interface BranchAdminAuthGuardProps {
  children: React.ReactNode;
}

export function BranchAdminAuthGuard({ children }: BranchAdminAuthGuardProps) {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      // 인증 로딩 중이면 대기
      if (authLoading) return;

      // 로그인되지 않은 경우
      if (!isAuthenticated || !user) {
        setError('로그인이 필요합니다.');
        setIsAuthorized(false);
        return;
      }

      // 분회 ID가 없는 경우
      if (!branchId) {
        setError('분회 정보를 찾을 수 없습니다.');
        setIsAuthorized(false);
        return;
      }

      try {
        // 권한 체크 로직
        // TODO: 실제 API 연동 시 분회 관리자 권한 확인 API 호출
        // const response = await branchApi.checkAdminPermission(branchId);

        // 임시: 사용자 역할에서 분회 관리자 권한 확인
        // 실제 구현 시에는 membership_branch_admin 역할과 해당 branchId 매칭 확인
        const hasBranchAdminRole = checkBranchAdminRole(user, branchId);

        if (hasBranchAdminRole) {
          setIsAuthorized(true);
        } else {
          setError('이 분회의 관리자 권한이 없습니다.');
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Authorization check failed:', err);
        setError('권한 확인 중 오류가 발생했습니다.');
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [branchId, user, isAuthenticated, authLoading]);

  // 로딩 중
  if (authLoading || isAuthorized === null) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  // 권한 없음
  if (!isAuthorized) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.icon}>🔒</div>
          <h2 style={styles.title}>접근 권한이 없습니다</h2>
          <p style={styles.message}>{error}</p>
          <div style={styles.actions}>
            {!isAuthenticated ? (
              <button
                style={styles.loginButton}
                onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
              >
                로그인하기
              </button>
            ) : (
              <button
                style={styles.backButton}
                onClick={() => navigate(`/branch-services/${branchId}`)}
              >
                분회 홈으로 돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 권한 있음 - 자식 컴포넌트 렌더링
  return <>{children}</>;
}

/**
 * WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: KPA prefixed roles only
 * Legacy roles removed, platform roles removed
 */
function checkBranchAdminRole(user: User, _branchId: string): boolean {
  const allowedRoles = [
    'kpa:admin',
    'kpa:district_admin',
    'kpa:branch_admin',
    'kpa-c:branch_admin',
  ];

  if (user.role && allowedRoles.includes(user.role)) {
    return true;
  }

  if (user.roles && user.roles.some(r => allowedRoles.includes(r))) {
    return true;
  }

  return false;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.neutral100,
    padding: '20px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
  },
  message: {
    fontSize: '14px',
    color: colors.neutral600,
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  loginButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
