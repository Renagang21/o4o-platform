/**
 * RoleGuard — KPA Society 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * WO-KPA-OPERATOR-AUTH-QUICK-FIX-PHASE1-V1: accessDeniedMessage prop 추가
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   판정 순서(로딩 → 미인증 → 역할 → membership)를 @o4o/auth-react 의 createRouteGuard 로 위임.
 *   KPA 고유분(로딩 문구 · AccessDeniedCard · MembershipGate)만 주입으로 남는다.
 *
 * KPA는 user.roles[] 배열 기반 역할 체크.
 * 단순 역할 체크용 — 분회 소유권 검증은 KPA 전용 Guard 를 사용한다.
 * (KPA 전용 Guard: AdminAuthGuard / HubGuard / PharmacyGuard / PharmacyOwnerOnlyGuard /
 *  PharmacistOnlyGuard — 이번 WO 에서 통합하지 않는다.)
 *
 * accessDeniedMessage가 지정되면 역할 불일치 시 에러 카드를 표시.
 * 미지정이면 기존처럼 `/`로 리다이렉트 (하위호환).
 */

import { useNavigate } from 'react-router-dom';
import { createRouteGuard } from '@o4o/auth-react';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';

export const RoleGuard = createRouteGuard({
  useAuth,
  renderLoading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
    </div>
  ),
  // message 가 없으면 null 을 돌려 Core 가 deniedRedirect('/') 로 보내게 한다 — 기존 하위호환 동작.
  renderDenied: ({ message }) => (message ? <AccessDeniedCard message={message} /> : null),
  deniedRedirect: '/',
  MembershipGate,
});

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
