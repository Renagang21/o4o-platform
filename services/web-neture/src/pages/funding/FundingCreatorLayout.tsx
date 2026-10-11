import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getFundingCreatorEligibility, selectFundingOrganization } from '../../api/trial';

export function FundingCreatorLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [version, setVersion] = useState(0);
  const [verifiedScope, setVerifiedScope] = useState('');
  const scope = `${user?.id}:${version}`;
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<{ organizationId: string; organizationName: string | null }[]>([]);
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let active = true;
    setVerifiedScope(''); setError(''); setCandidates([]);
    getFundingCreatorEligibility().then(() => { if (active) setVerifiedScope(scope); }).catch(e => {
      if (!active) return;
      setCandidates(e.response?.data?.candidates ?? []);
      setError(e.response?.data?.error?.message ?? '공급자 자격을 확인하지 못했습니다. 다시 시도해 주세요.');
    });
    return () => { active = false; };
  }, [isAuthenticated, user?.id, version, scope]);
  if (isLoading) return <p role="status" className="p-6">로그인 상태를 확인하고 있습니다…</p>;
  if (!isAuthenticated) return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <section className="mx-auto max-w-6xl p-4 sm:p-6">
    <nav className="mb-5 flex flex-wrap gap-4 text-sm text-blue-700"><Link to="/">펀딩 홈</Link><Link to="/market-trial/manage">내 펀딩</Link><Link to="/market-trial/manage/new">개설 신청</Link></nav>
    {error ? <div role="alert" className="rounded border p-4"><p>{error}</p>
      {candidates.map(c => <button key={c.organizationId} className="m-2 min-h-11 rounded border px-4" onClick={() => { selectFundingOrganization(c.organizationId); setVersion(v => v + 1); }}>{c.organizationName || '공급자 조직 선택'}</button>)}
      <button className="m-2 min-h-11 rounded border px-4" onClick={() => { selectFundingOrganization(''); setVersion(v => v + 1); }}>조직 선택 다시 확인</button><a href="https://supplier.neture.co.kr" className="m-2 text-blue-700">공급자 서비스</a>
    </div> : verifiedScope !== scope ? <p role="status">공급자 자격을 확인하고 있습니다…</p> : <Outlet key={`${user?.id}:${version}`} />}
  </section>;
}
