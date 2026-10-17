import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';

type Kind = 'boards' | 'members';
interface Row { id: string; name?: string; status: string; memberships?: Array<{serviceKey: string; status: string}> }
interface Plan { id: string; digest: string; counts: Record<string,number>; blockers: string[] }
const countLabels: Record<string,string> = {forum_notifications:'연결 알림',forum_like:'좋아요',forum_bookmark:'북마크',forum_post_like:'게시글 좋아요',forum_comment:'댓글과 답글',forum_category_members:'게시판 참여',forum_join_requests:'게시판 가입 신청',forum_post:'게시글',forum_category_requests:'게시판·개설 신청',service_memberships:'커뮤니티 서비스 가입',role_assignments:'일반 회원 역할'};
const base = '/communities/community/management';
const errorText = (e: unknown) => (e as {response?:{data?:{error?:string}}}).response?.data?.error ?? '처리하지 못했습니다. 다시 시도해 주세요.';
const statuses: Record<string,string> = { completed:'운영 중',archived:'운영 중지',active:'활성',suspended:'이용 정지',withdrawn:'탈퇴',rejected:'반려',pending:'승인 대기' };
export default function CommunityManagementPage({ kind, permanent = false }: Readonly<{ kind: Kind; permanent?: boolean }>) {
  const [rows,setRows] = useState<Row[]>([]);
  const [page,setPage] = useState(1);
  const [totalPages,setTotalPages] = useState(1);
  const [version,setVersion] = useState(0);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [plan,setPlan] = useState<Plan|null>(null);
  const [confirmation,setConfirmation] = useState('');
  useEffect(() => {
    let alive=true; setLoading(true); setError(''); setRows([]); setPlan(null); setConfirmation('');
    const url=kind === 'boards' ? `${base}/boards` : `/operator/members?serviceKey=community&page=${page}&limit=20`;
    api.get(url).then((r: {data: {data?: Row[] | {users: Row[]; pagination?: {totalPages: number}}; users?: Row[]; pagination?: {totalPages: number}}})=>{
      if(!alive)return;
      const value=r.data.data ?? r.data;
      if (Array.isArray(value)) { setRows(value); setTotalPages(1); }
      else { setRows(value.users ?? []); setTotalPages(value.pagination?.totalPages ?? 1); }
    }).catch((e: unknown)=>{if(alive)setError(errorText(e));}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[kind,page,version]);
  async function status(row: Row) {
    setBusy(true);setError('');setMessage('');
    try { await api.patch(`${base}/boards/${row.id}/status`,{status:row.status==='archived'?'completed':'archived'});setMessage('게시판 이용 상태를 변경했습니다.');setVersion(v=>v+1); }
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function preview(row: Row) {
    setBusy(true);setError('');setMessage('');setPlan(null);setConfirmation('');
    try{const r=await api.get(`${base}/${kind}/${row.id}/deletion-plan`);setPlan(r.data.data);}
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function remove() {
    if(!plan || confirmation!=='완전 삭제' || plan.blockers.length)return;
    setBusy(true);setError('');
    try{await api.delete(`${base}/${kind}/${plan.id}`,{data:{expectedDigest:plan.digest}});setPlan(null);setConfirmation('');setMessage('선택한 커뮤니티 데이터를 완전 삭제했습니다.');setVersion(v=>v+1);}
    catch(e){setPlan(null);setConfirmation('');setError(errorText(e));}finally{setBusy(false);}
  }
  const deletionTitles: Record<Kind,string> = {members:'회원 데이터 완전 삭제',boards:'게시판 완전 삭제'};
  const title=permanent ? deletionTitles[kind] : '게시판 운영';
  return <section className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="my-3 text-sm text-slate-600">{permanent?'삭제 전 대상과 연결 데이터를 확인합니다. 공통 계정, 다른 서비스 데이터와 법정·감사 기록은 유지됩니다.':'게시판을 운영 중지하거나 재개합니다. 이용 중지는 데이터 삭제를 수행하지 않습니다.'}</p>
    {permanent && <Link className="text-blue-700" to={kind==='members'?'/operator/service-members/community':'/operator/communities/boards'}>회원·게시판 이용 상태는 일상 운영에서 관리 →</Link>}
    {error && <div role="alert" className="my-4 text-red-700">{error}<button type="button" className="ml-3 min-h-11 underline" onClick={()=>setVersion(v=>v+1)}>다시 불러오기</button></div>}
    {message && <output className="my-4 block text-green-700">{message}</output>}
    {loading?<output>불러오는 중…</output>:<ul className="my-4 space-y-3">{rows.map(row=>{
      const state=kind==='members'?row.memberships?.find(m=>m.serviceKey==='community')?.status ?? row.status:row.status;
      return <li key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded border bg-white p-4">
        <span className="min-w-0 break-all">{row.name || '회원'} · {statuses[state] ?? state}</span>
        {permanent?<button type="button" disabled={busy} onClick={()=>void preview(row)} className="min-h-11 text-red-700">삭제 범위 확인</button>:<button type="button" disabled={busy} onClick={()=>void status(row)} className="min-h-11 text-blue-700">{row.status==='archived'?'운영 재개':'운영 중지'}</button>}
      </li>;
    })}{!rows.length && <li>대상이 없습니다.</li>}</ul>}
    {totalPages>1 && <nav aria-label="회원 페이지" className="flex items-center gap-4"><button type="button" disabled={loading||busy||page<=1} onClick={()=>setPage(p=>p-1)} className="min-h-11">이전</button><span>{page} / {totalPages}</span><button type="button" disabled={loading||busy||page>=totalPages} onClick={()=>setPage(p=>p+1)} className="min-h-11">다음</button></nav>}
    {plan && <section aria-label="완전 삭제 확인" className="my-5 rounded border border-red-300 bg-white p-4">
      <h2 className="font-semibold">되돌릴 수 없는 데이터 삭제</h2>
      <p className="my-3 text-sm">게시글에 연결된 다른 회원의 댓글·반응도 함께 삭제될 수 있습니다. 첨부 자료나 범위 밖 연결이 있으면 삭제가 차단됩니다.</p>
      <ul className="break-all text-sm">{Object.entries(plan.counts).filter(([,count])=>count>0).map(([name,count])=><li key={name}>{countLabels[name] ?? name}: {count}건</li>)}</ul>
      {plan.blockers.length>0?<ul role="alert" className="my-3 text-red-700">{plan.blockers.map(b=><li key={b}>{b}</li>)}</ul>:<label className="my-3 block">확인 문구 ‘완전 삭제’ 입력<input aria-label="삭제 확인 문구" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 block w-full rounded border px-3 py-2" /></label>}
      <div className="mt-3 flex flex-wrap gap-4"><button type="button" disabled={busy||confirmation!=='완전 삭제'||!!plan.blockers.length} onClick={()=>void remove()} className="min-h-11 rounded bg-red-700 px-4 text-white disabled:opacity-50">완전 삭제 실행</button><button type="button" disabled={busy} onClick={()=>{setPlan(null);setConfirmation('');}} className="min-h-11">취소</button></div>
    </section>}
  </section>;
}
