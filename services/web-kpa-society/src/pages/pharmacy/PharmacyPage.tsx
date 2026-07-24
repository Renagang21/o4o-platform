/**
 * PharmacyPage - 약국경영 게이트 페이지
 *
 * WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
 *   약국 서비스 별도 신청(pharmacyRequestApi) 흐름 폐지.
 *   매장 운영 권한(kpa:store_owner)은 약국 경영자 회원 승인(Path B) 시 자동 부여된다.
 *   본 게이트는 별도 신청 상태를 조회하지 않고 role 만으로 분기한다:
 *     - 미로그인            → 로그인 안내
 *     - 관리자/운영자       → 접근 불가 안내
 *     - store_owner 보유    → /store 리다이렉트
 *     - 그 외 회원          → 약국 경영자 회원 안내 (신청 버튼 없음)
 */

import { Navigate, Link, useNavigate } from 'react-router-dom';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../lib/role-constants';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

/** Admin/operator roles that should NOT see pharmacist function selection */
const NON_PHARMACIST_ROLES = ['admin', 'super_admin', 'district_admin', 'branch_admin', 'operator'];

export function PharmacyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdminOrOperator = user?.roles.some(r => NON_PHARMACIST_ROLES.includes(r)) ?? false;
  // WO-O4O-KPA-STOREOWNER-GUARD-CANONICAL-ALIGNMENT-V1:
  //   PharmacyGuard / HubGuard 와 동일한 dual-check 적용.
  //   stale JWT 시 user.isStoreOwner (KPA context) fallback 으로 회복.
  const hasStoreRole = !!user && isStoreOwnerDual(user.roles, ROLES.KPA_STORE_OWNER, user.isStoreOwner);

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
              <Link to="/login?returnTo=/pharmacy" style={styles.joinBtn}>
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

  // 2. 관리자/운영자 → 접근 불가
  if (isAdminOrOperator) {
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
              관리자/운영자 계정으로는 이용할 수 없습니다.
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

  // 3. store_owner 보유 → 매장으로 이동
  if (hasStoreRole) {
    return <Navigate to="/store" replace />;
  }

  // 4. 그 외 회원 → 약국 경영자 회원 안내 (별도 신청 없음)
  //    WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
  //    별도 "매장 운영 신청" 폼을 제공하지 않고, 회원 승인 시 자동 이용됨을 안내한다.
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <span style={styles.icon}>💊</span>
          </div>
          <h1 style={styles.title}>약국 경영자 회원 안내</h1>
          <p style={styles.desc}>
            약국 경영자 회원으로 승인되면 내 매장 / Store HUB 등 매장 기능을
            <strong> 별도 신청 없이 자동으로</strong> 사용할 수 있습니다.<br />
            약국 경영자 회원 신청·승인 절차는 아래 안내를 참고해 주세요.
          </p>
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              • 약국 경영자(pharmacy_owner) 회원으로 신청하고 사업자 정보(사업자번호·약국명)를 등록합니다.<br />
              • 운영자가 회원을 승인하면 약국 조직 생성과 매장 운영 권한 부여가 함께 완료됩니다.<br />
              • 승인 후에는 별도 신청 없이 내 매장으로 바로 진입할 수 있습니다.
            </p>
          </div>
          <div style={styles.actions}>
            <Link to="/join/pharmacy" style={styles.joinBtn}>
              약국 경영자 회원 안내
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
  infoBox: {
    margin: `0 0 ${spacing.xl}`,
    padding: `${spacing.md}`,
    background: colors.neutral50,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral200}`,
    textAlign: 'left' as const,
  },
  infoText: {
    margin: 0,
    fontSize: '0.813rem',
    color: colors.neutral600,
    lineHeight: 1.8,
  },
};
