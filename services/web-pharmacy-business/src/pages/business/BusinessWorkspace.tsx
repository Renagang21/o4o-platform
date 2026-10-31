import { BUSINESS_SITE } from '../../config/businessSite';
import { CooperationMemberNavigation, PublicServiceEntry } from '@o4o/shared-space-ui';
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { businessApi, businessBase, businessPath, communityApiBase, pharmacyApiBase, businessError, type Business, type ParticipantAccess } from './api';
import { useBusinessMaterialStore } from './useBusinessMaterialStore';

export interface BusinessContext { business: Business; access: ParticipantAccess | null }
export const useBusiness = () => useOutletContext<BusinessContext>();

export default function BusinessWorkspace({ defaultBusinessKey, memberLayout = false }: Readonly<{ defaultBusinessKey?: string; memberLayout?: boolean }>) {
  const { businessKey: routeBusinessKey } = useParams();
  const businessKey = routeBusinessKey ?? defaultBusinessKey ?? '';
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<(BusinessContext & { loadedFor: string }) | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const memberStore = useBusinessMaterialStore(
    memberLayout && state?.loadedFor === `${user?.id}:${businessKey}` && !!state.access?.allowed && !state.access.canManage,
    businessKey,
  );
  useEffect(() => {
    let alive = true;
    setState(null); setError('');
    if (isLoading || !user) return;
    void (async () => {
      try {
        const business = await businessApi.get<Business>(`${pharmacyApiBase}/businesses/${encodeURIComponent(businessKey)}`);
        if (business.key !== businessKey) throw new Error('Business key mismatch');
        const access = business.communityKey
          ? await businessApi.get<ParticipantAccess>(`${communityApiBase(business.communityKey)}/access`) : null;
        if (access && (access.kind !== 'semi-franchise' || access.businessKey !== business.key)) throw new Error('Business scope mismatch');
        if (alive) setState({ business, access, loadedFor: `${user.id}:${businessKey}` });
      } catch (e) { if (alive) setError(businessError(e)); }
    })();
    return () => { alive = false; };
  }, [businessKey, user?.id, isLoading, retry]);
  if (isLoading) return <output className="p-6" aria-live="polite">로그인 상태를 확인하고 있습니다…</output>;
  if (!user && location.pathname === '/') return <PublicServiceEntry serviceKey={BUSINESS_SITE.key === 'drugstore' ? 'drugstore' : 'pharmacy'} loginHref={`/login?returnTo=${encodeURIComponent(location.pathname+location.search+location.hash)}`} contactHref="/contact" />;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`} state={{ from: location.pathname + location.search + location.hash }} replace />;
  if (error) return <section className="p-6"><p role="alert">{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>다시 시도</button></section>;
  if (state?.loadedFor !== `${user.id}:${businessKey}`) return <output className="p-6" aria-live="polite">사업 정보를 확인하고 있습니다…</output>;
  const base = businessBase(businessKey);
  const requestedStore = new URLSearchParams(location.search).get('store');
  const storeSearch = requestedStore ? `?store=${encodeURIComponent(requestedStore)}` : '';
  const standardHomeEditor = businessKey === 'pharmacy' ? '/home-presentation' : `${base}/home-presentation`;
  const operatorNavigation = state.access?.canManage ? <nav aria-label="담당 사업 운영" className="mb-5 flex flex-wrap gap-3 text-sm text-blue-700">
      <NavLink to={`/operator/inbox/business/${businessKey}`}>운영 알림·문의함</NavLink>
      <NavLink to={businessKey === 'carepharm' ? '/operator/home-presentation/carepharm' : standardHomeEditor}>Hero · 광고 관리</NavLink>
      <NavLink to={`${businessPath(businessKey, 'forum')}/manage`}>게시판 운영</NavLink>
      {businessKey === BUSINESS_SITE.key && <NavLink to={`/operator/semi-franchises?key=${encodeURIComponent(businessKey)}&tab=contents`}>사업 자료 관리</NavLink>}
    </nav> : null;
  const homePath = businessKey === BUSINESS_SITE.key ? '/' : base;
  let supportHref = '/contact';
  if (state.access?.canManage) supportHref = `/operator/inbox/business/${encodeURIComponent(businessKey)}`;
  else if (state.access?.allowed && memberStore.organizationId) supportHref = `${homePath}?store=${encodeURIComponent(memberStore.organizationId)}#cooperation-support`;
  const memberNavigation = <CooperationMemberNavigation items={[
    { key: 'home', label: '홈', to: homePath + storeSearch, end: true },
    { key: 'news', label: '소식', to: homePath + storeSearch + (businessKey === 'carepharm' ? '#news' : '#business-news'), end: true },
    { key: 'materials', label: '자료', to: businessPath(businessKey, 'materials') + storeSearch },
    { key: 'participation', label: '참여 안내', to: businessPath(businessKey, 'participation') + storeSearch },
    { key: 'community', label: '회원 교류', to: businessPath(businessKey, 'forum') + storeSearch },
    { key: 'support', label: '지원', to: supportHref },
  ]} />;
  if (memberLayout) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{memberNavigation}{operatorNavigation}<Outlet context={state} /></div>;
  return <div className="mx-auto max-w-6xl px-4 py-6">
    <h1 className="text-2xl font-semibold">{state.business.name}</h1>
    <p className="mt-2 text-sm text-slate-600" role="status">{state.access?.canManage ? '담당 운영자' : state.access?.allowed ? '참여 승인 · 이용 가능' : businessKey === 'pharmacy' ? '약국 승인과 Pharmacy 기본 회원 연결 상태를 참여 안내에서 확인할 수 있습니다.' : '참여 신청·승인 상태는 참여 신청에서 확인할 수 있습니다.'}</p>
    <nav aria-label="약국 협력사업 업무" className="my-5 flex flex-wrap gap-2 border-b pb-4">
      {[
        ['', '공동공간'], ['participation', '참여 신청'], ['materials', '사업 자료'], ['forum', '참여자 게시판'], ['tools', '업무 도구'],
      ].map(([path, label]) => <NavLink key={path} end={!path} to={(path ? `${base}/${path}` : base) + storeSearch} className={({ isActive }) => `rounded-lg px-4 py-2 text-sm ${isActive ? 'bg-blue-700 text-white' : 'border bg-white text-slate-700'}`}>{label}</NavLink>)}
      <NavLink to="/contact" className="rounded-lg border px-4 py-2 text-sm">Contact Us</NavLink>
    </nav>
    {operatorNavigation}
    <Outlet context={state} />
  </div>;
}
