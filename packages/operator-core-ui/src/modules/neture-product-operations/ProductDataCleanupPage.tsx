import {useNetureProductOperations} from './runtime';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLatestRequest } from '../../common/operation-support';

import type {DuplicateMaster,MissingFieldItem,RecycleBinItem,TrashPreview,EmptyTrashResult} from './operatorProductCleanup';
import type { CategoryTreeItem, BrandItem } from './catalog-options';
import { OperatorDialog } from '../../common/operation-support';

type Tab = 'duplicates' | 'missing-category' | 'missing-brand' | 'recycle-bin';
const tabs: { key: Tab; label: string }[] = [
  { key: 'duplicates', label: '중복 Master' }, { key: 'missing-category', label: '카테고리 없음' },
  { key: 'missing-brand', label: '브랜드 없음' }, { key: 'recycle-bin', label: '휴지통' },
];
type Action = { kind: 'merge'; item: DuplicateMaster } | { kind: 'restore' | 'delete'; item: RecycleBinItem };
function flatten(nodes: CategoryTreeItem[], prefix = ''): { id: string; name: string }[] {
  return nodes.flatMap(n => [{ id: n.id, name: prefix + n.name }, ...flatten(n.children ?? [], `${prefix}  `)]);
}
function failure(e: any) { return typeof e?.response?.data?.error === 'string' ? e.response.data.error : e?.message || '요청에 실패했습니다.'; }

