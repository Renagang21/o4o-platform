/**
 * Lecture 접근 경계 (프론트 1차 필터) — WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §7
 *
 *   learner    = active lecture membership (role 불요)
 *   instructor = membership + lecture:instructor
 *   operator   = membership + lecture:operator | lecture:admin
 *
 * 판정 정본은 백엔드 guard 다. 이 컴포넌트는 안내 화면만 담당하며 role 이 있어도 membership 이
 * 없으면 막는다 (role without membership → deny). KPA/KCos/PH membership · role 은 보지 않는다.
 */
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, SERVICE_KEY } from '../config/service';

export type AccessArea = 'learner' | 'instructor' | 'operator';

const AREA: Record<AccessArea, { title: string; roles: readonly string[] }> = {
  learner: { title: '내 학습', roles: [] },
  instructor: { title: '강사 공간', roles: [ROLES.instructor] },
  operator: { title: '운영 공간', roles: [ROLES.operator, ROLES.admin] },
};

export function hasLectureMembership(memberships?: { serviceKey: string; status: string }[]): boolean {
  return memberships?.some((m) => m.serviceKey === SERVICE_KEY && m.status === 'active') ?? false;
}
export function hasAreaRole(area: AccessArea, roles?: string[]): boolean {
  const need = AREA[area].roles;
  if (need.length === 0) return true;
  return need.some((r) => (roles ?? []).includes(r));
}
export function canAccess(area: AccessArea, user: { roles?: string[]; memberships?: { serviceKey: string; status: string }[] } | null): boolean {
  if (!user) return false;
  if ((user.roles ?? []).includes('platform:super_admin')) return true;
  return hasLectureMembership(user.memberships) && hasAreaRole(area, user.roles);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="center-card"><section className="card"><h1>{title}</h1>{children}</section></main>;
}

export default function AccessGate({ area }: { area: AccessArea }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const config = AREA[area];
  if (isLoading) return <Card title={config.title}><p>로그인 상태를 확인하는 중...</p></Card>;
  if (!isAuthenticated || !user) {
    return <Card title={config.title}><p>로그인이 필요합니다.</p><Link className="button-link" to="/login">로그인</Link></Card>;
  }
  if ((user.roles ?? []).includes('platform:super_admin')) return <Outlet />;
  if (!hasLectureMembership(user.memberships)) {
    return <Card title={config.title}>
      <p>활성 O4O 강의 서비스 membership 이 필요합니다.</p>
      <p className="muted">다른 O4O 서비스 회원 자격은 이 서비스로 승계되지 않습니다. 강의 서비스 가입 후 이용해 주세요.</p>
    </Card>;
  }
  if (!hasAreaRole(area, user.roles)) {
    return <Card title={config.title}>
      <p>이 공간에 필요한 강의 서비스 역할이 없습니다.</p>
      {area === 'instructor' && <p className="muted"><Link to="/my/instructor-apply">강사 신청</Link> 후 운영자 승인을 받으면 이용할 수 있습니다.</p>}
    </Card>;
  }
  return <Outlet />;
}
