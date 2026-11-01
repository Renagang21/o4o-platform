import { useCallback, useEffect, useRef, useState } from 'react';

export const improvementStates = { received: '접수', reviewing: '검토 중', needs_info: '추가 정보 요청', planned: '반영 예정', completed: '반영 완료', deferred: '보류', declined: '미반영' };
const kinds = { update: '업데이트 안내', bug: '오류·불편 신고', suggestion: '기능 개선 제안' };
type Kind = keyof typeof kinds;
type State = keyof typeof improvementStates;
interface Item { id: string; title: string; body: string; kind: Kind; state: State; version: number; mine: boolean; canManage?: boolean; createdAt: string; replies: { text: string; official: boolean; requester?: boolean; state?: State; updateId?: string; at: string }[] }
interface Snapshot { ready: boolean; canManage: boolean; items: Pick<Item, 'id' | 'title' | 'createdAt' | 'kind' | 'state' | 'version' | 'mine'>[]; hasMore: boolean }
interface ImprovementClient {
  get(path: string, config?: { params: Record<string, unknown> }): Promise<{ data?: { data?: unknown } }>;
  post(path: string, body?: unknown): Promise<unknown>;
  patch(path: string, body?: unknown): Promise<unknown>;
}
interface Props { client: ImprovementClient; actorKey: string; detailId?: string; management?: boolean; onSelect: (id?: string) => void }
function newSubmissionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const endpoint = '/communities/community/improvements';
const classes = 'rounded border border-slate-300 bg-white px-3 py-2 disabled:opacity-50';
function message(error: unknown) {
  const response = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof response?.error === 'string' ? response.error : '요청을 처리하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.';
}
/** Two consumers only: community member surface and the existing central community.forums workspace. */
export default function ImprovementForum(props: Props) {
  return <ForumSession key={`${props.actorKey}:${props.management}:${props.detailId ?? 'list'}`} {...props} />;
}
function ForumSession({ client, actorKey, detailId, management = false, onSelect }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [page, setPage] = useState(1), [kind, setKind] = useState('');
  const [pending, setPending] = useState(management);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [writing, setWriting] = useState(false), [writeKind, setWriteKind] = useState<Kind>('suggestion');
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [reply, setReply] = useState('');
  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [replyVersion, setReplyVersion] = useState<number | null>(null);
  const replyDirty = useRef(false);
  const [editing, setEditing] = useState(false);
  const submissionId = useRef<string | null>(null);
  const [updateUrl, setUpdateUrl] = useState('');
  const [state, setState] = useState<State>('reviewing');
  const alive = useRef(false), sequence = useRef(0), lock = useRef(false);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    try {
      const response = await client.get(detailId ? `${endpoint}/${encodeURIComponent(detailId)}` : endpoint, detailId ? undefined : { params: { page, kind, ...(pending ? { pending: true } : {}) } });
      const data = response.data?.data;
      if (!alive.current || seq !== sequence.current) return;
      if (detailId) {
        const detail = data as Item | undefined;
        if (!detail?.id || !Array.isArray(detail.replies)) throw new Error('INVALID_RESPONSE');
        setItem(detail); if (!replyDirty.current) setState(detail.state === 'received' ? 'reviewing' : detail.state);
      } else {
        const list = data as Snapshot | undefined;
        if (!list || !Array.isArray(list.items)) throw new Error('INVALID_RESPONSE');
        setSnapshot(list);
      }
      setError('');
    } catch (e) {
      if (alive.current && seq === sequence.current) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) { setItem(null); setSnapshot(null); }
        setError(message(e));
      }
    }
    finally { if (alive.current && seq === sequence.current) setLoading(false); }
  }, [client, detailId, page, kind, pending]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  useEffect(() => {
    const refresh = () => { if (!lock.current) void load(); };
    window.addEventListener('focus', refresh);
    const timer = management ? window.setInterval(refresh, 60000) : undefined;
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [load, management]);
  const write = async (operation: () => Promise<unknown>, after: (response: unknown) => void) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { const response = await operation(); if ((response as { data?: { success?: boolean } })?.data?.success !== true) throw new Error('INVALID_WRITE_RESPONSE'); if (alive.current) { after(response); window.dispatchEvent(new Event('central-operation-work-changed')); } }
    catch (e) { if (alive.current) setError(message(e)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const anchorReply = () => { if (!replyDirty.current && item) { replyDirty.current = true; setReplyVersion(item.version); } };
  const editConflict = editing && item && editVersion !== item.version;
  const replyConflict = replyVersion !== null && item && replyVersion !== item.version;
  const permittedManager = item?.canManage ?? snapshot?.canManage ?? false;
  const canManage = management && permittedManager;
  return <section aria-label="O4O 업데이트·개선 요청" className="min-w-0 space-y-4 rounded-xl border bg-white p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-bold">O4O 업데이트·개선 요청</h1><p className="mt-1 text-sm text-slate-600">업데이트 소식을 확인하고 오류·불편과 개선 의견을 남겨 주세요.</p></div><button className={classes} disabled={loading || busy} onClick={() => void load()}>다시 조회</button></header>
    <p className="rounded bg-amber-50 p-3 text-sm">모든 글과 답변은 공개됩니다. 비밀번호·연락처·환자 정보는 입력하지 마세요. 민감한 내용은 <a className="underline" href="https://community.neture.co.kr/contact">비공개 문의</a>를 이용해 주세요.</p>
    {!management && permittedManager && <a className="inline-block underline" href={`https://admin.neture.co.kr/operations/community/forums?tab=improvements${detailId ? `&improvement=${encodeURIComponent(detailId)}` : ''}`}>통합 운영에서 공식 답변·업데이트 관리 →</a>}
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}{item || snapshot ? ' 이전 내용은 최신이 아닐 수 있습니다.' : ''}</p>}
    {notice && <p role="status" className="text-blue-800">{notice}</p>}
    {loading && !snapshot && !item && <output>불러오는 중…</output>}
    {detailId && <button className={classes} onClick={() => onSelect()}>목록으로</button>}
    {detailId && item && <article className="space-y-4">
      <div><p className="text-sm text-slate-600">{kinds[item.kind]} · {improvementStates[item.state]} · {new Date(item.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</p><h2 className="mt-2 break-words text-xl font-semibold">{item.title}</h2></div>
      <p className="whitespace-pre-wrap break-words">{item.body}</p>
      {item.mine && (item.kind !== 'update' || canManage) && <button className={classes} disabled={busy} onClick={() => { setEditing(!editing); setEditVersion(item.version); setTitle(item.title); setBody(item.body); }}>내 글 수정{editing ? ' 접기' : ''}</button>}
      {editConflict && <div role="alert" className="rounded bg-amber-50 p-3"><p>수정 중 다른 변경이 도착했습니다. 초안을 보관한 뒤 최신 글을 확인해 주세요.</p><button className={classes} disabled={loading || busy} onClick={() => { setTitle(item.title); setBody(item.body); setEditVersion(item.version); setError(''); }}>최신 글로 다시 편집</button></div>}
      {editing && <form className="space-y-3 rounded border p-3" onSubmit={e => { e.preventDefault(); void write(() => client.patch(`${endpoint}/${item.id}`, { title, body, version: editVersion }), () => { setEditing(false); setEditVersion(null); setNotice('글을 수정했습니다.'); void load(); }); }}>
        <label className="block">수정 제목<input className={`${classes} block w-full`} required maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block">수정 내용<textarea className={`${classes} block w-full`} required minLength={5} maxLength={10000} rows={6} value={body} disabled={busy} onChange={e => setBody(e.target.value)} /></label>
        <p className="text-sm text-slate-600">요청을 수정하면 운영팀 처리 대기로 돌아갑니다. 기존 답변은 유지됩니다.</p>
        <button className={classes} disabled={busy || loading || !!error || !!editConflict || !title.trim() || body.trim().length < 5}>수정 저장</button>
      </form>}
      <ol aria-label="답변 이력" className="space-y-3">{item.replies.map((r, i) => <li key={i} className={`rounded border p-3 ${r.official ? 'border-blue-200 bg-blue-50' : 'bg-slate-50'}`}><p className="text-sm font-semibold">{r.official ? 'O4O 운영팀 공식 답변' : r.requester ? '요청자 추가 정보' : '회원 의견'} · {new Date(r.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}{r.state ? ` · ${improvementStates[r.state]}` : ''}</p><p className="mt-2 whitespace-pre-wrap break-words">{r.text}</p>{r.updateId && <a className="mt-2 inline-block underline" href={`https://community.neture.co.kr/improvements/${r.updateId}`}>관련 업데이트 안내 보기 →</a>}</li>)}</ol>
      {replyConflict && <div role="alert" className="rounded bg-amber-50 p-3"><p>새 답변이나 상태 변경이 있습니다. 작성한 답변은 유지됩니다. 최신 내용을 확인해 주세요.</p><button className={classes} disabled={loading || busy} onClick={() => { setReplyVersion(item.version); setState(item.state === 'received' ? 'reviewing' : item.state); setError(''); }}>최신 상태로 답변 계속</button></div>}
      {item.kind !== 'update' && !!actorKey && <form className="space-y-3 border-t pt-4" onSubmit={event => {
        event.preventDefault();
        void write(() => client.post(`${endpoint}/${item.id}/replies`, { body: reply, version: replyVersion ?? item.version, official: canManage, ...(canManage ? { state, ...(updateUrl.trim() ? { updateUrl: updateUrl.trim() } : {}) } : {}) }), () => { replyDirty.current = false; setReplyVersion(null); setReply(''); setUpdateUrl(''); setNotice('답변을 저장했습니다.'); void load(); });
      }}>
        <h3 className="font-semibold">{canManage ? '공식 답변·처리 상태' : item.mine ? '추가 정보 남기기' : '의견 남기기'}</h3>
        {canManage && <label className="block">처리 상태 <select className={classes} value={state} disabled={busy} onChange={e => { anchorReply(); setState(e.target.value as State); }}>{Object.entries(improvementStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className="block">{canManage ? '공개 답변·처리 사유' : '추가 내용'}<textarea className={`${classes} mt-1 block w-full`} rows={5} maxLength={4000} required value={reply} disabled={busy} onChange={e => { anchorReply(); setReply(e.target.value); }} /></label>
        {canManage && <label className="block">연결할 업데이트 안내 주소 (선택)<input type="url" className={`${classes} mt-1 block w-full`} maxLength={500} disabled={busy} value={updateUrl} onChange={e => { anchorReply(); setUpdateUrl(e.target.value); }} /></label>}
        <button className={classes} disabled={busy || loading || !!error || !!replyConflict || !reply.trim()}>{busy ? '저장 중…' : canManage ? '답변·상태 저장' : '추가 정보 보내기'}</button>
        {error && <p className="text-sm text-slate-600">내용을 복사해 보관한 뒤 다시 조회하면 최신 상태로 재시도할 수 있습니다.</p>}
      </form>}
    </article>}
    {!detailId && snapshot && <>
      {!snapshot.ready && <div className="space-y-3"><p>공식 포럼을 준비 중입니다.</p>{canManage && <><p className="text-sm">현재 로그인한 계정이 대표 소유자가 됩니다. 지정된 담당 계정인지 확인한 뒤 개설하세요.</p><button className={classes} disabled={busy || !!error} onClick={() => void write(() => client.post(`${endpoint}/setup`), () => { setNotice('공식 포럼을 개설했습니다.'); void load(); })}>현재 계정으로 공식 포럼 개설</button></>}</div>}
      {snapshot.ready && <>
        <div className="flex flex-wrap items-center gap-3"><label>분류 <select className={classes} value={kind} disabled={busy} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">전체</option>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{management && <label className="flex items-center gap-2"><input type="checkbox" checked={pending} disabled={busy} onChange={e => { setPending(e.target.checked); setPage(1); }} />운영팀 처리 대기만</label>}
          {actorKey && <button className={classes} disabled={busy} onClick={() => setWriting(v => !v)}>{writing ? '작성 접기' : '글 작성'}</button>}
          {!actorKey && <a className="underline" href="/login">로그인 후 요청 작성</a>}
        </div>
        {management && <p className="text-sm text-slate-600">읽음 처리와 업무 완료는 다릅니다. 추가 정보 요청은 요청자의 답변을 기다리며, 답변이 오면 처리 대기로 돌아옵니다.</p>}
        {writing && <form className="space-y-3 rounded border p-4" onSubmit={event => { event.preventDefault(); void write(() => client.post(endpoint, { kind: writeKind, title, body, requestId: submissionId.current ??= newSubmissionId() }), response => { submissionId.current = null; setTitle(''); setBody(''); setWriting(false); setNotice('글을 등록했습니다.'); const createdId = (response as { data?: { data?: { id?: string } } }).data?.data?.id; if (createdId) onSelect(createdId); else { setPage(1); void load(); } }); }}>
          <label className="block">글 구분 <select className={classes} disabled={busy} value={writeKind} onChange={e => setWriteKind(e.target.value as Kind)}>{Object.entries(kinds).filter(([k]) => canManage || k !== 'update').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block">제목<input className={`${classes} mt-1 block w-full`} maxLength={200} required disabled={busy} value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label className="block">내용<textarea className={`${classes} mt-1 block w-full`} rows={6} minLength={5} maxLength={10000} required disabled={busy} value={body} onChange={e => setBody(e.target.value)} /></label>
          <p className="text-sm text-slate-600">문제 화면·발생 순서·기대한 동작을 적어 주세요. 개선 제안은 사용 목적을 함께 알려 주세요.</p>
          <button className={classes} disabled={busy || loading || !!error || !title.trim() || body.trim().length < 5}>{busy ? '등록 중…' : '공개 글 등록'}</button>
        </form>}
        <ul className="divide-y">{snapshot.items.map(row => <li key={row.id} className="py-3"><button className="w-full text-left" onClick={() => onSelect(row.id)}><span className="text-sm text-slate-600">{kinds[row.kind]} · {improvementStates[row.state]} · {new Date(row.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</span><strong className="mt-1 block break-words">{row.title}</strong></button></li>)}</ul>
        {!snapshot.items.length && <p>표시할 글이 없습니다.</p>}
        <nav aria-label="개선 요청 페이지" className="flex items-center gap-3"><button className={classes} disabled={page === 1 || busy || loading} onClick={() => setPage(v => v - 1)}>이전</button><span>{page} 페이지</span><button className={classes} disabled={!snapshot.hasMore || busy || loading} onClick={() => setPage(v => v + 1)}>다음</button></nav>
      </>}
    </>}
  </section>;
}
