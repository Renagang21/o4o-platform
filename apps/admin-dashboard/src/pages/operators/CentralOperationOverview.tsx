import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { ActionBar } from '@o4o/ui';
import { authClient } from '@o4o/auth-client';
import { centralTaskHref } from './central-operation-navigation';
import { centralServiceLabel } from './central-operation-labels';

interface Task { key: string; service: string; label: string; href: string; count: number | null; oldest?: string | null; available: boolean }
type TaskRow = Task & { id: string };
interface Snapshot { tasks: Task[]; generatedAt: string }
export default function CentralOperationOverview({ roleKey }: { roleKey: string }) {
  const [snapshot, setSnapshot] = useState<{ scope: string; value: Snapshot } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOnly, setSelectedOnly] = useState(false);
  const sequence = useRef(0);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    try {
      const response = await authClient.api.get('/operator/central-access/overview');
      const value = response.data?.data;
      if (!Array.isArray(value?.tasks)) throw new Error('INVALID_OVERVIEW_RESPONSE');
      if (sequence.current === seq) { setSnapshot({ scope: roleKey, value }); setError(''); }
    } catch {
      if (sequence.current === seq) setError('대기 현황을 불러오지 못했습니다. 이전에 표시된 건수는 최신이 아닐 수 있습니다.');
    } finally {
      if (sequence.current === seq) setLoading(false);
    }
  }, [roleKey]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const focus = () => void load();
    window.addEventListener('focus', focus);
    return () => { sequence.current++; window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [load]);
  const current = snapshot?.scope === roleKey ? snapshot.value : null;
  const tasks = useMemo<TaskRow[]>(() => (current?.tasks ?? []).map(task => ({
    ...task, id: `${task.service}:${task.key}`,
    available: task.available && Number.isSafeInteger(task.count) && task.count! >= 0,
  })).sort((a, b) => Number(b.available && !!b.count) - Number(a.available && !!a.count) || (b.count ?? 0) - (a.count ?? 0)), [current]);
  const unavailable = tasks.filter(task => !task.available);
  const pending = tasks.filter(task => task.available && task.count! > 0);
  const rows = tasks.filter(task => (!service || task.service === service)
    && (filter === 'all' || (filter === 'unavailable' ? !task.available : !task.available || task.count! > 0))
    && (!selectedOnly || selected.has(task.id)));
  const activeSelected = rows.filter(task => selected.has(task.id));
  useEffect(() => { setSelected(previous => new Set([...previous].filter(id => tasks.some(task => task.id === id)))); }, [tasks]);
  useEffect(() => { if (selected.size === 0) setSelectedOnly(false); }, [selected.size]);
  const reset = () => { setSelected(new Set()); setSelectedOnly(false); };
  const columns: ListColumnDef<TaskRow>[] = [
    { key: '_select', header: '', system: true, width: '44px', render: (_, task) => <input type="checkbox" aria-label={`${task.label} 선택`} checked={selected.has(task.id)} onClick={e => e.stopPropagation()} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(task.id); else next.delete(task.id); return next; })} /> },
    { key: 'label', header: '처리할 업무', render: (_, task) => <div className="min-w-0"><Link className="font-medium text-slate-900 hover:text-blue-700" aria-label={`${task.label} 업무 열기`} to={centralTaskHref(task.service, task.href)}>{task.label}</Link><p className="mt-1 text-xs text-slate-500">{centralServiceLabel(task.service)}{task.oldest && <> · 최초 {new Date(task.oldest).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</>}</p></div> },
    { key: 'count', header: '대기', width: '90px', minWidth: 90, sortable: true, sortAccessor: task => task.count ?? -1, render: (_, task) => <span className={`whitespace-nowrap rounded-full px-2 py-1 text-sm font-semibold ${!task.available ? 'bg-amber-50 text-amber-800' : task.count ? 'bg-blue-50 text-blue-800' : 'text-slate-400'}`}>{task.available ? `${task.count}건` : '조회 실패'}</span> },
  ];
  return <section aria-label="전체 업무 대기 현황" className="mb-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">전체 업무 대기 현황</h2><p className="mt-1 text-sm text-slate-500">대기 업무부터 확인하고, 체크한 업무는 상단에서 모아보거나 열 수 있습니다.</p></div><button type="button" disabled={loading} className="rounded border bg-white px-3 py-2 text-sm" onClick={() => void load()}>대기 현황 새로고침</button></div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3">{error}</p>}
    {!current && loading && <output>운영 대기 현황 확인 중…</output>}
    {current && <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{unavailable.length ? '확인된 대기' : '전체 대기'}</p><strong className="mt-1 block text-2xl text-blue-800">{pending.reduce((sum, task) => sum + task.count!, 0)}<span className="ml-1 text-sm">건</span></strong></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">처리할 업무</p><strong className="mt-1 block text-2xl">{pending.length}<span className="ml-1 text-sm">종류</span></strong></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">조회 확인 필요</p><strong className={`mt-1 block text-2xl ${unavailable.length ? 'text-amber-700' : 'text-slate-600'}`}>{unavailable.length}<span className="ml-1 text-sm">종류</span></strong></div>
      </div>
      {unavailable.length > 0 && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">일부 업무를 조회하지 못했습니다. 조회 실패는 0건으로 집계하지 않습니다.</p>}
      <div className="flex flex-wrap gap-3"><label className="text-sm">서비스 <select aria-label="대기 업무 서비스" className="rounded border bg-white p-2" value={service} onChange={e => { setService(e.target.value); reset(); }}><option value="">전체 서비스</option>{[...new Set(tasks.map(task => task.service))].map(key => <option key={key} value={key}>{centralServiceLabel(key)}</option>)}</select></label><label className="text-sm">표시 <select aria-label="대기 업무 표시" className="rounded border bg-white p-2" value={filter} onChange={e => { setFilter(e.target.value); reset(); }}><option value="pending">대기·확인 필요</option><option value="all">전체 업무</option><option value="unavailable">조회 실패</option></select></label></div>
      <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={activeSelected.length} onClearSelection={reset} actions={[
        { key: 'open', label: '첫 선택 업무 열기', variant: 'primary', onClick: () => { if (activeSelected[0]) navigate(centralTaskHref(activeSelected[0].service, activeSelected[0].href)); } },
        { key: 'collect', label: selectedOnly ? '선택 모아보기 해제' : '선택 업무 모아보기', onClick: () => setSelectedOnly(value => !value) },
      ]} /></div>
      <DataTable className="[&_td]:px-3 [&_th]:px-3 [&_td]:whitespace-normal [&_th]:whitespace-normal" tableId="central-operation-pending" columns={columns} data={rows} rowKey="id" selectable selectedKeys={selected} onSelectionChange={setSelected} emptyMessage={error ? '이전 대기 현황을 확인해 주세요.' : '표시할 대기 업무가 없습니다.'} />
      <p className="text-xs text-slate-500">대기 현황은 1분마다 갱신합니다. 승인은 각 업무 상세에서 처리합니다.</p>
    </>}
  </section>;
}
