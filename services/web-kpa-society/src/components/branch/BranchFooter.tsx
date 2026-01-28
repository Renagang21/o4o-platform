/**
 * BranchFooter - 분회 전용 푸터
 */

import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface BranchFooterProps {
  branchName: string;
}

export function BranchFooter({ branchName }: BranchFooterProps) {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.branchInfo}>
            <h3 style={styles.branchName}>
              <span style={styles.logoIcon}>💊</span>
              {branchName} 분회
            </h3>
            <p style={styles.address}>KPA-Society 소속</p>
          </div>

          <div style={styles.links}>
            <Link to="/" style={styles.link}>본부 사이트</Link>
            <span style={styles.divider}>|</span>
            <Link to="/organization/branches" style={styles.link}>지부/분회 안내</Link>
            <span style={styles.divider}>|</span>
            <Link to="/organization/contact" style={styles.link}>연락처</Link>
          </div>
        </div>

        <div style={styles.copyright}>
          © {new Date().getFullYear()} {branchName} 분회 (KPA-Society)
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: colors.neutral800,
    color: colors.neutral300,
    padding: '40px 20px',
    marginTop: 'auto',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  content: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: `1px solid ${colors.neutral700}`,
  },
  branchInfo: {},
  branchName: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.white,
    margin: 0,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '20px',
  },
  address: {
    fontSize: '14px',
    color: colors.neutral400,
    margin: 0,
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  link: {
    color: colors.neutral400,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.2s',
  },
  divider: {
    color: colors.neutral600,
  },
  copyright: {
    fontSize: '13px',
    color: colors.neutral500,
    textAlign: 'center',
  },
};
