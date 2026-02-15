/**
 * PharmacyPage - 약국경영 게이트 페이지
 *
 * WO-KPA-PHARMACY-MANAGEMENT-V1
 * WO-KPA-PHARMACY-GATE-V1: 약국경영 게이트 화면
 * WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1: 인증 상태별 분기 로직
 *
 * 분기 로직:
 * 1. 미로그인 → "로그인 필요" + 로그인 링크
 * 2. 관리자/운영자 → "접근 불가" (직능 선택 불필요)
 * 3. 직역 미설정 → FunctionGateModal 표시
 * 4. 직역 != pharmacy_owner → "개설자만 이용 가능" + 돌아가기
 * 5. pharmacy_owner + 승인 없음 → PharmacyApprovalGatePage로 리다이렉트
 * 6. pharmacy_owner + 승인 완료 → /pharmacy/hub로 리다이렉트
 */

import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { joinRequestApi } from '../../api/joinRequestApi';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

/** Admin/operator roles that should NOT see pharmacist function selection */
const NON_PHARMACIST_ROLES = ['admin', 'super_admin', 'district_admin', 'branch_admin', 'operator'];

export function PharmacyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openFunctionGateModal } = useAuthModal();
  const [approvalStatus, setApprovalStatus] = useState<'loading' | 'approved' | 'pending' | 'none'>('loading');

  const isAdminOrOperator = user?.role ? NON_PHARMACIST_ROLES.includes(user.role) : false;
  const isPharmacyOwner = !!user && !isAdminOrOperator && user.pharmacistRole === 'pharmacy_owner';
  const needsFunctionSelection = !!user && !isAdminOrOperator && !user.pharmacistRole;

  // 직역 미설정 시 모달 자동 표시
  useEffect(() => {
    if (needsFunctionSelection) {
      openFunctionGateModal();
    }
  }, [needsFunctionSelection, openFunctionGateModal]);

  // pharmacy_owner의 승인 상태 확인
  useEffect(() => {
    if (!isPharmacyOwner) {
      setApprovalStatus('none');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await joinRequestApi.getMyRequests();
        if (cancelled) return;
        const requests = res?.data || [];
        const pharmacyRequest = requests.find(
          (r: any) => r.requestType === 'pharmacy_join'
        );
        if (pharmacyRequest?.status === 'approved') {
          setApprovalStatus('approved');
        } else if (pharmacyRequest) {
          setApprovalStatus('pending');
        } else {
          setApprovalStatus('none');
        }
      } catch {
        if (!cancelled) setApprovalStatus('none');
      }
    })();
    return () => { cancelled = true; };
  }, [isPharmacyOwner]);

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

  // 2. 관리자/운영자 → 약사 직능 선택 불필요, 접근 불가 표시
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

  // 3. 직역 미설정 → 직능/직역 선택 모달 표시 (useEffect에서 모달 오픈)
  if (!user.pharmacistRole) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>💊</span>
            </div>
            <h1 style={styles.title}>직능/직역을 먼저 선택해 주세요</h1>
            <p style={styles.desc}>
              약국경영 서비스를 이용하려면<br />
              약사 직능과 직역을 먼저 선택해야 합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. 직역 != pharmacy_owner → 개설자 전용 안내
  if (user.pharmacistRole !== 'pharmacy_owner') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>🔒</span>
            </div>
            <h1 style={styles.title}>약국 개설자 전용 서비스입니다</h1>
            <p style={styles.desc}>
              이 서비스는 약국을 개설하여 운영하는 회원만 이용할 수 있습니다.<br />
              약국 개설자로 전환하려면 승인 신청이 필요합니다.
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>약국 개설자 서비스란?</strong><br />
                사이버 매장 관리, B2B 구매, 사이니지 콘텐츠 관리 등<br />
                약국 운영에 필요한 경영지원 기능을 제공합니다.
              </p>
            </div>
            <div style={styles.actions}>
              <Link to="/pharmacy/approval" style={styles.joinBtn}>
                약국 개설자 신청하기
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

  // 5. pharmacy_owner — 승인 상태에 따라 분기
  if (approvalStatus === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <p style={styles.desc}>승인 상태 확인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 6. 승인 완료 → 허브로 이동
  if (approvalStatus === 'approved') {
    return <Navigate to="/pharmacy/hub" replace />;
  }

  // 7. 미승인/미신청 → 신청 게이트로 이동
  return <Navigate to="/pharmacy/approval" replace />;
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
    lineHeight: 1.6,
  },
};
