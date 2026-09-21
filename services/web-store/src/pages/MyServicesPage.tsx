import { Link } from 'react-router-dom';
import { useUnifiedStore } from '../contexts/StoreContext';
import { WORKSPACE_PATHS } from '../config/workspace';
import { isUnifiedServiceKey } from '../lib/serviceContext';

const MODE_LABEL: Record<string, string> = {
  standard: '표준 업무공간',
  special: '전용 업무공간',
  none: '업무공간 없음',
  undecided: '미정',
};

/**
 * 내 서비스(§3-⑥ · §8-4) — 현재 매장의 enrollments. 클릭 = 같은 Workspace 안의 서비스 업무(/work/:serviceKey) 문맥 전환.
 * handoff 하지 않는다(서비스 도메인으로 나가지 않는다).
 */
export default function MyServicesPage() {
  const { organizationName, services, workServiceKeys } = useUnifiedStore();
  return <main className="page"><section className="hero">
    <span className="eyebrow">{organizationName}</span>
    <h1>내 서비스</h1>
    <p className="muted">이 매장이 가입한 서비스입니다. 서비스를 선택하면 같은 업무공간 안에서 그 서비스의 업무로 전환합니다.</p>
    {services.length === 0 && <p data-testid="my-services-empty">가입된 서비스가 없습니다.</p>}
    <ul className="option-list" data-testid="my-services">
      {services.map((s) => {
        const enterable = isUnifiedServiceKey(s.serviceKey) && workServiceKeys.includes(s.serviceKey);
        const meta = <span className="option-meta">
          {s.enrollmentStatus === 'active' ? '이용 중' : '비활성'} · {MODE_LABEL[s.workspaceMode] ?? s.workspaceMode}
          {enterable ? ' · 서비스 업무 열기 →' : ' · 업무공간 제공 전'}
        </span>;
        return <li key={s.serviceKey}>
          {enterable
            ? <Link className="option" to={`${WORKSPACE_PATHS.serviceWork}/${s.serviceKey}`}><span className="option-name">{s.serviceName}</span>{meta}</Link>
            : <span className="option unavailable"><span className="option-name">{s.serviceName}</span>{meta}</span>}
        </li>;
      })}
    </ul>
  </section></main>;
}
