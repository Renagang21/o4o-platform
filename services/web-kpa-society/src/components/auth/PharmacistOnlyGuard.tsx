/**
 * PharmacistOnlyGuard - 약사 전용 서비스 접근 가드
 *
 * WO-O4O-KPA-B-C-ACCESS-POLICY-IMPLEMENTATION-V1
 *
 * KPA-b (분회 서비스), KPA-c (분회 관리) 접근을 약사 회원으로 제한.
 * 학생(membershipType === 'student')은 차단.
 *
 * 검증 순서:
 * 1. 로딩 중 → LoadingSpinner
 * 2. 미인증 → 로그인 안내
 * 3. PLATFORM_ROLES (kpa:admin, kpa:operator) → bypass
 * 4. student → 차단
 * 5. 그 외 (pharmacist 포함) → 통과
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { colors } from '../../styles/theme';
import { PLATFORM_ROLES, hasAnyRole } from '../../lib/role-constants';

interface PharmacistOnlyGuardProps {
  children: React.ReactNode;
}

export function PharmacistOnlyGuard({ children }: PharmacistOnlyGuardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthenticated || !user) {
    return renderError('로그인이 필요합니다.', navigate, true);
  }

  // Platform roles bypass (kpa:admin, kpa:operator)
  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <>{children}</>;
  }

  // Student block
  const mt = user.kpaMembership?.membershipType || user.membershipType;
  if (mt === 'student') {
    return renderError('약사 회원만 이용할 수 있는 서비스입니다.', navigate);
  }

  return <>{children}</>;
}

function renderError(
  message: string,
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
              onClick={() => navigate('/')}
            >
              커뮤니티 홈으로 돌아가기
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