export default function ProductDataCleanupPage({initialTab = 'duplicates'}: {initialTab?: Tab} = {}) {
  const {user,http:api,api:{productCleanupApi}}=useNetureProductOperations();
  const canAdmin = user?.roles?.some(r => r === 'neture:admin' || r === 'platform:super_admin') ?? false;
  const canOperate = canAdmin || (user?.roles?.includes('neture:operator') ?? false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [page, setPage] = useState(1);
  const [duplicates, setDuplicates] = useState<DuplicateMaster[]>([]);
  const [missing, setMissing] = useState<MissingFieldItem[]>([]);
  const [recycle, setRecycle] = useState<RecycleBinItem[]>([]);
  const [total, setTotal] = useState(0);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [preview, setPreview] = useState<TrashPreview | null>(null);
  const [emptyResult, setEmptyResult] = useState<EmptyTrashResult | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [field, setField] = useState('');
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const lock = useRef(false);
  const fallback = useRef<HTMLHeadingElement>(null);
  const roleKey = user?.roles?.join(',') ?? '';
  const scope = `${user?.id}:${roleKey}:${tab}:${page}`;
  const beginRead = useLatestRequest(`cleanup-read:${scope}`);
  const beginWrite = useLatestRequest(`cleanup-write:${scope}`);
  const load = useCallback(async () => {
    const current = beginRead(); setLoading(true); setError('');
    try {
      if (tab === 'duplicates') {
        const data = await productCleanupApi.getDuplicateMasters(); if (current()) setDuplicates(data);
      } else if (tab === 'recycle-bin') {
        const data = await productCleanupApi.getRecycleBin(page, 50);
        if (current()) { setRecycle(data.data!); setTotalPages(data.pagination!.totalPages); setTotal(data.pagination!.total ?? data.data!.length); }
      } else {
        const category = tab === 'missing-category';
        const [items, reference] = await Promise.all([
          category ? productCleanupApi.getMissingCategory() : productCleanupApi.getMissingBrand(),
          api.get(category ? '/neture/categories' : '/neture/brands'),
        ]);
        if (!reference.data?.success || !Array.isArray(reference.data.data)) throw new Error('분류 선택 목록을 불러오지 못했습니다.');
        if (current()) { setMissing(items); setOptions(category ? flatten(reference.data.data as CategoryTreeItem[]) : (reference.data.data as BrandItem[])); }
      }
      if (current()) { setIds([]); setField(''); }
      return current();
    } catch (e) { if (current()) setError(failure(e)); return false; }
    finally { if (current()) setLoading(false); }
  }, [beginRead, tab, page, api, productCleanupApi]);
  useEffect(() => { setWriting(false); setAction(null); setEmptyOpen(false); setPreview(null); setReason(''); setActionError(''); void load(); }, [load]);
  useEffect(() => { setNotice(''); setEmptyResult(null); }, [tab, user?.id, roleKey]);
  const blocked = !canOperate || loading || !!error || writing;
  function open(next: Action) {
    if (blocked || lock.current || (next.kind !== 'restore' && !canAdmin)) return;
    setAction(next); setReason(''); setActionError('');
  }
  async function confirmAction() {
    if (!action || blocked || lock.current || (action.kind !== 'restore' && !canAdmin) || (action?.kind === 'merge' && !reason.trim())) return;
    lock.current = true; setWriting(true); setActionError(''); setNotice('');
    const current = beginWrite();
    let completed = 0;
    try {
      if (action.kind === 'merge') {
        for (const sourceId of action.item.masterIds.slice(1)) {
          const result = await productCleanupApi.mergeMasters(sourceId, action.item.masterIds[0], reason.trim());
          if (!current()) return;
          if (!result.success) throw new Error(result.error || '병합 실패');
          completed++;
        }
      } else {
        const result = action.kind === 'restore' ? await productCleanupApi.restore(action.item.id) : await productCleanupApi.hardDelete(action.item.id);
        if (!current()) return;
        if (!result.success) throw new Error(result.error || '처리 실패');
      }
      if (!current()) return;
      setNotice(action.kind === 'restore' ? '휴지통에서 복원했습니다. 상품은 비활성 상태를 유지합니다.' : action.kind === 'merge' ? `${completed}개 병합을 완료했습니다.` : '완전 삭제했습니다.');
      setAction(null); setReason(''); await load();
    } catch (e) {
      if (!current()) return;
      if (action.kind === 'merge') {
        // Never replay the successfully committed prefix or an uncertain response.
        setNotice(`${completed}개 병합 응답을 확인했습니다. ${failure(e)} 남은 대상은 최신 목록에서 다시 선택해 주세요.`);
        setAction(null); await load();
      } else setActionError(failure(e));
    } finally { lock.current = false; if (current()) setWriting(false); }
  }
  async function previewTrash() {
    if (blocked || !canAdmin || lock.current) return;
    lock.current = true; setWriting(true); setActionError(''); setEmptyOpen(true); setPreview(null); setEmptyResult(null);
    const current = beginWrite();
    try { const value = await productCleanupApi.previewEmptyTrash(); if (current()) setPreview(value); }
    catch (e) { if (current()) setActionError(failure(e)); }
    finally { lock.current = false; if (current()) setWriting(false); }
  }
  async function emptyTrash() {
    if (blocked || !canAdmin || lock.current || !preview?.count) return;
    lock.current = true; setWriting(true); setActionError(''); setNotice('');
    const current = beginWrite();
    try {
      const result = await productCleanupApi.emptyTrash(preview);
      if (!current()) return;
      setEmptyResult(result); setNotice(`${result.deleted}개 완전 삭제 · ${result.blocked.length}개 연결 보호로 제외했습니다.`);
      setEmptyOpen(false); setPreview(null); setPage(1); await load();
    } catch (e) { if (current()) { setActionError(failure(e)); setPreview(null); } }
    finally { lock.current = false; if (current()) setWriting(false); }
  }
  async function fix() {
    if (blocked || lock.current || !ids.length || !field) return;
    lock.current = true; setWriting(true); setNotice(''); setActionError('');
    const current = beginWrite();
    try {
      const result = tab === 'missing-category' ? await productCleanupApi.fixCategory(ids, field) : await productCleanupApi.fixBrand(ids, field);
      if (!current()) return;
      if (!result.success) throw new Error(result.error || '수정 실패');
      setNotice(`${result.data?.updated ?? 0}개 상품 분류를 수정했습니다.`); await load();
    } catch (e) { if (current()) setActionError(failure(e)); }
    finally { lock.current = false; if (current()) setWriting(false); }
  }
  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
    <h1 ref={fallback} tabIndex={-1} className="text-2xl font-bold">상품 데이터 정리</h1>
    <p className="text-sm text-slate-600">누락 분류 수정·휴지통 복원은 일상 운영입니다. 데이터 병합·완전 삭제는 해당 서비스 admin이 처리합니다. 완전 삭제 시 대상과 삭제자를 자동 기록합니다.</p>
    {notice && <p role="status" className="text-emerald-800">{notice}</p>}
    {actionError && !action && !emptyOpen && <p role="alert" className="text-red-700">{actionError}</p>}
    <fieldset disabled={writing} className="min-w-0 space-y-4">
      <legend className="sr-only">상품 정리</legend>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="정리 유형">{tabs.map(t => <button type="button" role="tab" aria-selected={tab === t.key} key={t.key} onClick={() => { if (!lock.current) { setPage(1); setTab(t.key); } }} className={`border rounded px-3 py-2 ${tab === t.key ? 'bg-emerald-100' : ''}`}>{t.label}</button>)}</div>
      {loading ? <p role="status">목록 조회 중…</p> : error ? <div role="alert" className="text-red-700">
        {notice && <p>처리 결과는 위와 같습니다. 최신 목록을 확인하지 못했으므로 조회만 다시 시도해 주세요.</p>}{error}
        <button type="button" onClick={() => void load()} className="ml-3 underline">목록 다시 조회</button>
      </div> : <>
        {tab === 'duplicates' && (duplicates.length ? duplicates.map(d => <section className="border rounded p-4 space-y-2" key={d.barcode}>
          <p className="font-medium">{d.barcode} · {d.count}개 중복</p><ul>{d.names.map((name, i) => <li key={d.masterIds[i]}>{i === 0 ? '유지: ' : '병합: '}{name}</li>)}</ul>
          {canAdmin ? <button type="button" disabled={blocked} onClick={() => open({ kind: 'merge', item: d })} className="border rounded p-2">중복 병합</button> : <p className="text-sm">병합은 서비스 admin에게 요청해 주세요.</p>}
        </section>) : <p>중복 상품이 없습니다.</p>)}
        {(tab === 'missing-category' || tab === 'missing-brand') && (missing.length ? <>
          <div className="flex flex-wrap gap-3"><select aria-label="수정할 분류" value={field} onChange={e => setField(e.target.value)} className="border p-2"><option value="">분류 선택</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select><button type="button" disabled={blocked || !ids.length || !field} onClick={() => void fix()} className="border rounded p-2">선택 {ids.length}개 수정</button></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>선택</th><th>상품명</th><th>바코드</th><th>연결 상품</th></tr></thead><tbody>{missing.map(m => <tr key={m.id} className="border-b"><td className="p-3"><input type="checkbox" aria-label={`${m.name} 선택`} checked={ids.includes(m.id)} onChange={e => setIds(old => e.target.checked ? [...old, m.id] : old.filter(id => id !== m.id))} /></td><td>{m.name}</td><td>{m.barcode}</td><td>{m.offerCount}</td></tr>)}</tbody></table></div>
        </> : <p>누락된 분류가 없습니다.</p>)}
        {tab === 'recycle-bin' && <>
          <div className="flex flex-wrap items-center gap-3"><p>휴지통 전체 {total.toLocaleString()}개</p>{canAdmin && <button type="button" disabled={blocked || total === 0} onClick={() => void previewTrash()} className="border rounded px-3 py-2 text-red-700">휴지통 비우기</button>}</div>
          <p className="text-sm text-slate-600">비우기는 현재 페이지만이 아닌 휴지통 전체에 적용합니다. 주문·장바구니·활성 매장·서비스 상품에 연결된 상품은 남깁니다.</p>
          {emptyResult && emptyResult.blocked.length > 0 && <section className="border rounded p-3"><h2 className="font-medium">완전 삭제에서 제외한 상품</h2><ul>{emptyResult.blocked.map(item => <li key={item.id}>{recycle.find(row => row.id === item.id)?.name || `상품 ID: ${item.id}`} · {item.reason}</li>)}</ul></section>}
          {recycle.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>상품명</th><th>공급자</th><th>삭제일·사유</th><th>조치</th></tr></thead><tbody>{recycle.map(m => <tr key={m.id} className="border-b"><td className="p-3">{m.name}<br /><small>{m.barcode}</small></td><td>{m.supplier_name}</td><td>{new Date(m.deleted_at).toLocaleDateString('ko-KR')}<br />{m.delete_reason || '사유 없음'}</td><td className="p-2"><div className="flex flex-wrap gap-2"><button type="button" disabled={blocked} onClick={() => open({ kind: 'restore', item: m })} className="border rounded p-2">휴지통 복원</button>{canAdmin && <button type="button" disabled={blocked} onClick={() => open({ kind: 'delete', item: m })} className="border rounded p-2 text-red-700">완전 삭제</button>}</div></td></tr>)}</tbody></table></div> : <p>휴지통이 비어 있습니다.</p>}
          {totalPages > 1 && <div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</button></div>}
        </>}
      </>}
    </fieldset>
    {emptyOpen && <OperatorDialog label="휴지통 비우기 확인" fallbackFocus={fallback} busy={writing} onCancel={() => { if (!lock.current) setEmptyOpen(false); }} className="bg-white rounded-lg p-6 max-w-lg w-full space-y-3">
      <h2 className="font-bold">휴지통 비우기</h2>
      {preview ? <p>휴지통 전체에서 확인한 {preview.count.toLocaleString()}개 상품의 완전 삭제를 진행합니다. 되돌릴 수 없습니다. 연결 보호 대상은 남깁니다.</p> : <p>{writing ? '휴지통 전체 대상 확인 중…' : '최신 휴지통 대상을 다시 확인해 주세요.'}</p>}
      {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
      <button type="button" data-dialog-initial-focus disabled={writing} onClick={() => setEmptyOpen(false)} className="border rounded p-2">취소</button>
      {preview ? <button type="button" disabled={writing || !preview.count} onClick={() => void emptyTrash()} className="ml-3 bg-red-600 text-white rounded p-2">{writing ? '처리 중…' : '확인한 상품 완전 삭제'}</button> : !writing && <button type="button" onClick={() => void previewTrash()} className="ml-3 border rounded p-2">대상 다시 확인</button>}
    </OperatorDialog>}
    {action && <OperatorDialog label={action.kind === 'merge' ? '상품 병합' : action.kind === 'delete' ? '상품 완전 삭제' : '휴지통 복원'} fallbackFocus={fallback} busy={writing} onCancel={() => { if (!lock.current) setAction(null); }} className="bg-white rounded-lg p-6 max-w-lg w-full space-y-3">
      <h2 className="font-bold">{action.kind === 'merge' ? `${action.item.names[0]} 기준 병합` : action.item.name}</h2>
      <p>{action.kind === 'restore' ? '휴지통에서 복원하며, 비활성 상태를 유지합니다.' : action.kind === 'merge' ? '이 조치는 되돌릴 수 없습니다. 병합 대상과 사유를 확인해 주세요.' : '이 조치는 되돌릴 수 없습니다. 삭제 대상을 확인해 주세요.'}</p>
      {action.kind === 'merge' && <label className="block">처리 사유<textarea aria-label="처리 사유" maxLength={2000} value={reason} disabled={writing} onChange={e => setReason(e.target.value)} className="block border rounded w-full p-2" /></label>}
      {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
      <button type="button" data-dialog-initial-focus disabled={writing} onClick={() => { if (!lock.current) setAction(null); }} className="border rounded p-2">취소</button>
      <button type="button" disabled={blocked || (action.kind === 'merge' && !reason.trim())} onClick={() => void confirmAction()} className="ml-3 bg-emerald-700 text-white rounded p-2">{writing ? '처리 중…' : action.kind === 'delete' ? '완전 삭제' : '처리 확인'}</button>
    </OperatorDialog>}
  </div>;
}
