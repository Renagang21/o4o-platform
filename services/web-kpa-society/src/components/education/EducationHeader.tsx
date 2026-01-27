/**
 * EducationHeader - 교육 페이지 헤더
 *
 * 불필요한 설명 없이 "학습" 행동에 초점
 * 로그인 전: 안내 / 로그인 후: 내 학습 바로가기
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export function EducationHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.titleArea}>
        <h1 style={styles.title}>교육</h1>
        <p style={styles.subtitle}>보수교육, 온라인 세미나, 실무 강의</p>
      </div>
      <div style={styles.actions}>
        {isAuthenticated ? (
          <Link to="/demo/lms/certificate" style={styles.myLearningBtn}>
            내 학습 현황
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
  myLearningBtn: {
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
