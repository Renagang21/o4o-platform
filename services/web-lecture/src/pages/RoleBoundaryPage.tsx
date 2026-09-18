import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, SERVICE_KEY } from '../config/service';

type Area = 'instructor' | 'operator';
const AREA: Record<Area, { title: string; roles: string[] }> = {
  instructor: { title: '강사 공간', roles: [ROLES.instructor] },
  operator: { title: '운영 공간', roles: [ROLES.operator, ROLES.admin] },
};
export default function RoleBoundaryPage({ area }: { area: Area }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const config = AREA[area];
  if (isLoading) return <main className="center-card"><section className="card"><p>로그인 상태를 확인하는 중...</p></section></main>;
  if (!isAuthenticated || !user) return <main className="center-card"><section className="card"><h1>{config.title}</h1><p>로그인이 필요합니다.</p><Link className="button-link" to="/login">로그인 안내</Link></section></main>;
  const membership = user.memberships?.find((m) => m.serviceKey === SERVICE_KEY);
  if (membership?.status !== 'active') return <main className="center-card"><section className="card"><h1>{config.title}</h1><p>활성 O4O 강의 서비스 membership이 필요합니다.</p></section></main>;
  if (!config.roles.some((role) => (user.roles ?? []).includes(role))) return <main className="center-card"><section className="card"><h1>{config.title}</h1><p>이 공간에 필요한 강의 서비스 역할이 없습니다.</p></section></main>;
  return <main className="center-card"><section className="card"><h1>{config.title}</h1><p>Lecture Service Foundation 권한 경계가 준비되었습니다.</p><p className="muted">실제 LMS 업무 화면은 다음 단계에서 연결합니다.</p></section></main>;
}
