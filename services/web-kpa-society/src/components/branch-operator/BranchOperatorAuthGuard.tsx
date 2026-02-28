/**
 * BranchOperatorAuthGuard - 분회 운영자 권한 체크 컴포넌트
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
 * WO-KPA-BRANCH-SCOPE-VALIDATION-V1: 2단계 검증
 * WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: API 재조회 제거, kpaMembership 기반
 *
 * 1단계: kpa:admin bypass (로컬, 빠름)
 * 2단계: kpaMembership.organizationId + role 검증 (operator 이상)
 *
 * 참조: components/branch-admin/BranchAdminAuthGuard.tsx (동일 패턴)
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { colors } from '../../styles/theme';
import { ROLES } from '../../lib/role-constants';

interface BranchOperatorAuthGuardProps {
  children: React.ReactNode;
}

export function BranchOperatorAuthGuard({ children }: BranchOperatorAuthGuardProps) {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthenticated || !user) {
    return renderError('로그인이 필요합니다.', branchId, navigate, true);
  }

  if (!branchId) {
    return renderError('분회 정보를 찾을 수 없습니다.', branchId, navigate);
  }

  // kpa:admin bypass — 모든 분회 접근 가능
  if (user.roles.includes(ROLES.KPA_ADMIN)) {
    return <>{children}</>;
  }

  // kpaMembership 기반 검증 (API 호출 불필요)
  const km = user.kpaMembership;

  if (!km || km.organizationId !== branchId) {
    return renderError('이 분회에 대한 접근 권한이 없습니다. 소속 분회가 아닙니다.', branchId, navigate);
  }

  // operator 이상 (operator, admin 모두 접근 가능)
  if (km.role !== 'operator' && km.role !== 'admin') {
    return renderError('이 분회의 운영자 권한이 없습니다.', branchId, navigate);
  }

  return <>{children}</>;
}

function renderError(
  message: string,
  branchId: string | undefined,
  navigate: ReturnType<typeof useNavigate>,
  showLogin?: boolean,
) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🔒</div>
        <h2 style={styles.title}>접근 권한이 없습니다</h2>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          {showLogin ? (
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
