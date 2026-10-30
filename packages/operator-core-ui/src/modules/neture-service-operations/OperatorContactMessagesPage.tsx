import { useNetureServiceOperations } from './runtime';
/** Daily inquiry management; admin and operator share the same service workflow. */
import { useState, useEffect, useCallback, useRef } from 'react';
import OperatorContactDetail from './OperatorContactDetail';
import { useLatestRequest } from '../../common/operation-support';
import { DataTable, useBatchAction, type ListColumnDef } from '@o4o/operator-ux-core';
import { ActionBar, BulkResultModal } from '@o4o/ui';
import type { OperatorContactMessage, OperatorContactPagination } from './api';

const typeLabels: Record<string, string> = {
  supplier: '공급자',
  // 'partner' 문의 유형은 Legacy Partner 은퇴(2026-09-15)로 신규 접수 종료 — 과거 접수분 표시용 라벨만 유지
  partner: '파트너 (접수 종료)',
  service: '서비스',
  other: '기타',
};

const typeColors: Record<string, string> = {
  supplier: 'bg-emerald-100 text-emerald-700',
  partner: 'bg-indigo-100 text-indigo-700',
  service: 'bg-slate-100 text-slate-600',
  other: 'bg-slate-100 text-slate-500',
};

const statusLabels: Record<string, string> = {
  new: '신규',
  in_progress: '처리중',
  resolved: '완료',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

function contactError(error: any, fallback: string): string {
  const value = error?.response?.data?.error;
  return typeof value === 'string' ? value : typeof value?.message === 'string' ? value.message : error?.message || fallback;
}

type ContactTypeFilter = '' | 'supplier' | 'partner' | 'service' | 'other';
type StatusFilter = '' | 'new' | 'in_progress' | 'resolved';

export default function OperatorContactMessagesPage() {
  const { api: { operatorContactApi } } = useNetureServiceOperations();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [messages, setMessages] = useState<OperatorContactMessage[]>([]);
  const [pagination, setPagination] = useState<OperatorContactPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactTypeFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [markingRead, setMarkingRead] = useState(false);
  const markLock = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const beginLoad = useLatestRequest(`operator-contact:${contactTypeFilter}:${statusFilter}`);
  const beginMark = useLatestRequest(`operator-contact-mark:${contactTypeFilter}:${statusFilter}`);

  const load = useCallback(async (page = 1) => {
    const current = beginLoad();
    setLoading(true);
    setError(null);
    try {
      const result = await operatorContactApi.list({
        contactType: contactTypeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      if (!current()) return false;
      if (result && Array.isArray(result.items) && result.pagination) {
        setMessages(result.items);
        setSelectedIds(previous => new Set([...previous].filter(id => result.items.some(item => item.id === id))));
        setPagination(result.pagination);
        return true;
      } else {
        throw new Error('목록을 불러오지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (e: any) {
      if (current()) setError(contactError(e, '목록을 불러오지 못했습니다.'));
      return false;
    } finally {
      if (current()) setLoading(false);
    }
  }, [contactTypeFilter, statusFilter, beginLoad]);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleBulkMarkRead = async (ids = [...selectedIds]) => {
    if (markLock.current || detailBusy || loading || error || !ids.length) return;
    markLock.current = true;
    const current = beginMark();
    setMarkingRead(true); setActionError(null); setNotice(null);
    try {
      const result = await batch.executeBatch(async requested => {
        const results = [];
        for (const id of requested) {
          if (!current()) break;
          const item = messages.find(message => message.id === id);
          if (!item || item.status !== 'new') { results.push({ id, status: 'skipped' }); continue; }
          try {
            const value = await operatorContactApi.markRead(item);
            results.push({ id, status: value.skipped ? 'skipped' : 'success' });
          } catch (err: any) {
            results.push({ id, status: 'failed', error: contactError(err, '문의 확인에 실패했습니다.') });
          }
        }
        return { data: { results } };
      }, ids);
      if (!current()) return;
      setSelectedIds(new Set(result.results.filter(item => item.status === 'failed').map(item => item.id)));
      setNotice(`선택 문의 확인 완료: ${result.successCount}건 성공 · ${result.failedCount}건 실패 · ${result.skippedCount}건 건너뜀`);
      if (!(await load(pagination.page)) && current()) setActionError('처리 결과는 저장됐지만 목록을 갱신하지 못했습니다. 다시 시도는 목록만 조회합니다.');
    } finally { markLock.current = false; if (current()) setMarkingRead(false); }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const contactTypeOptions: Array<{ value: ContactTypeFilter; label: string }> = [
    { value: '', label: '전체 문의 (기본)' },
    { value: 'supplier', label: '공급자' },
    { value: 'partner', label: '파트너 (접수 종료 · 과거 문의)' },
    { value: 'service', label: '서비스' },
    { value: 'other', label: '기타' },
  ];

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: '', label: '전체 상태' },
    { value: 'new', label: '신규' },
    { value: 'in_progress', label: '처리중' },
    { value: 'resolved', label: '완료' },
  ];

  // WO-O4O-NETURE-EXPANDABLE-AND-REMAINING-LISTS-STANDARDIZATION-BATCH-V5:
  //   수동 <table> + expandedId → 공용 DataTable 확장 API (uncontrolled).
  //   본문 미리보기는 확장행으로 이전. 상태는 read-only 표시(운영자 개별 변경 불가).
  const columns: ListColumnDef<OperatorContactMessage>[] = [
    { key: '_select', header: '', system: true, width: '44px', render: (_, item) => <input type="checkbox" aria-label={`${item.subject || item.name} 문의 선택`} checked={selectedIds.has(item.id)} disabled={markingRead || detailBusy} onClick={e => e.stopPropagation()} onChange={e => setSelectedIds(previous => { const next = new Set(previous); if (e.target.checked) next.add(item.id); else next.delete(item.id); return next; })} /> },
    { key: 'subject', header: '문의', render: (_, item) => <div className="min-w-0 space-y-1"><button type="button" disabled={detailBusy || markingRead} onClick={() => setDetailId(item.id)} className="block break-words text-left text-sm font-medium text-slate-900 hover:text-emerald-700">{item.subject || '제목 없음'}</button><span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusColors[item.status] || 'bg-slate-100 text-slate-600'}`}>{statusLabels[item.status] || item.status}</span>{compact && <div className="space-y-1 text-xs text-slate-500"><p>{item.name} · {typeLabels[item.contactType] || item.contactType}</p><p className="break-all">{item.email}</p><p>{formatDate(item.createdAt)}</p></div>}</div> },
    { key: 'name', header: '접수자', render: (_, item) => <div className="min-w-0"><p className="break-words text-sm font-medium text-slate-800">{item.name}</p><p className="break-all text-xs text-slate-500">{item.email}</p></div> },
    { key: 'contactType', header: '유형', width: '90px', render: (_, item) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${typeColors[item.contactType] || 'bg-slate-100 text-slate-600'}`}>{typeLabels[item.contactType] || item.contactType}</span> },
    { key: 'createdAt', header: '접수일', width: '125px', render: (_, item) => <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span> },
  ];

  const renderExpandedRow = (m: OperatorContactMessage) => (
    <div className="space-y-2 text-sm text-slate-700">
      <div>
        <p className="mb-2 text-xs text-slate-500">연락처: {m.phone || '—'}</p><span className="text-xs text-slate-500 mr-2">본문 미리보기:</span>
        <span className="whitespace-pre-wrap">{m.messagePreview || '-'}</span>
      </div>
      <p className="text-xs text-slate-400">
        상태 변경과 내부 메모는 문의 상세에서 처리합니다.
      </p>
      <button type="button" disabled={detailBusy || markingRead} onClick={() => setDetailId(m.id)} className="underline text-emerald-700">문의 상세 처리</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">문의 메시지 (운영자)</h1>
        <p className="text-slate-500 mt-1">
          Contact us 로 접수된 모든 문의(공급자 · 서비스 · 기타 — 과거 접수된 파트너 문의 포함)를 확인합니다. 상세 확인·상태 변경·내부 메모를 이 화면에서 처리합니다.
        </p>
      </div>

      {/* Filters + bulk action */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            aria-label="문의 유형"
            disabled={markingRead || detailBusy}
            value={contactTypeFilter}
            onChange={(e) => { if (!markLock.current && !detailBusy) { setNotice(null); setActionError(null); setSelectedIds(new Set()); setContactTypeFilter(e.target.value as ContactTypeFilter); } }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {contactTypeOptions.map((o) => (
              <option key={o.value || 'default'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            aria-label="문의 상태"
            disabled={markingRead || detailBusy}
            value={statusFilter}
            onChange={(e) => { if (!markLock.current && !detailBusy) { setNotice(null); setActionError(null); setSelectedIds(new Set()); setStatusFilter(e.target.value as StatusFilter); } }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {statusOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-500">문의에 체크하면 상단 작업이 표시됩니다. 선택한 신규 문의만 처리중으로 전환하며, 이미 처리한 문의는 건너뜁니다.</p>
      </div>

      <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={selectedIds.size} onClearSelection={() => { if (!markLock.current) setSelectedIds(new Set()); }} actions={[{ key: 'confirm', label: '선택 문의 확인', variant: 'primary', loading: markingRead, disabled: markingRead || detailBusy || loading || !!error || !messages.some(item => selectedIds.has(item.id) && item.status === 'new'), onClick: () => handleBulkMarkRead() }, { key: 'detail', label: '선택 문의 상세', disabled: markingRead || detailBusy || selectedIds.size !== 1, onClick: () => { const id = [...selectedIds][0]; if (id) setDetailId(id); } }]} /></div>
      <BulkResultModal open={batch.showResult} result={batch.result} onClose={batch.clearResult} onRetry={loading || markingRead || !!error ? undefined : ids => { if (!markLock.current) void handleBulkMarkRead(ids); }} title="선택 문의 처리 결과" />
      {notice && <p role="status" className="text-emerald-700">{notice}</p>}
      {actionError && <p role="alert" className="text-red-600">{actionError}{!error && <button className="ml-3 underline" disabled={loading || markingRead} onClick={() => { setActionError(null); void load(pagination.page); }}>다시 시도</button>}</p>}
      {detailId && <OperatorContactDetail key={detailId} id={detailId} onClose={() => setDetailId(null)} onBusy={setDetailBusy}
        onSaved={async () => { setNotice('문의 처리는 완료했습니다.'); await load(pagination.page); }} />}
      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : error ? (
        <div role="alert" className="bg-white rounded-xl border border-slate-100 shadow-sm text-center py-16 text-red-500 text-sm">{error}<button className="ml-3 underline" onClick={() => void load(pagination.page)}>다시 시도</button></div>
      ) : (
        <DataTable<OperatorContactMessage>
          className="[&_td]:px-3 [&_th]:px-3 [&_td]:whitespace-normal [&_th]:whitespace-normal"
          columns={compact ? columns.filter(column => !['name', 'contactType', 'createdAt'].includes(column.key)) : columns}
          data={messages}
          rowKey={(m) => m.id}
          emptyMessage="조건에 맞는 문의가 없습니다."
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={keys => { if (!markLock.current && !detailBusy) setSelectedIds(keys); }}
          expandable
          renderExpandedRow={renderExpandedRow}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { if (!markLock.current && !detailBusy) { setNotice(null); setActionError(null); void load(Math.max(1, pagination.page - 1)); } }}
            disabled={pagination.page <= 1 || loading || markingRead}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{pagination.page} / {pagination.totalPages}</span>
          <button
            onClick={() => { if (!markLock.current && !detailBusy) { setNotice(null); setActionError(null); void load(Math.min(pagination.totalPages, pagination.page + 1)); } }}
            disabled={pagination.page >= pagination.totalPages || loading || markingRead}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
