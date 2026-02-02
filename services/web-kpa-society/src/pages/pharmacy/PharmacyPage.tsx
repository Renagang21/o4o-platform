/**
 * PharmacyPage - 약국경영 게이트 페이지
 *
 * "약국 개설자 서비스입니다" 안내 화면을 보여주고,
 * 가입 또는 돌아가기를 선택하도록 한다.
 *
 * WO-KPA-PHARMACY-MANAGEMENT-V1
 * WO-KPA-PHARMACY-GATE-V1: 약국경영 게이트 화면
 */

import { Link, useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function PharmacyPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <span style={styles.icon}>💊</span>
          </div>
          <h1 style={styles.title}>약국 개설자 서비스입니다</h1>
          <p style={styles.desc}>
            약국을 개설한 약사를 위한 경영지원 서비스입니다.<br />
            약사회 회원 계정으로 로그인 후 이용할 수 있습니다.
          </p>
          <div style={styles.actions}>
            <Link to="/demo/login" style={styles.joinBtn}>
              로그인
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={styles.backBtn}
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PharmacyPage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '480px',
    width: '100%',
    padding: `0 ${spacing.lg}`,
  },
  card: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: `${spacing.xl} ${spacing.xl}`,
    textAlign: 'center',
  },
  iconWrap: {
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: '3rem',
  },
  title: {
    ...typography.headingL,
    margin: `0 0 ${spacing.md}`,
    color: colors.neutral900,
  },
  desc: {
    margin: `0 0 ${spacing.xl}`,
    fontSize: '0.938rem',
    color: colors.neutral600,
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: spacing.md,
    justifyContent: 'center',
  },
  joinBtn: {
    display: 'inline-block',
    padding: `${spacing.sm} ${spacing.xl}`,
    fontSize: '0.938rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    minWidth: '120px',
    textAlign: 'center',
  },
  backBtn: {
    padding: `${spacing.sm} ${spacing.xl}`,
    fontSize: '0.938rem',
    fontWeight: 600,
    color: colors.neutral700,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    minWidth: '120px',
  },
};
