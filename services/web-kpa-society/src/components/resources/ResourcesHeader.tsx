/**
 * ResourcesHeader - 자료실 페이지 헤더
 *
 * Content 집중: 자료 등록 진입점 제공
 * 로그인 전: 안내 / 로그인 후: 자료 등록 버튼
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export function ResourcesHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.titleArea}>
        <h1 style={styles.title}>자료실</h1>
        <p style={styles.subtitle}>문서, 영상, 이미지 자료 보관·공유</p>
      </div>
      <div style={styles.actions}>
        {isAuthenticated ? (
          <Link to="/docs/upload" style={styles.uploadBtn}>
            자료 등록
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
  uploadBtn: {
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
