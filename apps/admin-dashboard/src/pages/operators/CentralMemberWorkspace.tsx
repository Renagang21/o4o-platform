import {MEMBER_REGISTRATION_TYPES,MEMBER_STATUS_LABELS} from '@o4o/types';
import {ActionBar} from '@o4o/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authClient } from '@o4o/auth-client';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import MemberWorkPanel from './MemberWorkPanel';
import { memberError, type MemberDetail, type MemberPermissions, type MemberRow, type MemberTask, type MemberWorkMode } from './member-workspace-model';

const base = '/qualifications/pharmacist/members';
const tasks: Array<[MemberTask, string]> = [['all', '전체 회원'], ['pending', '가입 대기'], ['corrections', '반려·보완'], ['inactive', '해지 회원']];
function taskAllowed(task: MemberTask, permissions: MemberPermissions) {
  if (['all','pending','inactive','corrections'].includes(task)) return true;
  if (task === 'qualifications') return permissions.qualifications;
  if (task === 'pharmacies') return permissions.pharmacies;
  return permissions.qualifications || permissions.pharmacies;
}
function workActionVariant(key:MemberWorkMode,mode:MemberWorkMode):'danger'|'primary'|'default' {
  if(key==='delete')return 'danger';
  if(key===mode)return 'primary';
  return 'default';
}
export default function CentralMemberWorkspace({ actorId, initialQuery = '', initialTask = 'all', adminMode=false }: Readonly<{ actorId: string; initialQuery?: string; initialTask?: MemberTask; adminMode?:boolean }>) {
  const [task, setTask] = useState<MemberTask>(initialTask), [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialQuery), [query, setQuery] = useState(initialQuery);
  const [rows, setRows] = useState<MemberRow[]>([]), [counts, setCounts] = useState<Record<string, number>>({});
  const [permissions, setPermissions] = useState<MemberPermissions>({ qualifications: false, pharmacies: false, edit: false });
  const [detail, setDetail] = useState<MemberDetail | null>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false), [reading, setReading] = useState(false), [busy, setBusy] = useState(false);
  const [hasNext, setHasNext] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const listSequence = useRef(0), detailSequence = useRef(0), lock = useRef(false);
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set());
  const [workMode,setWorkMode]=useState<MemberWorkMode>('detail');
  const actorEpoch=useRef({value:0});
  useEffect(()=>{const state=actorEpoch.current;++state.value;lock.current=false;setBusy(false);setPermissions({qualifications:false,pharmacies:false,edit:false});return()=>{++state.value;};},[actorId,adminMode]);
  const panel = useRef<HTMLElement | null>(null);
  const clearPrivate=()=>{++detailSequence.current;setDetail(null);setSelectedId(null);setSelectedIds(new Set());setRows([]);setCounts({});setPermissions({qualifications:false,pharmacies:false,edit:false});setBusy(false);lock.current=false;setError('현재 회원 업무 권한을 다시 확인해 주시기 바랍니다.');};
  const closePanel=useCallback(()=>{++detailSequence.current;setSelectedId(null);setSelectedIds(new Set());setDetail(null);setReading(false);},[]);
  useEffect(() => { if (selectedId) panel.current?.focus?.({ preventScroll: true }); }, [selectedId]);
  useEffect(()=>{
    if(!selectedId)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!lock.current)closePanel();};
    globalThis.addEventListener('keydown',onKey);
    return()=>globalThis.removeEventListener('keydown',onKey);
  },[selectedId,closePanel]);
  const load = useCallback(async () => {
    const seq = ++listSequence.current;
    setLoading(true); setError(''); setRows([]);
    try {
      const response = await authClient.api.get(base, { params: { task, page, q: query } });
      const data = response.data?.data;
      if (!Array.isArray(data?.items) || !data.permissions) throw new Error('Invalid member list');
      if (seq === listSequence.current) { setRows(data.items); setHasNext(data.hasNext === true); setCounts(data.counts ?? {}); setPermissions(data.permissions); setSelectedIds(previous=>new Set([...previous].filter(id=>data.items.some((row:MemberRow)=>row.userId===id)))); return data.items as MemberRow[]; }
    } catch (error_) {
      if (seq === listSequence.current) { setError(memberError(error_)); setPermissions({ qualifications: false, pharmacies: false, edit: false }); setDetail(null); setSelectedId(null); setSelectedIds(new Set()); ++detailSequence.current; }
    } finally { if (seq === listSequence.current) setLoading(false); }
  }, [task, page, query]);
  useEffect(() => {
    const lists = listSequence, details = detailSequence;
    ++detailSequence.current; setDetail(null); setSelectedId(null); setSelectedIds(new Set()); setReading(false); setNotice('');
    void load();
    return () => { ++lists.current; ++details.current; };
  }, [load,actorId,adminMode]);
  const openMember = async (id: string, mode:MemberWorkMode='detail',refresh=false) => {
    setWorkMode(mode);
    if(!refresh&&detail?.member.userId===id&&!reading){setSelectedIds(previous=>previous.has(id)?previous:new Set([id]));return;}
    setSelectedIds(previous=>previous.has(id)?previous:new Set([id]));
    const seq = ++detailSequence.current;
    setSelectedId(id); setDetail(null); setReading(true); setError('');
    try {
      const response = await authClient.api.get(`${base}/${encodeURIComponent(id)}`);
      const data = response.data?.data;
      if (data?.member?.userId !== id || !data.permissions) throw new Error('Invalid member detail');
      if (seq === detailSequence.current) setDetail(data);
    } catch (error_) { if (seq === detailSequence.current) {
      setError(memberError(error_));
      const status=(error_ as {response?:{status?:number}}).response?.status;
      if(status===401||status===403){setSelectedIds(new Set());setSelectedId(null);setRows([]);setCounts({});setPermissions({qualifications:false,pharmacies:false,edit:false});}
    } }
    finally { if (seq === detailSequence.current) setReading(false); }
  };
  const perform = async (work: () => Promise<unknown>) => {
    if (lock.current || !detail) return;
    const id = detail.member.userId;
    const context=actorEpoch.current.value;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    let failureMessage = '';let accessLost=false;
    try {
      const outcome=await work() as {data?:{data?:{storeInventoryPurged?:boolean;errorCode?:string}}};
      if(context!==actorEpoch.current.value)return;
      if(outcome?.data?.data?.storeInventoryPurged===false) setNotice(`폐업과 접근 해제는 적용됐습니다. 자료·파일 삭제는 미완료입니다. 확인 후 재시도해 주시기 바랍니다. (${outcome.data.data.errorCode??'PURGE_INCOMPLETE'})`);
      else setNotice('처리 결과를 저장했습니다. 아래에서 다음 업무 또는 다음 회원을 선택해 주시기 바랍니다.');
    } catch (error_) { failureMessage = memberError(error_);accessLost=[401,403].includes((error_ as {response?:{status?:number}}).response?.status??0); }
    finally {
      const refresh=async()=>{
        if(context!==actorEpoch.current.value)return;
        if(failureMessage){if(accessLost){++detailSequence.current;setDetail(null);setSelectedId(null);setSelectedIds(new Set());setRows([]);setCounts({});setPermissions({qualifications:false,pharmacies:false,edit:false});}setError(failureMessage);lock.current=false;setBusy(false);return;}
        const latest=await load();
        if(context!==actorEpoch.current.value)return;
        if(latest?.some(row=>row.userId===id))await openMember(id,'detail',true);
        else {++detailSequence.current;setDetail(null);setSelectedId(null);setReading(false);}
        if(context!==actorEpoch.current.value)return;
        if(failureMessage)setError(failureMessage);
        setSelectedIds(new Set());lock.current=false;setBusy(false);
      };
      await refresh();
    }
  };
  const reviewRows=selectedIds.size>1?rows.filter(row=>selectedIds.has(row.userId)):rows;
  const selectedIndex = reviewRows.findIndex(row => row.userId === selectedId);
  const nextMember = reviewRows[selectedIndex + 1];
  const protectedSelection = !adminMode && rows.some(row=>selectedIds.has(row.userId)&&row.operatorReadOnly);
  const columns: ListColumnDef<MemberRow>[] = [
    {key:'operatorReadOnly',header:'업무 대상',render:(_value,row)=>row.operatorReadOnly?'전체 관리자 — 처리 대상 아님':'회원'},
    {key:'name',header:'이름',stickyOnMobile:true,minWidth:120,render:(_value,row)=><button type="button" disabled={busy} aria-label={`회원 ${row.name||'미등록'} ${row.email||'이메일 미제공'}`} aria-pressed={selectedId===row.userId} className="whitespace-nowrap text-left underline" onClick={event=>{event.stopPropagation();void openMember(row.userId);}}>{row.name||'미등록'}</button>},
    {key:'nickname',header:'닉네임',minWidth:120,render:value=><span className="whitespace-nowrap">{value||'미등록'}</span>},
    {key:'email',header:'이메일',minWidth:240,render:value=><span className="whitespace-nowrap">{value||'미제공'}</span>},
    {key:'loginMethods',header:'로그인 방식',minWidth:120,render:value=><span className="whitespace-nowrap">{Array.isArray(value)&&value.length?value.map(key=>({google:'Google',kakao:'카카오',email:'이메일'})[key]??'기타').join(' · '):'미등록'}</span>},
    {key:'registrationType',header:'가입 유형',minWidth:110,render:value=><span className="whitespace-nowrap">{MEMBER_REGISTRATION_TYPES[value as keyof typeof MEMBER_REGISTRATION_TYPES]??'미등록'}</span>},
    {key:'serviceStatus',header:'회원 상태',minWidth:100,render:value=><span className="whitespace-nowrap">{MEMBER_STATUS_LABELS[String(value)]??'확인 필요'}</span>},
  ];
  let panelContent = <button type="button" disabled={busy} onClick={() => { if (selectedId) void openMember(selectedId); }}>선택 회원 다시 조회</button>;
  if (reading) { panelContent = <output>회원 제출 정보를 확인하는 중…</output>; }
  else if (detail) { panelContent = <MemberWorkPanel onErasureResult={result=>{if(result.erased){return;}
    setRows(previous=>previous.map(row=>row.userId===detail.member.userId?{...row,accountActive:false}:row));setDetail(previous=>previous?{...previous,member:{...previous.member,accountActive:false}}:previous);setSelectedIds(new Set());}} onAccessLost={clearPrivate} adminMode={adminMode} key={`${detail.member.userId}:${detail.member.version}:${workMode}`} onModeChange={setWorkMode} mode={workMode} detail={detail} actorId={actorId} busy={busy} perform={perform} onBusyChange={value=>{lock.current=value;setBusy(value);}} />; }
  const deleteForbidden=adminMode?!permissions.erase:!permissions.edit;
  return <section className="space-y-4 min-w-0" aria-label="회원 업무">
    <h2 className="text-xl font-bold">{adminMode?'전체 회원':'회원 가입·이용 관리'}</h2>
    <nav role="tablist" aria-label="회원 업무 대상" className="flex flex-wrap gap-2">{tasks.filter(([key]) => taskAllowed(key, permissions)).map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={task === key} disabled={busy} className={`rounded border px-3 py-2 ${task === key ? 'bg-blue-700 text-white' : ''}`} onClick={() => { setTask(key); setPage(1); }}>{label} ({counts[key] ?? 0})</button>)}</nav>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}><input aria-label="회원 이름·이메일 검색" maxLength={100} disabled={busy} value={search} onChange={event => setSearch(event.target.value)} className="rounded border p-2" /><button type="submit" disabled={busy}>검색</button><button type="button" disabled={busy || loading} onClick={() => { ++detailSequence.current; setDetail(null); setSelectedId(null); setSelectedIds(new Set()); void load(); }}>새로고침</button></form>
    {/* 패널이 열려 있으면 결과 · 오류는 패널 안에 보인다. 패널은 body 위 레이어라 여기 문구가 가려진다. */}
    {!selectedId && error && <p role="alert">{error}</p>}{!selectedId && notice && <output>{notice}</output>}
    <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={selectedIds.size} onClearSelection={()=>{if(busy)return;++detailSequence.current;setSelectedIds(new Set());setSelectedId(null);setDetail(null);setReading(false);}} actions={([
      ['detail','회원 상세보기'],['edit','회원 정보 수정'],['reject','가입 반려'],['delete',adminMode?'계정·개인자료 삭제 확인':'회원 해지·복구'],['pharmacy','약국·사업자 정보'],
    ] as const).map(([key,label])=>({key,label,visible:!protectedSelection||key==='detail',variant:workActionVariant(key,workMode),tooltip:key==='delete'&&deleteForbidden?'전체 관리자 권한이 필요합니다.':undefined,disabled:busy||loading||(key!=='detail'&&selectedIds.size!==1)||(key==='edit'&&!permissions.edit)||(key==='reject'&&!permissions.edit)||(key==='delete'&&deleteForbidden),onClick:()=>{const first=rows.find(row=>selectedIds.has(row.userId));if(first)void openMember(first.userId,key);}}))}/></div>
    {selectedIds.size>1 && <p className="text-sm text-slate-600">선택 회원은 순서대로 상세 검토할 수 있습니다. 수정·거부·삭제는 한 명씩 확인 후 진행합니다.</p>}
    {selectedId && createPortal(<aside ref={panel} tabIndex={-1} aria-label="선택 회원 작업" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl outline-none sm:w-[560px] lg:w-[640px]">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 bg-blue-50 px-3 py-3 text-sm sm:flex-nowrap sm:px-4"><h3 className="min-w-0 flex-1 truncate text-base font-semibold">{workMode==='edit'?'회원 정보 수정':workMode==='detail'?'회원 정보 보기':workMode==='pharmacy'?'약국·사업자 정보':'선택 회원 작업'}</h3><div className="order-last flex w-full justify-end gap-2 sm:order-none sm:w-auto"><button type="button" className="shrink-0 whitespace-nowrap px-1" disabled={busy || reading || !nextMember} onClick={() => { if (nextMember) void openMember(nextMember.userId); }}>다음 회원 검토</button><button type="button" className="shrink-0 whitespace-nowrap px-1" disabled={busy} onClick={closePanel}>선택 해제</button></div><button type="button" aria-label="회원 작업 패널 닫기" disabled={busy} className="shrink-0 rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100" onClick={closePanel}>×</button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}<button type="button" className="ml-2 underline" disabled={busy} onClick={()=>void openMember(selectedId,workMode,true)}>최신 정보 다시 조회</button></p>}
        {notice && <output className="block rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">{notice}</output>}
        {!adminMode && workMode==='delete' && <p className="text-sm text-slate-600">회원 해지는 해당 서비스 이용 자격을 종료하며 계정을 삭제하지 않습니다. 계정·개인자료 완전삭제는 Admin 회원·사업체 관리에서 처리합니다.</p>}
        {panelContent}
      </div>
    </aside>, document.body)}
    <DataTable<MemberRow> tableId="central-member-registration-workspace-v2" columns={columns} data={rows} selectable selectedKeys={selectedIds} onSelectionChange={keys=>{if(busy)return;const next=new Set(keys);setSelectedIds(next);if(selectedId&&!next.has(selectedId)){++detailSequence.current;setSelectedId(null);setDetail(null);setReading(false);}}} rowKey="userId" loading={loading} emptyMessage="현재 조건에 해당하는 회원이 없습니다." onRowClick={row => { if (!busy) void openMember(row.userId); }} />
    <nav aria-label="회원 목록 페이지" className="flex gap-3"><button type="button" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>다음</button></nav>
  </section>;
}
