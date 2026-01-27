/**
 * PharmacyUnlinkedView - 로그인 후 약국 미연결 상태
 *
 * "당신은 약사지만, 아직 약국이 연결되지 않았다"
 */

import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export function PharmacyUnlinkedView() {
  return (
    <div style={styles.container}>
      {/* PageHeader */}
      <div style={styles.header}>
        <h1 style={styles.title}>약국경영</h1>
      </div>

      {/* WarningNotice */}
      <div style={styles.warning}>
        <p style={styles.warningText}>연결된 약국이 없습니다.</p>
      </div>

      {/* ActionBox */}
      <div style={styles.actionBox}>
        <p style={styles.actionDesc}>
          약국경영 서비스를 이용하려면 약국 연결이 필요합니다.
          관리자에게 연결을 요청해 주세요.
        </p>
        <button style={styles.requestBtn}>
          약국 연결 요청
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  header: {
    padding: `${spacing.xl} 0 ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  warning: {
    padding: spacing.md,
    backgroundColor: `${colors.accentYellow}10`,
    border: `1px solid ${colors.accentYellow}30`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  warningText: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.accentYellow,
  },
  actionBox: {
    padding: spacing.xl,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    textAlign: 'center',
  },
  actionDesc: {
    margin: `0 0 ${spacing.lg}`,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.6,
  },
  requestBtn: {
    padding: `${spacing.sm} ${spacing.xl}`,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
};
