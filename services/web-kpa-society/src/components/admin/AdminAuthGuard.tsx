/**
 * AdminAuthGuard - 지부 관리자 권한 체크 컴포넌트
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, User } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { colors } from '../../styles/theme';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
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
                onClick={() => navigate('/')}
              >
                메인으로 돌아가기
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
 * P2-T2 (WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1):
 * Phase 4 prefixed roles + Legacy roles 모두 지원
 *
 * Backward Compatibility:
 * - Legacy roles 체크 유지 (기존 사용자 영향 없음)
 * - Additive change only (확장만, 파괴 없음)
 */
function checkBranchAdminRole(user: User): boolean {
  // Legacy unprefixed roles (backward compatibility)
  const legacyRoles = [
    'admin',
    'super_admin',
    'membership_super_admin',
    'membership_branch_admin',
    'membership_branch_operator',
    'membership_district_admin',
  ];

  // Phase 4 prefixed roles
  const prefixedRoles = [
    'platform:admin',
    'platform:super_admin',
    'kpa:admin',
    'kpa:branch_admin',
    'kpa:branch_operator',
    'kpa:district_admin',
  ];

  const allowedRoles = [...legacyRoles, ...prefixedRoles];

  // Check user.role (single string, backward compatibility)
  if (user.role && allowedRoles.includes(user.role)) {
    return true;
  }

  // P2-T2: Check user.roles array (Phase 4 support)
  if (user.roles && user.roles.some(r => allowedRoles.includes(r))) {
    return true;
  }

  // P2-T2 TODO: Review DEV mode bypass for security
  // 개발 환경에서는 임시 허용 (보안 검토 필요)
  if (import.meta.env.DEV) {
    console.warn('[DEV MODE] Branch admin access allowed for testing - SECURITY REVIEW NEEDED');
    return true;
  }

  // ============================================
  // P2-T4: Super Operator 확장 지점
  // WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
  // ============================================
  // 향후 Super Operator 개념 도입 시:
  // if (user.isSuperOperator && user.operatorScopes?.includes('kpa')) {
  //   console.log('[SUPER OPERATOR] KPA service access granted');
  //   return true;
  // }
  //
  // 운영자 우회 로직 위치:
  // - 플랫폼 운영자: 모든 서비스 접근
  // - 서비스 운영자: 특정 서비스만 접근
  // - DEV 모드 bypass 대체 가능성
  // 구현 없음 (확장 지점만 표시)
  // ============================================

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
