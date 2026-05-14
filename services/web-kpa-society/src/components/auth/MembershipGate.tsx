/**
 * MembershipGate — KPA Society 서비스 membership 진입 gate
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 *
 * 사용 위치: 인증 통과 직후 (RoleGuard / PharmacyGuard 등 기존 role guard 내부).
 *   - 미인증: 본 gate 는 통과시킴 → 호출자(role guard) 가 /login redirect 처리
 *   - super_admin: 통과
 *   - membership active: 통과
 *   - 그 외 (none / pending / rejected / suspended / withdrawn): 상태별 안내 화면
 *
 * 안내 화면에는 가입 신청 또는 이용 제한 안내만 표시 — 편집/관리 진입점 없음.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  SERVICE_KEY,
  getServiceMembershipStatus,
  isPlatformSuperAdmin,
  type MembershipStatus,
} from '../../lib/membershipGate';

interface MembershipGateProps {
  children: React.ReactNode;
  /** 기본 'kpa-society'. 다른 service key 로 gate 가 필요할 때만 override. */
  serviceKey?: string;
}

export function MembershipGate({ children, serviceKey = SERVICE_KEY }: MembershipGateProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={loadingStyle}>
        <p style={{ color: '#64748B' }}>이용 권한을 확인하는 중...</p>
      </div>
    );
  }

  // 미인증은 본 gate 의 책임이 아님 — 상위 role guard 가 /login 으로 보낸다.
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  if (isPlatformSuperAdmin(user)) {
    return <>{children}</>;
  }

  const status = getServiceMembershipStatus(user, serviceKey);
  if (status === 'active') {
    return <>{children}</>;
  }

  return <MembershipStatusScreen status={status} serviceKey={serviceKey} />;
}

// ─────────────────────────────────────────────────────
// Status Screen (조회/안내 전용 — 편집/관리 진입점 없음)
// ─────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<Exclude<MembershipStatus, 'active'>, { title: string; message: string }> = {
  none:      { title: '서비스 가입이 필요합니다', message: '이 서비스를 이용하려면 먼저 가입 신청을 해주세요.' },
  pending:   { title: '가입 승인 대기 중',         message: '가입 신청이 승인 대기 중입니다. 승인 완료 후 이용하실 수 있습니다.' },
  rejected:  { title: '가입 신청 반려',             message: '가입 신청이 반려되었습니다. 자세한 사항은 운영자에게 문의해주세요.' },
  suspended: { title: '서비스 이용 정지',          message: '서비스 이용이 정지되었습니다. 자세한 사항은 운영자에게 문의해주세요.' },
  withdrawn: { title: '탈퇴 처리된 서비스',         message: '이 서비스에서 탈퇴 처리되었습니다. 재가입을 원하시면 운영자에게 문의해주세요.' },
};

// 가입 신청 화면 경로 (KPA 기준). 없는 경우는 홈으로 fallback.
const APPLY_PATH: Partial<Record<string, string>> = {
  'kpa-society': '/member/apply',
};

function MembershipStatusScreen({ status, serviceKey }: { status: Exclude<MembershipStatus, 'active'>; serviceKey: string }) {
  const navigate = useNavigate();
  const info = STATUS_MESSAGES[status];
  const applyPath = APPLY_PATH[serviceKey] ?? null;
  const canApply = status === 'none';

  return (
    <div style={screenStyles.container}>
      <div style={screenStyles.card}>
        <div style={screenStyles.icon}>
          {status === 'pending' ? '⏳' : status === 'none' ? '📝' : '🚫'}
        </div>
        <h2 style={screenStyles.title}>{info.title}</h2>
        <p style={screenStyles.message}>{info.message}</p>
        <div style={screenStyles.buttonRow}>
          {canApply && applyPath && (
            <button
              type="button"
              style={screenStyles.primaryBtn}
              onClick={() => navigate(applyPath)}
            >
              가입 신청하기
            </button>
          )}
          <button
            type="button"
            style={screenStyles.secondaryBtn}
            onClick={() => navigate('/')}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
};

const screenStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid #E5E7EB',
  },
  icon: {
    fontSize: '44px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0F172A',
    margin: '0 0 10px',
  },
  message: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '10px 22px',
    background: '#2563EB',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 22px',
    background: '#F1F5F9',
    color: '#334155',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
