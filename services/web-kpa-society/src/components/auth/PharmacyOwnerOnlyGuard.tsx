/**
 * PharmacyOwnerOnlyGuard - 약국 개설자 전용 접근 가드
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 또는 PLATFORM_ROLES 보유자만 통과한다.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { colors } from '../../styles/theme';
import { PLATFORM_ROLES, STORE_OWNER_ROLES, hasAnyRole } from '../../lib/role-constants';

interface PharmacyOwnerOnlyGuardProps {
  children: React.ReactNode;
}

export function PharmacyOwnerOnlyGuard({ children }: PharmacyOwnerOnlyGuardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthenticated || !user) {
    return renderError('로그인이 필요합니다.', navigate, true);
  }

  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <>{children}</>;
  }

  if (hasAnyRole(user.roles, STORE_OWNER_ROLES)) {
    return <>{children}</>;
  }

  return renderError('약국 개설자만 이벤트에 참여할 수 있습니다.', navigate);
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
              onClick={() => navigate('/mypage')}
            >
              마이페이지로 돌아가기
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
