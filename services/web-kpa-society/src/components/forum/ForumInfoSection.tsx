/**
 * ForumInfoSection - 포럼 하단 유틸리티/안내 영역
 *
 * UtilitySection 패턴: 포럼 이용안내 + 규칙 링크
 */

import { Link } from 'react-router-dom';
import { colors, spacing, typography } from '../../styles/theme';

export function ForumInfoSection() {
  return (
    <section style={styles.container}>
      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <h4 style={styles.infoTitle}>포럼 이용안내</h4>
          <ul style={styles.infoList}>
            <li>약사회 회원이면 누구나 참여할 수 있습니다</li>
            <li>의약품 관련 전문 정보를 공유해 주세요</li>
            <li>개인정보 보호에 유의해 주세요</li>
          </ul>
        </div>
        <div style={styles.infoCard}>
          <h4 style={styles.infoTitle}>바로가기</h4>
          <div style={styles.linkList}>
            <Link to="/demo/forum/write" style={styles.link}>글쓰기</Link>
            <Link to="/demo/mypage" style={styles.link}>내 활동</Link>
            <Link to="/demo/policy" style={styles.link}>이용약관</Link>
            <Link to="/demo/help" style={styles.link}>도움말</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
    borderTop: `1px solid ${colors.neutral100}`,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
  },
  infoCard: {
    padding: spacing.md,
  },
  infoTitle: {
    ...typography.headingS,
    color: colors.neutral700,
    marginBottom: spacing.sm,
  },
  infoList: {
    margin: 0,
    paddingLeft: spacing.lg,
    color: colors.neutral500,
    fontSize: '0.813rem',
    lineHeight: '1.8',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  link: {
    fontSize: '0.813rem',
    color: colors.neutral500,
    textDecoration: 'none',
  },
};
