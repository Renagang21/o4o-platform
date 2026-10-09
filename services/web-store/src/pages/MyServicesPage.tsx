import { useEffect, useState } from 'react';
import { neturePharmacyApi, type SemiFranchiseRow } from '../api/neturePharmacy';
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
  const { organizationId, organizationName, services, workServiceKeys } = useUnifiedStore();
  const [businesses, setBusinesses] = useState<SemiFranchiseRow[]>([]);
  const [businessError, setBusinessError] = useState('');
  const pharmacy = workServiceKeys.includes('kpa-society');
  useEffect(() => {
    let active = true;
    setBusinesses([]); setBusinessError('');
    if (pharmacy) neturePharmacyApi.listSemiFranchises().then(rows => {
      if (active) setBusinesses(rows.filter(r => r.membershipStatus !== null));
    }).catch(() => { if (active) setBusinessError('사업 가입 상태를 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [organizationId, pharmacy]);
  return <main className="page"><section className="hero">
    <span className="eyebrow">{organizationName}</span>
    <h1>내 서비스</h1>
    {pharmacy && <section className="my-6" aria-label="사업별 가입과 이용">
      <h2>세미프랜차이즈 가입 · 이용</h2>
      <p className="muted">각 사업의 승인 상태와 공급 조건은 독립적으로 적용됩니다.</p>
      {businessError && <p role="alert">{businessError}</p>}
      <ul className="option-list">{businesses.map(b => <li key={b.key} className="option">
        <span className="option-name">{b.name} · {b.membershipStatus === 'active' ? '이용 중' : b.membershipStatus === 'pending' ? '승인 대기' : b.membershipStatus}</span>
        {b.membershipStatus === 'active' && <span className="option-meta"><Link to={`/store/pharmacy/supply?source=${encodeURIComponent(`sf:${b.key}`)}`}>공급 상품</Link> · <Link to={`/store/pharmacy/contents?business=${encodeURIComponent(b.key)}`}>제공 콘텐츠</Link></span>}
      </li>)}</ul>
      <Link className="button-link" to="/store/pharmacy/semi-franchises">가입 신청 · 상태 · 커뮤니티</Link>
    </section>}
    <h2>매장 업무 연결</h2>
    <p className="muted">한 약국이 가입한 사업의 공급 상품·자료·커뮤니티를 이용합니다.</p>
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
