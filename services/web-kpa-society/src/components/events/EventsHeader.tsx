/**
 * EventsHeader - 이벤트 페이지 헤더
 *
 * 로그인 전: 안내 / 로그인 후: 참여 중 이벤트 바로가기
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export function EventsHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.titleArea}>
        <h1 style={styles.title}>이벤트</h1>
        <p style={styles.subtitle}>퀴즈, 설문조사, 업체 이벤트</p>
      </div>
      <div style={styles.actions}>
        {isAuthenticated ? (
          <Link to="/participation" style={styles.myEventsBtn}>
            참여 중 이벤트
          </Link>
        ) : (
          <Link to="/login" style={styles.loginBtn}>
            로그인
          </Link>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xl} 0 ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.lg,
  },
  titleArea: {},
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
  },
  myEventsBtn: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
  },
  loginBtn: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.primary,
    textDecoration: 'none',
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
  },
};
