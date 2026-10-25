import { safeEducationUrl, CooperationMemberWorkflows } from './CooperationWorkflows';
import { ServiceEnrollmentPolicyAgreement, useServiceEnrollmentPolicies } from '../legal/ServiceEnrollmentPolicyAgreement';
import type { ReactNode } from 'react';
import { CooperationMemberHomeLayout, CooperationMemberNavigation } from './CooperationMemberPresentation';
import { BusinessHomeShowcase } from './BusinessHomeShowcase';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import type { CooperationModel } from './models';
import type { CooperationMaterialGuide } from './core';

export interface CooperationClient {
  get(path: string, config?: { params?: Record<string, unknown>; headers?: Record<string, string> }): Promise<{ data: { data: any } }>;
  post(path: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<unknown>;
}
interface Business { policyScope: string; key: string; name: string; communityKey: string | null; registrationConditions: string | null }
interface Access { kind: string; businessKey?: string; allowed: boolean; canManage: boolean }
interface StoreAccess { businessKey: string; organizationId: string; allowed: boolean; membershipStatus: string | null }
interface Membership { key: string; membershipStatus: string | null; reason?: string | null }
interface Material { revision?: number; category?: string; educationUrl?: string; id: string; title: string; summary: string | null; body: string | null; semiFranchiseKey: string; tags?: string[] }
const BASE = '/neture/pharmacy';
interface LoadIssue { message: string; retryable: boolean; login?: boolean; unavailable?: boolean }
function loadIssue(error: unknown, stage: string): LoadIssue {
  const response = (error as { response?: { status?: number; data?: { code?: string; error?: { code?: string } } } })?.response;
  const code = response?.data?.code ?? response?.data?.error?.code;
  if (code === 'BUSINESS_NOT_FOUND') return { message: '이 약국 협업체의 회원 서비스가 아직 개설되지 않았거나 현재 운영 중이 아닙니다. 참여 안내와 문의를 이용해 주세요.', retryable: false, unavailable: true };
  if (code === 'COMMUNITY_NOT_FOUND') return { message: '이 협업체의 회원 공간이 아직 개설되지 않았거나 현재 이용할 수 없습니다. 운영 안내를 확인해 주세요.', retryable: false, unavailable: true };
  if (response?.status === 401) return { message: '로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.', retryable: false, login: true };
  if (response?.status === 403) return { message: `${stage}에 접근할 수 없습니다. 참여 상태를 확인하거나 문의해 주세요.`, retryable: false };
  return { message: `${stage} 조회 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.`, retryable: true };
}
const statusName: Record<string, string> = { active: '참여 중', pending: '승인 대기', suspended: '이용 정지', rejected: '신청 반려', terminated: '탈퇴' };
export type CooperationView = 'home' | 'participation' | 'materials' | 'tools';

/** A model-specific service uses the same organization approval and content contracts as Pharmacy. */
export function CooperationMemberSpace(props: {
  model: CooperationModel; client: CooperationClient; accountId?: string; materialsGuide?: Readonly<CooperationMaterialGuide>;
  homeNews?: ReactNode; view?: CooperationView; onLogin: () => void; onEnterStore: () => Promise<string>;
}) {
  const { model, accountId, view = 'home' } = props;
  const scope = `${accountId ?? ''}:${model.key}`;
  // Remounting on scope changes prevents another account/model's data from flashing.
  return <MemberSpace key={scope} {...props} view={view} />;
}
function MemberSpace({ model, client, accountId, view, onLogin, onEnterStore, materialsGuide, homeNews }: Parameters<typeof CooperationMemberSpace>[0]) {
  const [state, setState] = useState<{ business: Business; access: Access; stores: { organizationId: string; organizationName: string }[] } | null>(null);
  const [params, setParams] = useSearchParams();
  const requestedStore = params.get('store');
  const organizationId = requestedStore ? state?.stores.find(store => store.organizationId === requestedStore)?.organizationId : state?.stores.length === 1 ? state.stores[0].organizationId : undefined;
  const scopedClient = useMemo<CooperationClient>(() => ({
    get: (path, config) => client.get(path, { ...config, headers: { ...config?.headers, 'X-Store-Organization-Id': organizationId ?? '' } }),
    post: (path, body) => client.post(path, body, { headers: { 'X-Store-Organization-Id': organizationId ?? '' } }),
  }), [client, organizationId]);
  const mounted = useRef(true);
  const moving = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [issue, setIssue] = useState<LoadIssue | null>(null);
  const [entryError, setEntryError] = useState('');
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    setState(null); setIssue(null);
    let stage = '협업체 정보';
    void (async () => {
      const business: Business = (await client.get(`${BASE}/businesses/${encodeURIComponent(model.key)}`)).data.data;
      if (business.key !== model.key) throw new Error('Business mismatch');
      // Always use the immutable business namespace, never an unrelated independent community.
      stage = '회원 접근 상태';
      const access: Access = (await client.get(`/communities/${encodeURIComponent(`business:${model.key}`)}/access`)).data.data;
      if (access.kind !== 'semi-franchise' || access.businessKey !== model.key) throw new Error('Business scope mismatch');
      stage = '소속 약국 목록';
      const stores = access.canManage ? [] : (await client.get('/work-scope/accessible-stores')).data.data.stores;
      if (!Array.isArray(stores) || stores.some(store => typeof store.organizationId !== 'string' || typeof store.organizationName !== 'string')) throw new Error('Invalid stores');
      if (alive) setState({ business, access, stores: stores.filter(store => ['owner', 'admin', 'manager'].includes(store.memberRole)) });
    })().catch((error: unknown) => { if (alive) setIssue(loadIssue(error, stage)); });
    return () => { alive = false; };
  }, [model.key, accountId, client, version]);
  const enterStore = async () => {
    if (moving.current) return;
    moving.current = true; setBusy(true); setEntryError('');
    try { const href = await onEnterStore(); if (mounted.current) window.location.assign(href); }
    catch { if (mounted.current) setEntryError('내 매장으로 이동하지 못했습니다. 약국 소속과 승인 상태를 확인해 주세요.'); }
    finally { if (mounted.current) { moving.current = false; setBusy(false); } }
  };
  const heading = view === 'home' ? <h2 className={accountId ? 'sr-only' : 'text-xl font-semibold'}>회원 이용</h2> : <h1 className="text-3xl font-semibold">{view === 'materials' ? '자료실' : view === 'tools' ? '내 매장 업무' : '참여 안내'}</h1>;
  const storeSearch = organizationId ? `?store=${encodeURIComponent(organizationId)}` : '';
  if (!accountId) return <section className="mx-auto max-w-6xl p-6">{heading}<p className="my-5">로그인 후 서비스 참여 신청과 이용 상태를 확인하세요.</p><button className="rounded-lg bg-teal-800 px-5 py-3 text-white" onClick={onLogin}>로그인하기</button></section>;
  return <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    {heading}
    <CooperationMemberNavigation items={[
      { key: 'home', label: '홈', to: '/' + storeSearch, end: true },
      { key: 'news', label: '소식', to: '/' + storeSearch + '#news', end: true },
      { key: 'materials', label: '자료', to: '/materials' + storeSearch },
      { key: 'participation', label: '참여 안내', to: model.participationPath + storeSearch },
      { key: 'community', label: '회원 교류', to: model.communityPath + storeSearch },
      { key: 'support', label: '지원', to: state?.access.canManage ? `/operator/inbox/business/${encodeURIComponent(model.key)}` : '/' + storeSearch + '#cooperation-support' },
    ]} />
    {issue && <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p role={issue.unavailable ? 'status' : 'alert'}>{issue.message}</p>
      {issue.retryable && <button className="mt-3 underline" onClick={() => setVersion(n => n + 1)}>다시 시도</button>}
      {issue.login && <button className="mt-3 underline" onClick={onLogin}>다시 로그인</button>}
      {issue.unavailable && <Link className="mt-3 inline-block underline" to="/contact">운영 문의</Link>}
    </div>}
    {entryError && <p role="alert">{entryError}</p>}
    {!state && !issue && <p role="status">회원 이용 상태를 확인하고 있습니다…</p>}
    {state && <>
      {!state.access.canManage && (state.stores.length ? <label className="block">이용할 약국<select aria-label="이용할 약국" className="mt-2 block rounded border p-3" value={organizationId ?? ''} onChange={event => setParams(previous => { const next = new URLSearchParams(previous); if (event.target.value) next.set('store', event.target.value); else next.delete('store'); return next; })}><option value="">약국을 선택해 주세요</option>{state.stores.map(store => <option key={store.organizationId} value={store.organizationId}>{store.organizationName}</option>)}</select></label> : <a href="https://store.neture.co.kr/start-pharmacy">약국 개설 · 소속 확인</a>)}
      {view === 'participation' ? (organizationId || state.access.canManage ? <Participation key={`${model.key}:${organizationId}:${version}`} model={model} business={state.business} access={state.access} client={scopedClient} onChanged={() => setVersion(n => n + 1)} /> : <p>가입 상태를 확인할 약국을 선택해 주세요.</p>) : state.access.canManage ? <div className="space-y-4 rounded-xl border p-6"><p>담당 서비스 운영자입니다. 회원 업무는 승인된 약국을 기준으로 이용합니다.</p><Link className="block underline" to="/operator/semi-franchises?tab=contents">사업 자료 등록 · 관리</Link><Link to={model.communityPath}>회원 게시글 관리</Link></div> : organizationId ? <SelectedMemberResources materialsGuide={materialsGuide} homeNews={homeNews} accountId={accountId} key={`${model.key}:${organizationId}:${version}`} model={model} organizationId={organizationId} client={scopedClient} view={view} storeSearch={storeSearch} busy={busy} onEnterStore={enterStore} /> : <p>회원 업무를 이용할 약국을 선택해 주세요.</p>}

      {view === 'home' && state.access.canManage && <BusinessHomeShowcase client={client} businessKey={model.key} accountId={accountId} operator />}
      {state.access.canManage && <Link to="/operator/semi-franchises" className="block underline">참여 약국 · 공급 승인 · 콘텐츠 운영</Link>}
    </>}
    {view === 'home' && (!state || state.access.canManage || !organizationId) && homeNews}

  </section>;
}
function SelectedMemberResources({ model, organizationId, client, view, storeSearch, busy, onEnterStore, accountId, materialsGuide, homeNews }: {
  model: CooperationModel; organizationId: string; client: CooperationClient; view?: CooperationView; accountId?: string; homeNews?: ReactNode; materialsGuide?: Readonly<CooperationMaterialGuide>;
  storeSearch: string; busy: boolean; onEnterStore: () => Promise<void>;
}) {
  const [access, setAccess] = useState<StoreAccess | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setAccess(null); setError('');
    client.get(`${BASE}/businesses/${encodeURIComponent(model.key)}/store-access`).then(response => {
      const data: StoreAccess = response.data.data;
      if (data.businessKey !== model.key || data.organizationId !== organizationId || typeof data.allowed !== 'boolean') throw new Error('Store/business scope mismatch');
      if (alive) setAccess(data);
    }).catch(() => { if (alive) setError('선택한 약국의 서비스 이용 상태를 확인하지 못했습니다.'); });
    return () => { alive = false; };
  }, [client, model.key, organizationId, retry]);
  const publicHomeNews = view === 'home' ? homeNews : null;
  if (error) return <><div><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>이용 상태 다시 확인</button></div>{publicHomeNews}</>;
  if (!access) return <><p role="status">선택한 약국의 가입 승인을 확인하고 있습니다…</p>{publicHomeNews}</>;
  if (!access.allowed) return <div className="rounded-xl border p-6"><p>이 서비스의 가입 승인 후 회원 게시글·사업 자료·업무 도구를 이용할 수 있습니다.</p><p>{statusName[access.membershipStatus ?? ''] ?? '미가입'}</p><Link className="mt-4 inline-block underline" to={model.participationPath + storeSearch}>참여 신청 · 상태 확인</Link>{publicHomeNews}</div>;
  return <>
    {view === 'home' && <CooperationMemberHomeLayout summary={<>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">내 참여 상태</h2>
        <p className="mt-3 text-sm text-slate-600">선택한 약국 · 가입 승인</p>
        <Link className="mt-3 inline-flex min-h-11 items-center underline" to={model.participationPath + storeSearch}>가입·승인 상태 확인</Link>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">회원 지원</h2>
        <p className="my-3 text-sm text-slate-600">회원 게시판에서 경험을 나누고 사업 자료를 내 약국에서 활용하세요.</p>
        <Link className="block py-3 underline" to={model.communityPath + storeSearch}>회원 게시글 보기</Link>
        <Link className="block py-3 underline" to={'/materials' + storeSearch}>자료실 보기</Link>
        <Link className="block py-3 underline" to={'/tools' + storeSearch}>내 매장 업무 안내</Link>
        <Link className="block py-3 underline" to="/contact">문의하기</Link>
      </section>
    </>}>
      {accountId && <CooperationMemberWorkflows client={client} accountId={accountId} kind="business" scopeKey={model.key} organizationId={organizationId} />}
      {homeNews}
      <BusinessHomeShowcase client={client} businessKey={model.key} organizationId={organizationId} accountId={accountId} />
    </CooperationMemberHomeLayout>}
    {view === 'materials' && <Materials model={model} client={client} guide={materialsGuide} />}
    {view === 'tools' && <div className="rounded-xl border p-6"><h2 className="text-xl font-semibold">내 약국 업무</h2><p className="my-4">승인된 공급 상품·콘텐츠와 이 사업이 제공하는 약국 업무는 내 약국에서 이용합니다.</p><button disabled={busy} onClick={() => void onEnterStore()} className="rounded-lg bg-teal-800 px-5 py-3 text-white disabled:opacity-50">{busy ? '이동 중…' : '내 약국으로'}</button></div>}
  </>;
}

