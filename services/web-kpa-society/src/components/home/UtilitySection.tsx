/**
 * UtilitySection - 메인 하단 실무/보조 영역
 *
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: 깨진 링크 수정, 반응형 CSS 추가
 *
 * 구조:
 * - LoggedInUserPanel (로그인 후만 노출): 내 활동 요약, 알림
 * - HelpAndPolicyLinks: 도움말, 정책, 약관
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const responsiveStyles = `
  .user-panel-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing.sm};
  }
  @media (min-width: 768px) {
    .user-panel-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
`;

/**
 * LoggedInUserPanel - 로그인한 사용자 전용 패널
 */
function LoggedInUserPanel() {
  const { user } = useAuth();

  useEffect(() => {
    const styleId = 'utility-section-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = responsiveStyles;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={styles.userPanel}>
      <div style={styles.userPanelHeader}>
        <span style={styles.userGreeting}>{user?.name}님, 환영합니다</span>
      </div>
      <div className="user-panel-grid">
        <Link to="/mypage" style={styles.userPanelLink}>
          <span style={styles.userPanelIcon}>📊</span>
          <span>내 활동 요약</span>
        </Link>
        <Link to="/mypage/settings" style={styles.userPanelLink}>
          <span style={styles.userPanelIcon}>🔔</span>
          <span>알림 설정</span>
        </Link>
        <Link to="/lms" style={styles.userPanelLink}>
          <span style={styles.userPanelIcon}>📜</span>
          <span>이수 현황</span>
        </Link>
        <Link to="/forum" style={styles.userPanelLink}>
          <span style={styles.userPanelIcon}>📝</span>
          <span>참여 중 서비스</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * HelpAndPolicyLinks - 도움말/정책 링크
 */
function HelpAndPolicyLinks() {
  return (
    <div style={styles.linksRow}>
      <Link to="/help" style={styles.link}>도움말</Link>
      <Link to="/policy" style={styles.link}>이용약관</Link>
      <Link to="/privacy" style={styles.link}>개인정보처리방침</Link>
      <Link to="/organization" style={styles.link}>약사회 소개</Link>
      <Link to="/organization/contact" style={styles.link}>연락처</Link>
    </div>
  );
}

export function UtilitySection() {
  const { isAuthenticated } = useAuth();

  return (
    <section style={styles.container}>
      {isAuthenticated && <LoggedInUserPanel />}
      <HelpAndPolicyLinks />
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
    borderTop: `1px solid ${colors.neutral100}`,
  },
  // LoggedInUserPanel
  userPanel: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    marginBottom: spacing.lg,
  },
  userPanelHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  userGreeting: {
    ...typography.headingS,
    color: colors.neutral900,
  },
  userPanelLink: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    color: colors.neutral700,
    fontSize: '0.813rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  userPanelIcon: {
    fontSize: '1.25rem',
  },
  // HelpAndPolicyLinks
  linksRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  link: {
    fontSize: '0.813rem',
    color: colors.neutral400,
    textDecoration: 'none',
  },
};
