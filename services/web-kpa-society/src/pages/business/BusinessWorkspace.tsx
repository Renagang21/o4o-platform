import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { businessApi, businessBase, communityApiBase, pharmacyApiBase, businessError, type Business, type ParticipantAccess } from './api';

export interface BusinessContext { business: Business; access: ParticipantAccess | null }
export const useBusiness = () => useOutletContext<BusinessContext>();

export default function BusinessWorkspace() {
  const { businessKey = '' } = useParams();
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<(BusinessContext & { loadedFor: string }) | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setState(null); setError('');
    if (isLoading || !user) return;
    void (async () => {
      try {
        const business = await businessApi.get<Business>(`${pharmacyApiBase}/businesses/${encodeURIComponent(businessKey)}`);
        const access = business.communityKey
          ? await businessApi.get<ParticipantAccess>(`${communityApiBase(business.communityKey)}/access`) : null;
        if (access && (access.kind !== 'semi-franchise' || access.businessKey !== business.key)) throw new Error('Business scope mismatch');
        if (alive) setState({ business, access, loadedFor: `${user.id}:${businessKey}` });
      } catch (e) { if (alive) setError(businessError(e)); }
    })();
    return () => { alive = false; };
  }, [businessKey, user?.id, isLoading, retry]);
  if (isLoading) return <output className="p-6" aria-live="polite">로그인 상태를 확인하고 있습니다…</output>;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} state={{ from: location.pathname + location.search }} replace />;
  if (error) return <section className="p-6"><p role="alert">{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>다시 시도</button></section>;
  if (state?.loadedFor !== `${user.id}:${businessKey}`) return <output className="p-6" aria-live="polite">사업 정보를 확인하고 있습니다…</output>;
  const base = businessBase(businessKey);
  return <div className="mx-auto max-w-6xl px-4 py-6">
    <h1 className="text-2xl font-semibold">{state.business.name}</h1>
    <nav aria-label="약국 협력사업 업무" className="my-5 flex flex-wrap gap-2 border-b pb-4">
      {[
        ['participation', '참여 신청'], ['materials', '사업 자료'], ['forum', '참여자 게시판'], ['tools', '업무 도구'],
      ].map(([path, label]) => <NavLink key={path} to={`${base}/${path}`} className={({ isActive }) => `rounded-lg px-4 py-2 text-sm ${isActive ? 'bg-blue-700 text-white' : 'border bg-white text-slate-700'}`}>{label}</NavLink>)}
      <NavLink to="/contact" className="rounded-lg border px-4 py-2 text-sm">Contact Us</NavLink>
    </nav>
    <Outlet context={state} />
  </div>;
}
