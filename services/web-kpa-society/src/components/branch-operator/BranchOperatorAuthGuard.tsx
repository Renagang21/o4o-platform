/**
 * BranchOperatorAuthGuard - 분회 운영자 권한 체크 컴포넌트
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
 * 분회 운영자 페이지에 접근하기 전에 권한을 확인합니다.
 * - 로그인 여부 확인
 * - 해당 분회의 운영자 권한 확인
 *
 * 참조: components/branch-admin/BranchAdminAuthGuard.tsx (동일 패턴)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, User } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { colors } from '../../styles/theme';

interface BranchOperatorAuthGuardProps {
  children: React.ReactNode;
}

export function BranchOperatorAuthGuard({ children }: BranchOperatorAuthGuardProps) {
  const { branchId } = useParams();
  const navigate = useNavigate();
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

      if (!branchId) {
        setError('분회 정보를 찾을 수 없습니다.');
        setIsAuthorized(false);
        return;
      }

      try {
        const hasOperatorRole = checkBranchOperatorRole(user, branchId);

        if (hasOperatorRole) {
          setIsAuthorized(true);
        } else {
          setError('이 분회의 운영자 권한이 없습니다.');
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

  if (authLoading || isAuthorized === null) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

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

  return <>{children}</>;
}

/**
 * 사용자의 분회 운영자 권한 확인
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1:
 * kpa-c:operator + 상위 역할 허용
 */
function checkBranchOperatorRole(user: User, _branchId: string): boolean {
  const legacyRoles = [
    'admin',
    'super_admin',
    'district_admin',
  ];

  const prefixedRoles = [
    'kpa-c:operator',
    'kpa-c:branch_admin',
    'kpa:admin',
    'kpa:district_admin',
    'platform:admin',
    'platform:super_admin',
  ];

  const allowedRoles = [...legacyRoles, ...prefixedRoles];

  if (user.role && allowedRoles.includes(user.role)) {
    // TODO: 향후 분회별 권한 세분화 (branchId 매칭)
    return true;
  }

  if (user.roles && user.roles.some(r => allowedRoles.includes(r))) {
    // TODO: 향후 분회별 권한 세분화 (branchId 매칭)
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
