import {ActionBar} from '@o4o/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import MemberWorkPanel from './MemberWorkPanel';
import { memberError, memberServiceLabels, pharmacyLabels, qualificationLabels, type MemberDetail, type MemberPermissions, type MemberRow, type MemberTask, type MemberWorkMode } from './member-workspace-model';

const base = '/qualifications/pharmacist/members';
const tasks: Array<[MemberTask, string]> = [['all', '전체 회원'], ['qualifications', '약사 검토 대기'], ['pharmacies', '약국 심사 대기'], ['corrections', '반려·보완']];
function taskAllowed(task: MemberTask, permissions: MemberPermissions) {
  if (task === 'all') return true;
  if (task === 'qualifications') return permissions.qualifications;
  if (task === 'pharmacies') return permissions.pharmacies;
  return permissions.qualifications || permissions.pharmacies;
}
function statusLabel(labels: Record<string, string>, value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  return labels[value] ?? fallback;
}
export default function CentralMemberWorkspace({ actorId, initialQuery = '', adminMode=false }: Readonly<{ actorId: string; initialQuery?: string; adminMode?:boolean }>) {
  const [task, setTask] = useState<MemberTask>('all'), [page, setPage] = useState(1);
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
  useEffect(() => { if (selectedId) panel.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, [selectedId]);
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
  const openMember = async (id: string, mode:MemberWorkMode='detail') => {
    setWorkMode(mode);
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
    let failureMessage = '';
    try {
      const outcome=await work() as {data?:{data?:{storeInventoryPurged?:boolean;errorCode?:string}}};
      if(context!==actorEpoch.current.value)return;
      if(outcome?.data?.data?.storeInventoryPurged===false) setNotice(`폐업과 접근 해제는 적용됐습니다. 자료·파일 삭제는 미완료입니다. 확인 후 재시도해 주세요. (${outcome.data.data.errorCode??'PURGE_INCOMPLETE'})`);
      else setNotice('처리 결과를 저장했습니다. 아래에서 다음 업무 또는 다음 회원을 선택해 주세요.');
    } catch (error_) { failureMessage = memberError(error_); }
    finally {
      const refresh=async()=>{
        if(context!==actorEpoch.current.value)return;
        const latest=await load();
        if(context!==actorEpoch.current.value)return;
        if(latest?.some(row=>row.userId===id))await openMember(id);
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
  const columns: ListColumnDef<MemberRow>[] = [
    { key: 'name', header: '회원', stickyOnMobile: true, render: (_value, row) => <button type="button" disabled={busy} aria-pressed={selectedId === row.userId} className="text-left underline" onClick={event => { event.stopPropagation(); void openMember(row.userId); }}><strong>{row.name || '회원'}</strong><span className="block text-sm">{row.email}</span></button> },
    { key: 'serviceStatus', header: 'Neture 이용', render:value=>statusLabel(memberServiceLabels,value,'확인 필요') },
    { key: 'accountStatus', header: '공통 계정', render:(value,row)=>row.accountActive===false?'비활성':statusLabel({...memberServiceLabels,approved:'정상',inactive:'비활성'},value,'확인 필요') },
    { key: 'qualificationStatus', header: '약사 자격', render: value => statusLabel(qualificationLabels, value, '확인 필요') },
    ...(permissions.pharmacies ? [{ key: 'pharmacyStatus', header: '약국 신청', render: (value: unknown) => statusLabel(pharmacyLabels, value, '신청 없음') }] : []),
  ];
  let panelContent = <button type="button" disabled={busy} onClick={() => { if (selectedId) void openMember(selectedId); }}>선택 회원 다시 조회</button>;
  if (reading) { panelContent = <output>회원 제출 정보를 확인하는 중…</output>; }
  else if (detail) { panelContent = <MemberWorkPanel onErasureResult={result=>{if(result.erased){return;}
    setRows(previous=>previous.map(row=>row.userId===detail.member.userId?{...row,accountActive:false}:row));setDetail(previous=>previous?{...previous,member:{...previous.member,accountActive:false}}:previous);setSelectedIds(new Set());}} adminMode={adminMode} key={`${detail.member.userId}:${detailSequence.current}:${workMode}`} mode={workMode} detail={detail} actorId={actorId} busy={busy} perform={perform} onBusyChange={value=>{lock.current=value;setBusy(value);}} />; }
  return <section className="space-y-4 min-w-0" aria-label="회원 업무">
    <h2 className="text-xl font-bold">공통 회원 관리</h2>
    <p>업무 탭에서 회원을 선택하면 리스트 상단에서 제출 자료 확인과 심사를 이어갈 수 있습니다. 계정·약사 자격·약국 승인은 별개입니다.</p>
    <nav role="tablist" aria-label="회원 업무 대상" className="flex flex-wrap gap-2">{tasks.filter(([key]) => taskAllowed(key, permissions)).map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={task === key} disabled={busy} className={`rounded border px-3 py-2 ${task === key ? 'bg-blue-700 text-white' : ''}`} onClick={() => { setTask(key); setPage(1); }}>{label} ({counts[key] ?? 0})</button>)}</nav>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}><input aria-label="회원 이름·이메일 검색" maxLength={100} disabled={busy} value={search} onChange={event => setSearch(event.target.value)} className="rounded border p-2" /><button type="submit" disabled={busy}>검색</button><button type="button" disabled={busy || loading} onClick={() => { ++detailSequence.current; setDetail(null); setSelectedId(null); setSelectedIds(new Set()); void load(); }}>새로고침</button></form>
    {error && <p role="alert">{error}</p>}{notice && <output>{notice}</output>}
    <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={selectedIds.size} onClearSelection={()=>{if(busy)return;++detailSequence.current;setSelectedIds(new Set());setSelectedId(null);setDetail(null);setReading(false);}} actions={([
      ['detail','회원 상세보기'],['edit','회원 정보 수정'],['reject','가입 거부'],['delete',adminMode?'계정·개인자료 삭제 확인':'회원 해지'],['pharmacy','약국·사업자 정보'],
    ] as const).map(([key,label])=>({key,label,variant:key==='delete'?'danger':key==='detail'?'primary':'default',tooltip:key==='delete'&&(adminMode?!permissions.erase:!permissions.edit)?'전체 관리자 권한이 필요합니다.':key==='reject'&&!permissions.manageAccount?'계정 가입 거부는 전체 관리자 권한이 필요합니다.':undefined,disabled:busy||loading||(key!=='detail'&&selectedIds.size!==1)||(key==='edit'&&!permissions.edit)||(key==='reject'&&!permissions.manageAccount)||(key==='delete'&&(adminMode?!permissions.erase:!permissions.edit)),onClick:()=>{const first=rows.find(row=>selectedIds.has(row.userId));if(first)void openMember(first.userId,key);}}))}/></div>
    {selectedIds.size>0 && !adminMode && <p className="text-sm text-slate-600">회원 해지는 해당 서비스 이용 자격을 종료하며 계정을 삭제하지 않습니다. 계정·개인자료 완전삭제는 Admin 회원·사업체 관리에서 처리합니다.</p>}
    {selectedIds.size>1 && <p className="text-sm text-slate-600">선택 회원은 순서대로 상세 검토할 수 있습니다. 수정·거부·삭제는 한 명씩 확인 후 진행합니다.</p>}
    {selectedId && <section ref={panel} aria-label="선택 회원 작업" className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex flex-wrap gap-3"><h3 className="font-semibold">선택 회원 작업</h3><button type="button" disabled={busy} onClick={() => { ++detailSequence.current; setSelectedId(null); setSelectedIds(new Set()); setDetail(null); setReading(false); }}>선택 해제</button><button type="button" disabled={busy || reading || !nextMember} onClick={() => { if (nextMember) void openMember(nextMember.userId); }}>다음 회원 검토</button></div>
      {panelContent}
    </section>}
    <DataTable<MemberRow> tableId="central-common-member-workspace" columns={columns} data={rows} selectable selectedKeys={selectedIds} onSelectionChange={keys=>{if(busy)return;const next=new Set(keys);setSelectedIds(next);if(selectedId&&!next.has(selectedId)){++detailSequence.current;setSelectedId(null);setDetail(null);setReading(false);}}} rowKey="userId" loading={loading} emptyMessage="현재 조건에 해당하는 회원이 없습니다." onRowClick={row => { if (!busy) void openMember(row.userId); }} />
    <nav aria-label="회원 목록 페이지" className="flex gap-3"><button type="button" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>다음</button></nav>
  </section>;
}
