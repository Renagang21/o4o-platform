/**
 * RoleGuard — KPA Society 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * WO-KPA-OPERATOR-AUTH-QUICK-FIX-PHASE1-V1: accessDeniedMessage prop 추가
 *
 * KPA는 user.roles[] 배열 기반 역할 체크.
 * 단순 역할 체크용 — 분회 소유권 검증은 BranchAdminAuthGuard/BranchOperatorAuthGuard 사용.
 *
 * accessDeniedMessage가 지정되면 역할 불일치 시 에러 카드를 표시.
 * 미지정이면 기존처럼 `/`로 리다이렉트 (하위호환).
 */

import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { hasAnyRole } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: string;
  /** 지정 시 역할 불일치에서 리다이렉트 대신 에러 카드 표시 */
  accessDeniedMessage?: string;
  /**
   * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
   *   role 체크 통과 후 service_membership active 까지 강제할지 여부. 기본 true.
   *   role 만 있고 membership 없는 사용자는 가입/대기/제한 안내로 보낸다.
   *   public landing page 등 membership 검사가 의미 없는 곳에서만 false 사용.
   */
  enforceMembership?: boolean;
}

export function RoleGuard({ children, allowedRoles, fallback = '/login', accessDeniedMessage, enforceMembership = true }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles && !hasAnyRole(user.roles, allowedRoles)) {
    if (accessDeniedMessage) {
      return <AccessDeniedCard message={accessDeniedMessage} />;
    }
    return <Navigate to="/" replace />;
  }

  // role 통과 후 membership active 검사 (super_admin 예외, 자세한 정책은 MembershipGate)
  if (enforceMembership) {
    return <MembershipGate>{children}</MembershipGate>;
  }
  return <>{children}</>;
}

// ─── Access Denied Card (AdminAuthGuard 패턴 차용) ───

function AccessDeniedCard({ message }: { message: string }) {
  const navigate = useNavigate();

  return (
    <div style={adStyles.container}>
      <div style={adStyles.card}>
        <div style={adStyles.icon}>🔒</div>
        <h2 style={adStyles.title}>접근 권한이 없습니다</h2>
        <p style={adStyles.message}>{message}</p>
        <button style={adStyles.button} onClick={() => navigate('/')}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

const adStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px',
    margin: '0 0 12px',
  },
  message: {
    fontSize: '14px',
    color: '#475569',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
