/**
 * UtilityLinks - 유틸리티 링크 섹션
 *
 * 계정/알림, 참여 중 서비스(로그인 후), 도움말/정책
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../styles/theme';

export function UtilityLinks() {
  const { isAuthenticated } = useAuth();

  return (
    <section style={styles.container}>
      <div style={styles.row}>
        {/* 공통 링크 */}
        <Link to="/demo/help" style={styles.link}>도움말</Link>
        <Link to="/demo/policy" style={styles.link}>이용약관</Link>
        <Link to="/demo/privacy" style={styles.link}>개인정보처리방침</Link>

        {/* 로그인 후 전용 */}
        {isAuthenticated && (
          <>
            <Link to="/demo/my/notifications" style={styles.link}>알림</Link>
            <Link to="/demo/my/account" style={styles.link}>내 계정</Link>
            <Link to="/demo/my/services" style={styles.link}>참여 중 서비스</Link>
          </>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
    borderTop: `1px solid ${colors.neutral100}`,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  link: {
    ...typography.bodyS,
    color: colors.neutral400,
    textDecoration: 'none',
  },
};
