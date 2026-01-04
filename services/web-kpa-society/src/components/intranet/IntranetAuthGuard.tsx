/**
 * IntranetAuthGuard - 인트라넷 접근 권한 확인
 * 인증된 조직 회원만 접근 가능
 */

import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

interface IntranetAuthGuardProps {
  children: React.ReactNode;
}

export function IntranetAuthGuard({ children }: IntranetAuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // DEV 모드에서는 인증 우회
  const isDev = import.meta.env.DEV;

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>⏳</div>
        <p style={styles.loadingText}>로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isDev) {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.icon}>🔒</div>
        <h2 style={styles.title}>로그인이 필요합니다</h2>
        <p style={styles.description}>
          인트라넷은 조직 회원만 접근할 수 있습니다.
        </p>
        <a href="/login" style={styles.loginButton}>
          로그인
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
  },
  spinner: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
    textAlign: 'center',
    padding: '20px',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 12px 0',
  },
  description: {
    fontSize: '14px',
    color: colors.neutral600,
    margin: '0 0 24px 0',
  },
  loginButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
};
