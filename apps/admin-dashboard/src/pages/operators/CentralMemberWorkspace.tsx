import {MEMBER_REGISTRATION_TYPES,MEMBER_STATUS_LABELS} from '@o4o/types';
import {ActionBar} from '@o4o/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authClient } from '@o4o/auth-client';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import MemberWorkPanel from './MemberWorkPanel';
import { api } from '@/api/base';
import { ERASURE_STATE_LABELS, deletionMessage } from '@/pages/platform/account-governance/AccountErasureControls';
import type { UserErasureResult } from '@/types/user';
import { erasureStatus, memberError, memberStatusTone, operatorRoleLabels, registrationDecisionBlock, type MemberDetail, type MemberPermissions, type MemberRow, type MemberTask, type MemberWorkMode, type PerformOptions } from './member-workspace-model';

const base = '/qualifications/pharmacist/members';
const tasks: Array<[MemberTask, string]> = [['all', '전체 회원'], ['pending', '가입 대기'], ['corrections', '반려·보완'], ['inactive', '해지 회원']];
function taskAllowed(task: MemberTask, permissions: MemberPermissions) {
  if (['all','pending','inactive','corrections'].includes(task)) return true;
  if (task === 'qualifications') return permissions.qualifications;
  if (task === 'pharmacies') return permissions.pharmacies;
  return permissions.qualifications || permissions.pharmacies;
}
function workActionVariant(key:MemberWorkMode,mode:MemberWorkMode):'danger'|'primary'|'default' {
  if(key==='delete'||key==='terminate')return 'danger';
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
  // 계정 삭제는 서버에서 수십 초 이상 걸릴 수 있다(삭제 전 · 후 전체 검토). 화면을 잠그지 않고 바로 목록으로 돌아가
  // 진행 중인 삭제를 목록 위에 보이며, 끝나면 목록 · 탭 숫자를 새로 읽는다.
  const [erasing,setErasing]=useState<Record<string,{name:string;startedAt:number}>>({}),[clock,setClock]=useState(()=>Date.now());
  const erasingCount=Object.keys(erasing).length;
  useEffect(()=>{
    if(!erasingCount)return;
    const timer=globalThis.setInterval(()=>setClock(Date.now()),1000);
    return()=>globalThis.clearInterval(timer);
  },[erasingCount]);
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
  // 계정 삭제는 화면을 잠그지 않으므로, 끝났을 때는 그 시점의 탭 · 검색 · 페이지로 다시 조회한다(PR #1003 Codex P2).
  const latestLoad = useRef(load);
  latestLoad.current = load;
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
  const perform = async (work: () => Promise<unknown>, options: PerformOptions = {}) => {
    if (lock.current || !detail) return;
    const id = detail.member.userId;
    const context=actorEpoch.current.value;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    let failureMessage = '';let accessLost=false;
    try {
      const outcome=await work() as {data?:{data?:{storeInventoryPurged?:boolean;errorCode?:string}}};
      if(context!==actorEpoch.current.value)return;
      if(outcome?.data?.data?.storeInventoryPurged===false) setNotice(`폐업과 접근 해제는 적용됐습니다. 자료·파일 삭제는 미완료입니다. 확인 후 재시도해 주시기 바랍니다. (${outcome.data.data.errorCode??'PURGE_INCOMPLETE'})`);
      else setNotice(options.done ?? '처리 결과를 저장했습니다. 아래에서 다음 업무 또는 다음 회원을 선택해 주시기 바랍니다.');
    } catch (error_) { failureMessage = memberError(error_);accessLost=[401,403].includes((error_ as {response?:{status?:number}}).response?.status??0); }
    finally {
      const refresh=async()=>{
        if(context!==actorEpoch.current.value)return;
        if(failureMessage){if(accessLost){++detailSequence.current;setDetail(null);setSelectedId(null);setSelectedIds(new Set());setRows([]);setCounts({});setPermissions({qualifications:false,pharmacies:false,edit:false});}setError(failureMessage);lock.current=false;setBusy(false);return;}
        const latest=await load();
        if(context!==actorEpoch.current.value)return;
        // 가입 승인·반려 · 해지·복구는 끝나면 패널을 닫는다. 결과는 목록 위 문구와 목록의 「회원 상태」로 확인한다.
        if(options.close){++detailSequence.current;setDetail(null);setSelectedId(null);setReading(false);}
        else if(latest?.some(row=>row.userId===id))await openMember(id,'detail',true);
        else {++detailSequence.current;setDetail(null);setSelectedId(null);setReading(false);}
        if(context!==actorEpoch.current.value)return;
        if(failureMessage)setError(failureMessage);
        setSelectedIds(new Set());lock.current=false;setBusy(false);
      };
      await refresh();
    }
  };
  // Admin 「계정 삭제」: 확인 창 하나로 바로 삭제한다(2026-11-08 통합 담당 요청). 서버의 erased 값만 완료로 본다.
  const eraseAccount = async (row: MemberRow) => {
    if (lock.current || erasing[row.userId]) return;
    const name = row.name || '선택한 회원';
    if (!globalThis.confirm(`${name} 계정을 삭제하시겠습니까?\n\n계정과 개인 자료 · 첨부파일이 삭제되며 되돌릴 수 없습니다. 사업체 · 약국 · 공급자 거래 자료는 유지됩니다.`)) return;
    const context = actorEpoch.current.value;
    // 화면은 잠그지 않는다: 선택만 정리하고 바로 목록으로 돌아간다.
    ++detailSequence.current; setSelectedId(null); setDetail(null); setSelectedIds(new Set()); setError(''); setNotice('');
    setErasing(previous => ({ ...previous, [row.userId]: { name, startedAt: Date.now() } }));
    let message = '', failure = '';
    try {
      const response = await api.delete(`/admin/users/${encodeURIComponent(row.userId)}`, { timeout: 300_000 });
      const data = response.data?.data as UserErasureResult | undefined;
      if (!data || typeof data.erased !== 'boolean' || !Object.prototype.hasOwnProperty.call(ERASURE_STATE_LABELS, data.state)) throw new Error('INVALID_RESPONSE');
      message = data.erased ? `${name} 계정을 삭제했습니다.`
        : `${name} — ${ERASURE_STATE_LABELS[data.state]} — 삭제가 아직 끝나지 않았습니다. 「삭제 처리 내역」에서 상태를 확인하거나 재시도해 주시기 바랍니다.${data.errorCode ? ` ${deletionMessage(data.errorCode)} (${data.errorCode})` : ''}`;
    } catch (error_) {
      const e = error_ as { code?: string; response?: { data?: { code?: string } } };
      const code = e.response?.data?.code;
      failure = e.code === 'ECONNABORTED'
        ? `${name} — 서버 응답이 없습니다. 삭제가 진행 중일 수 있으니 「삭제 처리 내역」에서 상태를 확인해 주시기 바랍니다.`
        : `${name} — ${deletionMessage(code)}${code ? ` (${code})` : ''}`;
    } finally {
      setErasing(previous => { const next = { ...previous }; delete next[row.userId]; return next; });
      if (context === actorEpoch.current.value) {
        await latestLoad.current();
        if (context === actorEpoch.current.value) { if (failure) setError(failure); else setNotice(message); }
      }
    }
  };
  const reviewRows=selectedIds.size>1?rows.filter(row=>selectedIds.has(row.userId)):rows;
  const selectedIndex = reviewRows.findIndex(row => row.userId === selectedId);
  const nextMember = reviewRows[selectedIndex + 1];
  const protectedSelection = !adminMode && rows.some(row=>selectedIds.has(row.userId)&&row.operatorReadOnly);
  const columns: ListColumnDef<MemberRow>[] = [
    {key:'name',header:'이름',stickyOnMobile:true,minWidth:120,render:(_value,row)=><span className="flex flex-col items-start gap-0.5"><button type="button" disabled={busy} aria-label={`회원 ${row.name||'미등록'} ${row.email||'이메일 미제공'}`} aria-pressed={selectedId===row.userId} className="whitespace-nowrap text-left underline" onClick={event=>{event.stopPropagation();void openMember(row.userId);}}>{row.name||'미등록'}</button>{row.operatorReadOnly&&<span className="whitespace-nowrap text-xs text-slate-500">전체 관리자 — 처리 대상 아님</span>}</span>},
    {key:'serviceStatus',header:'회원 상태',minWidth:100,render:(value,row)=>{const erasure=erasing[row.userId]?erasureStatus('processing'):erasureStatus(row.erasureState);return erasure?<span title={row.erasureState==='review_required'||row.erasureState==='retry_required'?`${deletionMessage(row.erasureErrorCode??undefined)} 「계정 삭제」를 다시 누르면 이어서 진행합니다.`:undefined} className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${erasure.tone}`}>{erasure.label}</span>:<span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${memberStatusTone[String(value)]??'border-slate-300 bg-white text-slate-600'}`}>{MEMBER_STATUS_LABELS[String(value)]??'확인 필요'}</span>}},
    // 운영자는 가입 신청서가 없어도 「미등록」이 아니라 맡은 서비스의 운영 역할을 모두 보인다(2026-11-10).
    {key:'registrationType',header:'가입 유형',minWidth:110,render:(value,row)=>{const type=MEMBER_REGISTRATION_TYPES[value as keyof typeof MEMBER_REGISTRATION_TYPES];const operator=operatorRoleLabels(row.operatorRoles);if(!operator.length)return <span className="whitespace-nowrap">{type??'미등록'}</span>;return <span className="flex flex-col items-start gap-0.5">{type&&<span className="whitespace-nowrap">{type}</span>}{operator.map(label=><span key={label} className="whitespace-nowrap rounded border border-indigo-200 bg-indigo-50 px-1.5 text-xs text-indigo-800">{label}</span>)}</span>;}},
    {key:'nickname',header:'닉네임',minWidth:120,render:value=><span className="whitespace-nowrap">{value||'미등록'}</span>},
    {key:'email',header:'이메일',minWidth:240,render:value=><span className="whitespace-nowrap">{value||'미제공'}</span>},
    {key:'loginMethods',header:'로그인 방식',minWidth:120,render:value=><span className="whitespace-nowrap">{Array.isArray(value)&&value.length?value.map(key=>({google:'Google',kakao:'카카오',email:'이메일'})[key]??'기타').join(' · '):'미등록'}</span>},
  ];
  let panelContent = <button type="button" disabled={busy} onClick={() => { if (selectedId) void openMember(selectedId); }}>선택 회원 다시 조회</button>;
  if (reading) { panelContent = <output>회원 제출 정보를 확인하는 중…</output>; }
  else if (detail) { panelContent = <MemberWorkPanel onAccessLost={clearPrivate} adminMode={adminMode} key={`${detail.member.userId}:${detail.member.version}:${workMode}`} onModeChange={setWorkMode} mode={workMode} detail={detail} actorId={actorId} busy={busy} perform={perform} onBusyChange={value=>{lock.current=value;setBusy(value);}} />; }
  const deleteForbidden=adminMode?!permissions.erase:!permissions.edit;
  return <section className="space-y-4 min-w-0" aria-label="회원 업무">
    <h2 className="text-xl font-bold">{adminMode?'전체 회원':'회원 가입·이용 관리'}</h2>
    <nav role="tablist" aria-label="회원 업무 대상" className="flex flex-wrap gap-2">{tasks.filter(([key]) => taskAllowed(key, permissions)).map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={task === key} disabled={busy} className={`rounded border px-3 py-2 ${task === key ? 'bg-blue-700 text-white' : ''}`} onClick={() => { setTask(key); setPage(1); }}>{label} ({counts[key] ?? 0})</button>)}</nav>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}><input aria-label="회원 이름·이메일 검색" maxLength={100} disabled={busy} value={search} onChange={event => setSearch(event.target.value)} className="rounded border p-2" /><button type="submit" disabled={busy}>검색</button><button type="button" disabled={busy || loading} onClick={() => { ++detailSequence.current; setDetail(null); setSelectedId(null); setSelectedIds(new Set()); void load(); }}>새로고침</button></form>
    {/* 패널이 열려 있으면 결과 · 오류는 패널 안에 보인다. 패널은 body 위 레이어라 여기 문구가 가려진다. */}
    {erasingCount>0 && <output aria-live="polite" className="block space-y-1 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{Object.entries(erasing).map(([id,item])=><span key={id} className="block">{item.name} 계정을 삭제하는 중입니다… {Math.max(0,Math.floor((clock-item.startedAt)/1000))}초 경과.</span>)}<span className="block text-amber-800">삭제는 서버에서 계속 진행됩니다. 다른 업무를 계속하셔도 되며, 끝나면 목록과 탭 숫자가 바뀝니다. 이 창은 닫지 마시기 바랍니다.</span></output>}
    {!selectedId && error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{!selectedId && notice && <output className="block rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</output>}
    <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={selectedIds.size} onClearSelection={()=>{if(busy)return;++detailSequence.current;setSelectedIds(new Set());setSelectedId(null);setDetail(null);setReading(false);}} actions={([
      // 「회원 정보」 하나에서 보기 · 수정 · 약국·사업자 정보를 함께 다룬다(패널 안에서 보기/수정 전환 · 2026-11-10).
      ['detail','회원 정보'],['reject','가입 반려'],
      // Admin: 「계정 삭제」는 바로 삭제하고, 이용 복구 · 약국 매도 이전 · 완전폐업은 「이용·약국 관리」 패널에서 한다(#990 Codex P1).
      // Operator: 「회원 해지」와 「이용 복구」를 나눈다 — 누른 버튼의 양식만 연다.
      ...(adminMode?[['manage','이용·약국 관리'] as const,['delete','계정 삭제'] as const]:[['terminate','회원 해지'] as const,['restore','이용 복구'] as const]),
    ] as ReadonlyArray<readonly [MemberWorkMode|'manage',string]>).map(([key,label])=>{
      const mode:MemberWorkMode=key==='manage'?'delete':key;
      let variant=workActionVariant(mode,workMode);
      if(key==='manage')variant=workMode==='delete'?'primary':'default';
      const selectedErasing=rows.some(row=>selectedIds.has(row.userId)&&erasing[row.userId]);
      const selectedRow=selectedIds.size===1?rows.find(row=>selectedIds.has(row.userId)):undefined;
      const rejectBlock=key==='reject'&&selectedRow?registrationDecisionBlock(selectedRow):null;
      const lifecycleBlock=key==='terminate'&&selectedRow&&selectedRow.serviceStatus!=='active'?'이용 중(정상)인 회원만 해지할 수 있습니다.'
        :key==='restore'&&selectedRow&&!['suspended','withdrawn'].includes(selectedRow.serviceStatus??'')?'해지된 회원만 이용을 복구할 수 있습니다.':null;
      return {key,label,visible:!protectedSelection||key==='detail',variant,tooltip:key==='delete'&&deleteForbidden?'전체 관리자 권한이 필요합니다.':rejectBlock??lifecycleBlock??undefined,disabled:busy||loading||(key!=='detail'&&(selectedIds.size!==1||selectedErasing))||(key==='edit'&&!permissions.edit)||(key==='reject'&&(!permissions.edit||rejectBlock!==null))||(key==='manage'&&!permissions.edit)||(key==='delete'&&deleteForbidden)||((key==='terminate'||key==='restore')&&(!permissions.edit||lifecycleBlock!==null)),onClick:()=>{const first=rows.find(row=>selectedIds.has(row.userId));if(!first)return;if(adminMode&&key==='delete'){void eraseAccount(first);return;}void openMember(first.userId,mode);}};
    })}/></div>
    {selectedIds.size>1 && <p className="text-sm text-slate-600">선택 회원은 순서대로 상세 검토할 수 있습니다. 수정·거부·삭제는 한 명씩 확인 후 진행합니다.</p>}
    {selectedId && createPortal(<aside ref={panel} tabIndex={-1} aria-label="선택 회원 작업" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl outline-none sm:w-[560px] lg:w-[640px]">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 bg-blue-50 px-3 py-3 text-sm sm:flex-nowrap sm:px-4"><h3 className="min-w-0 flex-1 truncate text-base font-semibold">{workMode==='edit'?'회원 정보 수정':workMode==='detail'||workMode==='pharmacy'?'회원 정보 보기':workMode==='terminate'?'회원 해지':workMode==='restore'?'이용 복구':'선택 회원 작업'}</h3><div className="order-last flex w-full justify-end gap-2 sm:order-none sm:w-auto"><button type="button" className="shrink-0 whitespace-nowrap px-1" disabled={busy || reading || !nextMember} onClick={() => { if (nextMember) void openMember(nextMember.userId); }}>다음 회원 검토</button><button type="button" className="shrink-0 whitespace-nowrap px-1" disabled={busy} onClick={closePanel}>선택 해제</button></div><button type="button" aria-label="회원 작업 패널 닫기" disabled={busy} className="shrink-0 rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100" onClick={closePanel}>×</button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}<button type="button" className="ml-2 underline" disabled={busy} onClick={()=>void openMember(selectedId,workMode,true)}>최신 정보 다시 조회</button></p>}
        {notice && <output className="block rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">{notice}</output>}
        {!adminMode && workMode==='delete' && <p className="text-sm text-slate-600">회원 해지는 해당 서비스 이용 자격을 종료하며 계정을 삭제하지 않습니다. 계정·개인자료 완전삭제는 Admin 회원·사업체 관리에서 처리합니다.</p>}
        {detail && !reading && ['detail','edit','pharmacy'].includes(workMode) && <div role="group" aria-label="회원 정보 보기·수정" className="flex gap-2">
          <button type="button" aria-pressed={workMode!=='edit'} disabled={busy} className={`rounded border px-3 py-1.5 text-sm ${workMode!=='edit'?'border-blue-700 bg-blue-700 text-white':'bg-white'}`} onClick={()=>setWorkMode('detail')}>회원 정보 보기</button>
          {detail.permissions.edit && !(detail.member.operatorReadOnly && !adminMode) && <button type="button" aria-pressed={workMode==='edit'} disabled={busy} className={`rounded border px-3 py-1.5 text-sm ${workMode==='edit'?'border-blue-700 bg-blue-700 text-white':'bg-white'}`} onClick={()=>setWorkMode('edit')}>회원 정보 수정</button>}
        </div>}
        {panelContent}
      </div>
    </aside>, document.body)}
    <DataTable<MemberRow> tableId="central-member-registration-workspace-v2" columns={columns} data={rows} selectable selectedKeys={selectedIds} onSelectionChange={keys=>{if(busy)return;const next=new Set(keys);setSelectedIds(next);if(selectedId&&!next.has(selectedId)){++detailSequence.current;setSelectedId(null);setDetail(null);setReading(false);}}} rowKey="userId" loading={loading} emptyMessage="현재 조건에 해당하는 회원이 없습니다." onRowClick={row => { if (!busy) void openMember(row.userId); }} />
    <nav aria-label="회원 목록 페이지" className="flex gap-3"><button type="button" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>다음</button></nav>
  </section>;
}
