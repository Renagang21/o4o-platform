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
                onClick={() => navigate(`/branch/${branchId}`)}
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
 * 사용자의 분회 관리자 권한 확인
 *
 * P2-T2 (WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1):
 * Phase 4 prefixed roles + Legacy roles 모두 지원
 *
 * Backward Compatibility:
 * - Legacy roles 체크 유지 (기존 사용자 영향 없음)
 * - Additive change only (확장만, 파괴 없음)
 *
 * @param user - 현재 로그인한 사용자
 * @param _branchId - 확인할 분회 ID (향후 분회별 권한 체크에 사용)
 * @returns 해당 분회의 관리자 권한 여부
 */
function checkBranchAdminRole(user: User, _branchId: string): boolean {
  // Legacy unprefixed roles (backward compatibility)
  const legacyRoles = [
    'admin',
    'super_admin',
    'membership_super_admin',
    'district_admin',
    'membership_district_admin',
    'branch_admin',
    'membership_branch_admin',
  ];

  // Phase 4 prefixed roles
  const prefixedRoles = [
    'platform:admin',
    'platform:super_admin',
    'kpa:admin',
    'kpa:district_admin',
    'kpa:branch_admin',
    'kpa:branch_operator',
  ];

  const allowedRoles = [...legacyRoles, ...prefixedRoles];

  // Check user.role (single string, backward compatibility)
  if (user.role && allowedRoles.includes(user.role)) {
    // TODO: 향후 분회별 권한 세분화 (branchId 매칭)
    return true;
  }

  // P2-T2: Check user.roles array (Phase 4 support)
  if (user.roles && user.roles.some(r => allowedRoles.includes(r))) {
    // TODO: 향후 분회별 권한 세분화 (branchId 매칭)
    return true;
  }

  // ============================================
  // P2-T4: Super Operator 확장 지점
  // WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
  // ============================================
  // 향후 Super Operator 개념 도입 시:
  // if (user.isSuperOperator) {
  //   if (user.operatorLevel === 'platform') {
  //     return true;  // 플랫폼 운영자: 모든 분회 접근
  //   }
  //   if (user.operatorScopes?.includes(`kpa:branch:${_branchId}`)) {
  //     return true;  // 분회별 운영자: 특정 분회만 접근
  //   }
  // }
  //
  // 서비스별 운영자 권한 체크 위치
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
