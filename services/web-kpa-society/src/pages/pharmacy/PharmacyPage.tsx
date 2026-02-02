/**
 * PharmacyPage - 약국경영 게이트 페이지
 *
 * WO-KPA-PHARMACY-MANAGEMENT-V1
 * WO-KPA-PHARMACY-GATE-V1: 약국경영 게이트 화면
 * WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1: 인증 상태별 분기 로직
 *
 * 분기 로직:
 * 1. 미로그인 → "로그인 필요" + 로그인 링크
 * 2. 로그인 + 직역 미설정 → FunctionGatePage로 리다이렉트
 * 3. 로그인 + 직역 != pharmacy_owner → "개설자만 이용 가능" + 돌아가기
 * 4. 로그인 + pharmacy_owner + 승인 없음 → PharmacyApprovalGatePage로 리다이렉트
 * 5. 로그인 + pharmacy_owner + 승인 완료 → /pharmacy/dashboard로 리다이렉트
 */

import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function PharmacyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accessibleOrganizations } = useOrganization();

  // 1. 미로그인
  if (!user) {
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
              <Link to="/demo/login?returnTo=/pharmacy" style={styles.joinBtn}>
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

  // 2. 직역 미설정 → FunctionGatePage
  if (!user.pharmacistRole) {
    return <Navigate to="/demo/select-function" replace />;
  }

  // 3. 직역 != pharmacy_owner → 접근 불가
  if (user.pharmacistRole !== 'pharmacy_owner') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>🔒</span>
            </div>
            <h1 style={styles.title}>약국 개설자만 이용 가능합니다</h1>
            <p style={styles.desc}>
              이 서비스는 약국 개설자를 위한 경영지원 서비스입니다.<br />
              직역 변경이 필요한 경우 마이페이지에서 수정할 수 있습니다.
            </p>
            <div style={styles.actions}>
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

  // 4. pharmacy_owner + 약국 Context 없음 → 신청 게이트
  const hasPharmacyContext = accessibleOrganizations.some(
    (org) => org.type === 'pharmacy',
  );

  if (!hasPharmacyContext) {
    return <Navigate to="/pharmacy/approval" replace />;
  }

  // 5. 승인 완료 → 대시보드
  return <Navigate to="/pharmacy/dashboard" replace />;
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