function Participation({ model, business, access, client, onChanged }: { model: CooperationModel; business: Business; access: Access; client: CooperationClient; onChanged: () => void }) {
  const agreement = useServiceEnrollmentPolicies(business.policyScope, async () => (await client.get(`/neture/businesses/${encodeURIComponent(model.key)}/legal/enrollment-policies`)).data.data, business.key);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [staleConditions, setStaleConditions] = useState(false);
  useEffect(() => {
    if (access.canManage) { setLoading(false); return; }
    let alive = true;
    client.get(`${BASE}/semi-franchises`).then(r => { if (alive) setMembership((r.data.data as Membership[]).find(b => b.key === model.key) ?? null); })
      .catch(() => { if (alive) setError('가입 상태를 확인하지 못했습니다. 약국 개설·소속과 승인 상태를 확인해 주세요.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [client, model.key, access.canManage]);
  const act = async (action: 'apply' | 'withdraw') => {
    if (busy || (action === 'apply' && (!accepted || staleConditions || !agreement.ready))) return;
    if (action === 'withdraw' && !window.confirm('이 서비스의 가입 신청을 취소하거나 탈퇴하시겠습니까?')) return;
    setBusy(true); setError('');
    try { await client.post(`${BASE}/semi-franchises/${encodeURIComponent(model.key)}/${action}`, action === 'apply' ? { acceptedConditions: true, conditions: business.registrationConditions ?? '', note, policyReferences: agreement.references } : {}); onChanged(); }
    catch (e: any) {
      const code = e.response?.data?.code ?? e.response?.data?.error?.code;
      if (['POLICY_VERSION_MISMATCH', 'ENROLLMENT_POLICY_REQUIRED', 'POLICY_UNAVAILABLE'].includes(code)) {
        agreement.reload(); setError('서비스 약관이 변경되었거나 준비 중입니다. 입력 내용은 유지됩니다. 약관을 다시 확인해 주세요.');
      } else {
        if (code === 'CONDITIONS_CHANGED') { setAccepted(false); setStaleConditions(true); }
        setError('신청을 처리하지 못했습니다. 참여 조건과 현재 상태를 다시 확인해 주세요.');
      }
    }
    finally { setBusy(false); }
  };
  const status = membership?.membershipStatus;
  return <div className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">참여 신청 · 상태</h2>
    {loading ? <p role="status">가입 상태를 확인하고 있습니다…</p> : <p>{access.canManage ? '담당 서비스 운영자' : statusName[status ?? ''] ?? '미가입'}</p>}
    {error && <p role="alert">{error}</p>}{membership?.reason && <p>처리 사유: {membership.reason}</p>}
    {business.registrationConditions && <p className="whitespace-pre-wrap">{business.registrationConditions}</p>}
    {!loading && !error && !access.canManage && !membership && <a href="https://store.neture.co.kr/start-pharmacy">약국 개설 · 소속 확인</a>}
    {!loading && membership && !access.canManage && !['active', 'pending', 'suspended'].includes(status ?? '') && <>
      <label className="block"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /> 이 서비스의 참여 조건을 확인했습니다.</label>
      <label className="block">추가 신청 내용<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} className="mt-2 block w-full rounded border p-3" /></label>
      <ServiceEnrollmentPolicyAgreement agreement={agreement} />
      <button className="rounded bg-teal-800 px-5 py-3 text-white disabled:opacity-50" disabled={!accepted || busy || staleConditions || !agreement.ready} onClick={() => void act('apply')}>가입 신청</button>
    </>}
    {staleConditions && <button className="underline" onClick={onChanged}>최신 참여 조건 다시 확인</button>}
    {!loading && membership && !access.canManage && ['active', 'pending', 'suspended'].includes(status ?? '') && <button disabled={busy} onClick={() => void act('withdraw')}>{status === 'pending' ? '신청 취소' : '서비스 탈퇴'}</button>}
  </div>;
}
function Materials({ model, client, guide }: { model: CooperationModel; client: CooperationClient; guide?: Readonly<CooperationMaterialGuide> }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() || '';
  const tag = params.get('tag')?.trim() || '';
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const scope = `${model.key}:${q}:${tag}:${page}`;
  const [qInput, setQInput] = useState(q);
  const [state, setState] = useState<{ items: Material[]; total: number; scope: string } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setQInput(q); }, [q]);
  const filter = (changes: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous); next.delete('page');
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    return next;
  });
  useEffect(() => {
    let alive = true;
    setState(null); setError('');
    client.get(`${BASE}/store/contents`, { params: { sf: model.key, ...(q ? { q } : {}), ...(tag ? { tag } : {}), page, limit: 20 } }).then(r => {
      if (!Array.isArray(r.data.data.items) || r.data.data.items.some((c: Material) => c.semiFranchiseKey !== model.key)) throw new Error('Content scope mismatch');
      if (alive) setState({ ...r.data.data, scope });
    }).catch(() => { if (alive) setError('사업 자료를 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [client, model.key, page, q, tag, scope, retry]);
  return <div className="space-y-4 rounded-xl border p-4 sm:p-6"><h2 className="text-xl font-semibold">사업 자료</h2>
    {guide && <p className="text-sm leading-6 text-slate-600">{guide.memberDescription}</p>}
    <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); filter({ q: qInput.trim() }); }}>
      <input aria-label="자료 제목·요약 검색" placeholder="제목 · 요약 검색" value={qInput} onChange={event => setQInput(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded border px-3" />
      <button className="min-h-11 rounded border px-4" type="submit">검색</button>
      {(q || tag) && <button type="button" className="min-h-11 rounded border px-4" onClick={() => { setQInput(''); filter({ q: '', tag: '' }); }}>검색 초기화</button>}
    </form>
    {guide && <label className="block text-sm">자료 태그<select aria-label="자료 태그" value={tag} onChange={event => filter({ tag: event.target.value })} className="ml-3 min-h-11 max-w-full rounded border px-3"><option value="">전체 태그</option>{[...new Set<string>([...guide.tags, ...(tag ? [tag] : [])])].map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
    {error ? <><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>다시 시도</button></> : !state || state.scope !== scope ? <p role="status">자료를 불러오고 있습니다…</p> : <>
    <p className="text-sm text-slate-600">{state.total}개 자료{tag && ` · ${tag}`}</p>
    {!state.items.length && <p>{q || tag ? '검색 조건에 맞는 자료가 없습니다.' : '등록된 자료가 없습니다.'}</p>}
    {state.items.map(c => <details key={c.id} className="min-w-0 rounded-lg border p-4"><summary className="cursor-pointer break-words font-semibold">{c.title}</summary>{c.revision && <p className="my-3 text-sm">{c.category || '미분류'} · 개정 {c.revision}</p>}{safeEducationUrl(c.educationUrl) && <a href={safeEducationUrl(c.educationUrl)} target="_blank" rel="noopener noreferrer" className="my-3 inline-flex min-h-11 items-center underline">관련 교육 열기 ↗</a>}{c.summary && <p className="my-3 break-words">{c.summary}</p>}{Array.isArray(c.tags) && <div className="my-3 flex flex-wrap gap-2">{[...new Set(c.tags.filter(value => typeof value === 'string' && value.trim()))].map(value => <button key={value} className="min-h-11 rounded-full border px-3 text-sm" onClick={() => filter({ tag: value })}>{value}</button>)}</div>}{c.body && <ContentRenderer html={c.body} />}</details>)}
    {state.total > 20 && <nav aria-label="자료 목록 페이지"><button className="min-h-11" disabled={page === 1} onClick={() => filter({ page: String(page - 1) })}>이전</button><span className="px-4">{page}</span><button className="min-h-11" disabled={page * 20 >= state.total} onClick={() => filter({ page: String(page + 1) })}>다음</button></nav>}
    <p>자료를 가져와 편집·활용하려면 내 약국의 사업 자료를 이용하세요.</p>
    <Link className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 py-2 text-white" to={`/tools${params.get('store') ? `?store=${encodeURIComponent(params.get('store')!)}` : ''}`}>내 매장 업무 · 이용 안내</Link>
  </>}</div>;
}
