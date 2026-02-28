/**
 * PendingApprovalPage - 승인 대기 / 정지 / 탈퇴 안내 페이지
 *
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 * WO-KPA-B-WITHDRAWN-UX-REFINEMENT-V1: 상태별 메시지 분기
 *
 * AuthGate가 pending/blocked(suspended/withdrawn) 상태 사용자를 이 페이지로 리다이렉트.
 * kpaMembership.status 기반 3분기:
 * - pending: 가입 승인 대기 안내
 * - suspended: 계정 정지 안내
 * - withdrawn: 탈퇴 계정 안내
 * 이미 active인 사용자가 직접 URL 접근 시 /dashboard로 리다이렉트.
 */

import { Navigate } from 'react-router-dom';
import { Clock, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type StatusVariant = 'pending' | 'suspended' | 'withdrawn';

const ICON_SIZE = { width: '40px', height: '40px' } as const;

const STATUS_TEXT: Record<StatusVariant, { title: string; subtitle: string; showSteps: boolean }> = {
  pending: {
    title: '승인 대기 중입니다',
    subtitle: '운영자 검토 후 승인이 완료되면 서비스 이용이 가능합니다. 일반적으로 1~2 영업일 내에 처리됩니다.',
    showSteps: true,
  },
  suspended: {
    title: '이용이 정지된 계정입니다',
    subtitle: '계정이 일시적으로 정지되어 서비스 이용이 제한됩니다. 자세한 사항은 소속 약사회에 문의해주세요.',
    showSteps: false,
  },
  withdrawn: {
    title: '탈퇴 처리된 계정입니다',
    subtitle: 'KPA 서비스에서 탈퇴되었습니다. 재가입을 원하시면 소속 약사회에 문의해주세요.',
    showSteps: false,
  },
};

const ICON_COLORS: Record<StatusVariant, { icon: string; bg: string }> = {
  pending: { icon: '#2563eb', bg: '#eff6ff' },
  suspended: { icon: '#dc2626', bg: '#fef2f2' },
  withdrawn: { icon: '#ca8a04', bg: '#fefce8' },
};

function StatusIcon({ variant }: { variant: StatusVariant }) {
  const color = ICON_COLORS[variant].icon;
  switch (variant) {
    case 'suspended': return <AlertTriangle style={{ ...ICON_SIZE, color }} />;
    case 'withdrawn': return <LogOut style={{ ...ICON_SIZE, color }} />;
    default: return <Clock style={{ ...ICON_SIZE, color }} />;
  }
}

function getStatusVariant(kpaStatus?: string | null, legacyStatus?: string): StatusVariant {
  // kpaMembership.status 우선
  if (kpaStatus === 'withdrawn') return 'withdrawn';
  if (kpaStatus === 'suspended') return 'suspended';
  if (kpaStatus === 'pending') return 'pending';
  // 하위 호환: legacyStatus 폴백
  if (legacyStatus === 'suspended') return 'suspended';
  return 'pending';
}

export function PendingApprovalPage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return null;

  // 비로그인 → 홈
  if (!user) return <Navigate to="/" replace />;

  // active → dashboard
  const kpaStatus = user.kpaMembership?.status;
  if (kpaStatus === 'active' || user.membershipStatus === 'active' || user.membershipStatus === 'approved') {
    return <Navigate to="/dashboard" replace />;
  }

  const variant = getStatusVariant(kpaStatus, user.membershipStatus);
  const config = STATUS_TEXT[variant];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ ...styles.iconWrapper, backgroundColor: ICON_COLORS[variant].bg }}>
          <StatusIcon variant={variant} />
        </div>

        <h1 style={styles.title}>{config.title}</h1>
        <p style={styles.subtitle}>{config.subtitle}</p>

        {config.showSteps && (
          <div style={styles.stepsBox}>
            <div style={styles.step}>
              <div style={{ ...styles.stepDot, backgroundColor: '#16a34a' }} />
              <span>가입 신청 완료</span>
            </div>
            <div style={styles.stepLine} />
            <div style={styles.step}>
              <div style={{ ...styles.stepDot, backgroundColor: '#f59e0b' }} />
              <span style={{ fontWeight: 600 }}>운영자 검토 중</span>
            </div>
            <div style={styles.stepLine} />
            <div style={styles.step}>
              <div style={{ ...styles.stepDot, backgroundColor: '#e2e8f0' }} />
              <span style={{ color: '#94a3b8' }}>승인 완료</span>
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <a href="/" style={styles.homeBtn}>홈으로 돌아가기</a>
          <button onClick={() => logout()} style={styles.logoutBtn}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
  },
  stepsBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#475569',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  stepLine: {
    width: '24px',
    height: '2px',
    backgroundColor: '#e2e8f0',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  homeBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    textAlign: 'center',
  },
  logoutBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default PendingApprovalPage;
