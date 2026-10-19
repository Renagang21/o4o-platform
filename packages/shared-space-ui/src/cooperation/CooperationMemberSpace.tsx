import { BusinessHomeShowcase } from './BusinessHomeShowcase';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import type { CooperationModel } from './models';

export interface CooperationClient {
  get(path: string, config?: { params?: Record<string, unknown>; headers?: Record<string, string> }): Promise<{ data: { data: any } }>;
  post(path: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<unknown>;
}
interface Business { key: string; name: string; communityKey: string | null; registrationConditions: string | null }
interface Access { kind: string; businessKey?: string; allowed: boolean; canManage: boolean }
interface StoreAccess { businessKey: string; organizationId: string; allowed: boolean; membershipStatus: string | null }
interface Membership { key: string; membershipStatus: string | null; reason?: string | null }
interface Material { id: string; title: string; summary: string | null; body: string | null; semiFranchiseKey: string }
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
  model: CooperationModel; client: CooperationClient; accountId?: string;
  view?: CooperationView; onLogin: () => void; onEnterStore: () => Promise<string>;
}) {
  const { model, accountId, view = 'home' } = props;
  const scope = `${accountId ?? ''}:${model.key}`;
  // Remounting on scope changes prevents another account/model's data from flashing.
  return <MemberSpace key={scope} {...props} view={view} />;
}
function MemberSpace({ model, client, accountId, view, onLogin, onEnterStore }: Parameters<typeof CooperationMemberSpace>[0]) {
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
  const heading = view === 'home' ? <h2 className="text-xl font-semibold">회원 이용</h2> : <h1 className="text-3xl font-semibold">{view === 'materials' ? '자료실' : view === 'tools' ? '내 매장 업무' : '참여 안내'}</h1>;
  const storeSearch = organizationId ? `?store=${encodeURIComponent(organizationId)}` : '';
  if (!accountId) return <section className="mx-auto max-w-6xl p-6">{heading}<p className="my-5">로그인 후 서비스 참여 신청과 이용 상태를 확인하세요.</p><button className="rounded-lg bg-teal-800 px-5 py-3 text-white" onClick={onLogin}>로그인하기</button></section>;
  return <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    {heading}
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
      {view === 'participation' ? (organizationId || state.access.canManage ? <Participation key={`${model.key}:${organizationId}:${version}`} model={model} business={state.business} access={state.access} client={scopedClient} onChanged={() => setVersion(n => n + 1)} /> : <p>가입 상태를 확인할 약국을 선택해 주세요.</p>) : state.access.canManage ? <div className="space-y-4 rounded-xl border p-6"><p>담당 서비스 운영자입니다. 회원 업무는 승인된 약국을 기준으로 이용합니다.</p><Link className="block underline" to="/operator/semi-franchises?tab=contents">사업 자료 등록 · 관리</Link><Link to={model.communityPath}>회원 게시글 관리</Link></div> : organizationId ? <SelectedMemberResources accountId={accountId} key={`${model.key}:${organizationId}:${version}`} model={model} organizationId={organizationId} client={scopedClient} view={view} storeSearch={storeSearch} busy={busy} onEnterStore={enterStore} /> : <p>회원 업무를 이용할 약국을 선택해 주세요.</p>}

      {view === 'home' && state.access.canManage && <BusinessHomeShowcase client={client} businessKey={model.key} accountId={accountId} operator />}
      {state.access.canManage && <Link to="/operator/semi-franchises" className="block underline">참여 약국 · 공급 승인 · 콘텐츠 운영</Link>}
    </>}

  </section>;
}
function SelectedMemberResources({ model, organizationId, client, view, storeSearch, busy, onEnterStore, accountId }: {
  model: CooperationModel; organizationId: string; client: CooperationClient; view?: CooperationView; accountId?: string;
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
  if (error) return <div><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>이용 상태 다시 확인</button></div>;
  if (!access) return <p role="status">선택한 약국의 가입 승인을 확인하고 있습니다…</p>;
  if (!access.allowed) return <div className="rounded-xl border p-6"><p>이 서비스의 가입 승인 후 회원 게시글·사업 자료·업무 도구를 이용할 수 있습니다.</p><p>{statusName[access.membershipStatus ?? ''] ?? '미가입'}</p><Link className="mt-4 inline-block underline" to={model.participationPath + storeSearch}>참여 신청 · 상태 확인</Link></div>;
  return <>
    {view === 'home' && <div className="rounded-xl bg-teal-950 p-6 text-white"><h3 className="text-xl font-semibold">함께하는 {model.name}</h3><p className="my-4">회원 게시판에서 경험을 나누고 사업 자료를 내 약국에서 활용하세요.</p><Link className="mr-6 underline" to={model.communityPath + storeSearch}>회원 게시글 보기</Link><Link className="underline" to={"/materials" + storeSearch}>자료실 보기</Link><Link className="ml-6 underline" to={"/tools" + storeSearch}>내 매장 업무 안내</Link></div>}
    {view === 'home' && <BusinessHomeShowcase client={client} businessKey={model.key} organizationId={organizationId} accountId={accountId} />}
    {view === 'materials' && <Materials model={model} client={client} />}
    {view === 'tools' && <div className="rounded-xl border p-6"><h2 className="text-xl font-semibold">내 약국 업무</h2><p className="my-4">승인된 공급 상품·콘텐츠와 이 사업이 제공하는 약국 업무는 내 약국에서 이용합니다.</p><button disabled={busy} onClick={() => void onEnterStore()} className="rounded-lg bg-teal-800 px-5 py-3 text-white disabled:opacity-50">{busy ? '이동 중…' : '내 약국으로'}</button></div>}
  </>;
}

function Participation({ model, business, access, client, onChanged }: { model: CooperationModel; business: Business; access: Access; client: CooperationClient; onChanged: () => void }) {
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
    if (busy || (action === 'apply' && (!accepted || staleConditions))) return;
    if (action === 'withdraw' && !window.confirm('이 서비스의 가입 신청을 취소하거나 탈퇴하시겠습니까?')) return;
    setBusy(true); setError('');
    try { await client.post(`${BASE}/semi-franchises/${encodeURIComponent(model.key)}/${action}`, action === 'apply' ? { acceptedConditions: true, conditions: business.registrationConditions ?? '', note } : {}); onChanged(); }
    catch (e: any) { if (e.response?.data?.code === 'CONDITIONS_CHANGED' || e.response?.data?.error?.code === 'CONDITIONS_CHANGED') { setAccepted(false); setStaleConditions(true); } setError('신청을 처리하지 못했습니다. 참여 조건과 현재 상태를 다시 확인해 주세요.'); }
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
      <button className="rounded bg-teal-800 px-5 py-3 text-white disabled:opacity-50" disabled={!accepted || busy || staleConditions} onClick={() => void act('apply')}>가입 신청</button>
    </>}
    {staleConditions && <button className="underline" onClick={onChanged}>최신 참여 조건 다시 확인</button>}
    {!loading && membership && !access.canManage && ['active', 'pending', 'suspended'].includes(status ?? '') && <button disabled={busy} onClick={() => void act('withdraw')}>{status === 'pending' ? '신청 취소' : '서비스 탈퇴'}</button>}
  </div>;
}
function Materials({ model, client }: { model: CooperationModel; client: CooperationClient }) {
  const [state, setState] = useState<{ items: Material[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setState(null); setError('');
    client.get(`${BASE}/store/contents`, { params: { sf: model.key, page, limit: 20 } }).then(r => {
      if (r.data.data.items.some((c: Material) => c.semiFranchiseKey !== model.key)) throw new Error('Content scope mismatch');
      if (alive) setState(r.data.data);
    }).catch(() => { if (alive) setError('사업 자료를 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [client, model.key, page, retry]);
  return <div className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">사업 자료</h2>{error ? <><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>다시 시도</button></> : !state ? <p role="status">자료를 불러오고 있습니다…</p> : <>
    {!state.items.length && <p>등록된 자료가 없습니다.</p>}
    {state.items.map(c => <details key={c.id} className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{c.title}</summary>{c.summary && <p className="my-3">{c.summary}</p>}{c.body && <ContentRenderer html={c.body} />}</details>)}
    {state.total > 20 && <nav aria-label="자료 목록 페이지"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</button><span className="px-4">{page}</span><button disabled={page * 20 >= state.total} onClick={() => setPage(p => p + 1)}>다음</button></nav>}
    <p>자료를 가져와 편집·활용하려면 내 약국의 사업 자료를 이용하세요.</p>
  </>}</div>;
}
