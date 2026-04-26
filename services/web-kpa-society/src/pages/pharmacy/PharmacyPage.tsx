/**
 * PharmacyPage - 약국경영 게이트 페이지
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 보유 시 /store 리다이렉트.
 *   미보유 시 API 신청 상태(approved/pending/rejected/none)로 안내.
 */

import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyRequestsCached } from '../../api/pharmacyRequestApi';
import { hasAnyRole, STORE_OWNER_ROLES } from '../../lib/role-constants';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

/** Admin/operator roles that should NOT see pharmacist function selection */
const NON_PHARMACIST_ROLES = ['admin', 'super_admin', 'district_admin', 'branch_admin', 'operator'];

export function PharmacyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<'loading' | 'approved' | 'pending' | 'rejected' | 'none' | 'error'>('loading');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const isAdminOrOperator = user?.roles.some(r => NON_PHARMACIST_ROLES.includes(r)) ?? false;
  const hasStoreRole = !!user && hasAnyRole(user.roles, STORE_OWNER_ROLES);

  useEffect(() => {
    if (!user || isAdminOrOperator) {
      setApprovalStatus('none');
      return;
    }
    // 이미 결과가 있으면 재요청 불필요
    if (approvalStatus !== 'loading') return;

    let cancelled = false;
    (async () => {
      try {
        const items = await getMyRequestsCached();
        if (cancelled) return;
        const approved = items.find((r) => r.status === 'approved');
        if (approved) {
          setApprovalStatus('approved');
        } else if (items.some((r) => r.status === 'pending')) {
          setApprovalStatus('pending');
        } else if (items.some((r) => r.status === 'rejected')) {
          setApprovalStatus('rejected');
        } else {
          setApprovalStatus('none');
        }
      } catch (err: any) {
        if (!cancelled) {
          const status = err?.status || err?.response?.status;
          console.error('[PharmacyPage] getMyRequests failed:', status, err?.message);
          if (status === 401) {
            setApprovalError('인증이 만료되었습니다. 페이지를 새로고침해 주세요.');
          } else {
            setApprovalError(err?.message || '승인 상태를 확인할 수 없습니다.');
          }
          setApprovalStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, isAdminOrOperator, approvalStatus]);

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

  if (hasStoreRole) {
    return <Navigate to="/store" replace />;
  }

  // 3. API 로딩 중
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

  // 4. 승인 완료 — role 미반영 시 새로고침 안내 (hasStoreRole=true면 위에서 리다이렉트됨)
  if (approvalStatus === 'approved') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>✅</span>
            </div>
            <h1 style={styles.title}>승인이 완료되었습니다</h1>
            <p style={styles.desc}>
              약국 서비스 이용이 승인되었습니다.<br />
              세션이 갱신되도록 잠시 후 페이지를 새로고침해 주세요.
            </p>
            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={styles.joinBtn}
              >
                새로고침
              </button>
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

  // 5. 대기 중 → 대기 안내 화면
  if (approvalStatus === 'pending') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>⏳</span>
            </div>
            <h1 style={styles.title}>승인 대기 중입니다</h1>
            <p style={styles.desc}>
              약국 서비스 이용 신청이 접수되었습니다.<br />
              운영자 승인 후 이용하실 수 있습니다.
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

  // 5.5 반려 → 재신청 안내
  if (approvalStatus === 'rejected') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>❌</span>
            </div>
            <h1 style={styles.title}>신청이 반려되었습니다</h1>
            <p style={styles.desc}>
              약국 서비스 신청이 반려되었습니다.<br />
              반려 사유를 확인하신 후 다시 신청해 주세요.
            </p>
            <div style={styles.actions}>
              <Link to="/pharmacy/approval" style={styles.joinBtn}>
                다시 신청하기
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

  // 6. API 에러 → 새로고침 안내
  if (approvalStatus === 'error') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>⚠️</span>
            </div>
            <h1 style={styles.title}>상태 확인에 실패했습니다</h1>
            <p style={styles.desc}>
              {approvalError || '승인 상태를 확인할 수 없습니다.'}
            </p>
            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={styles.joinBtn}
              >
                새로고침
              </button>
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

  // 7. 미신청 → 신청 게이트로 이동
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
