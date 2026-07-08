/**
 * DescriptionStatusPage — 기본상품(master) 기준 설명 상태 통합 뷰 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1
 * WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-APPLY-V2 — V1 표준 목록 패턴 적용
 *   (BaseTable + O4OColumn + RowActionMenu + selectable/_select + ActionBar + pagination footer + columnVisibility)
 *
 * canonical(공식) / needs_review(검토) / draft(OTC 초안) / none(없음)을 master 축으로 통합 조회.
 * 필터·검색·상세 이동만 제공. 설명/ProductMaster/ProductCandidate mutation 없음(GET only).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText, ScrollText } from 'lucide-react';
import { BaseTable, RowActionMenu, ActionBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  listDescriptionStatus,
  getDescriptionStatusSummary,
  DescriptionStatusRow,
} from '@/api/o4o-product-db.api';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: '설명 상태 전체' },
  { value: 'canonical', label: '공식(canonical)' },
  { value: 'needs_review', label: '검토 필요' },
  { value: 'draft', label: '초안(draft)' },
  { value: 'none', label: '설명 없음' },
];

const REGULATORY_OPTIONS = [
  { value: 'all', label: '규제구분 전체' },
  { value: 'DRUG', label: '의약품' },
  { value: 'MEDICAL_DEVICE', label: '의료기기' },
  { value: 'QUASI_DRUG', label: '의약외품' },
  { value: 'HEALTH_FUNCTIONAL_FOOD', label: '건강기능식품' },
  { value: 'GENERAL', label: '일반' },
];

export default function DescriptionStatusPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DescriptionStatusRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [finalStatus, setFinalStatus] = useState('all');
  const [regulatoryType, setRegulatoryType] = useState('all');
  const [draftOnly, setDraftOnly] = useState(false);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    getDescriptionStatusSummary().then(setSummary).catch(() => setSummary({}));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDescriptionStatus({
        finalStatus: finalStatus === 'all' ? undefined : finalStatus,
        regulatoryType: regulatoryType === 'all' ? undefined : regulatoryType,
        draftOnly: draftOnly || undefined,
        q: q || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '설명 상태 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [finalStatus, regulatoryType, draftOnly, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedKeys(new Set());
    setQ(term.trim());
  };
  const resetPage = () => { setPage(1); setSelectedKeys(new Set()); };

  const toggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedKeys);
    if (checked) next.add(id); else next.delete(id);
    setSelectedKeys(next);
  };

  const columns: O4OColumn<DescriptionStatusRow>[] = [
    {
      key: '_select',
      system: true,
      header: '',
      width: 40,
      align: 'center',
      render: (_, r) => (
        <input
          type="checkbox"
          checked={selectedKeys.has(r.masterId)}
          onChange={(e) => toggleSelect(r.masterId, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      onCellClick: () => {},
    },
    {
      key: 'productName',
      header: '상품명',
      maxWidth: 260,
      render: (_, r) => <span className="block max-w-[16rem] truncate font-medium text-gray-900">{r.productName || '—'}</span>,
    },
    { key: 'manufacturerName', header: '제조사', maxWidth: 160, render: (_, r) => <span className="block max-w-[10rem] truncate text-gray-500">{r.manufacturerName || '—'}</span> },
    { key: 'regulatoryType', header: '규제구분', render: (_, r) => <span className="text-gray-500">{regulatoryLabel(r.regulatoryType)}</span> },
    { key: 'primaryIdentifier', header: '바코드', render: (_, r) => <span className="text-gray-400 font-mono text-xs">{r.primaryIdentifier || '—'}</span> },
    { key: 'finalStatus', header: '최종 상태', align: 'center', render: (_, r) => <FinalBadge status={r.finalStatus} /> },
    { key: 'canonical', header: '공식', align: 'center', render: (_, r) => (r.canonicalCount > 0 ? <Dot cls="bg-green-500" /> : <span className="text-gray-300">—</span>) },
    { key: 'needsReview', header: '검토', align: 'center', render: (_, r) => (r.needsReviewCount > 0 ? <Dot cls="bg-amber-500" /> : <span className="text-gray-300">—</span>) },
    {
      key: 'draft',
      header: '초안',
      align: 'center',
      render: (_, r) => (r.draftCount > 0
        ? <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{r.draftVerdicts[0] ? verdictShort(r.draftVerdicts[0]) : '초안'}</span>
        : <span className="text-gray-300">—</span>),
    },
    {
      key: 'source',
      header: '출처',
      maxWidth: 160,
      render: (_, r) => <span className="block max-w-[10rem] truncate text-gray-500 text-xs">{[...r.canonicalSourceTypes, ...r.needsReviewSourceTypes].map(sourceLabel).join(', ') || '—'}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: 'last',
      align: 'center',
      render: (_, r) => (
        <RowActionMenu
          actions={[
            { key: 'product', label: '상품 상세', icon: <Eye size={14} />, onClick: () => navigate(`/admin/o4o-product-db/masters/${r.masterId}`) },
            {
              key: 'desc',
              label: '설명 상세',
              icon: <FileText size={14} />,
              hidden: !(r.needsReviewDescriptionId || r.canonicalDescriptionId),
              onClick: () => navigate(`/admin/o4o-product-db/review/${r.needsReviewDescriptionId || r.canonicalDescriptionId}`),
            },
            {
              key: 'draft',
              label: '초안 상세',
              icon: <ScrollText size={14} />,
              hidden: !r.draftId,
              onClick: () => navigate(`/admin/o4o-product-db/drug-description-drafts/${r.draftId}`),
            },
          ]}
        />
      ),
      onCellClick: () => {},
    },
  ];

  return (
    <div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
        기본상품(ProductMaster) 기준으로 설명 상태를 통합 조회하는 read-only 화면입니다. 우선순위는
        <b> 공식(canonical) → 검토 필요 → 초안 → 없음</b> 이며, 공식이 있어도 OTC 초안이 있으면 <b>초안 배지</b>를 함께 표시합니다.
        이 화면은 조회 전용이며 승인·반려·설명 생성 기능은 제공하지 않습니다.
      </div>

      {/* summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <SummaryPill label="공식" value={summary.canonical} cls="bg-green-100 text-green-700" onClick={() => { setFinalStatus('canonical'); resetPage(); }} />
        <SummaryPill label="검토 필요" value={summary.needs_review} cls="bg-amber-100 text-amber-700" onClick={() => { setFinalStatus('needs_review'); resetPage(); }} />
        <SummaryPill label="초안" value={summary.draft} cls="bg-blue-100 text-blue-700" onClick={() => { setFinalStatus('draft'); resetPage(); }} />
        <SummaryPill label="없음" value={summary.none} cls="bg-gray-100 text-gray-600" onClick={() => { setFinalStatus('none'); resetPage(); }} />
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={finalStatus} onChange={(e) => { setFinalStatus(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={regulatoryType} onChange={(e) => { setRegulatoryType(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {REGULATORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm text-gray-600">
          <input type="checkbox" checked={draftOnly} onChange={(e) => { setDraftOnly(e.target.checked); resetPage(); }} />
          초안 있는 것만
        </label>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="상품명 / 제조사 / 바코드 / master id"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm">
            <Search className="w-4 h-4" /> 검색
          </button>
          {q && <button type="button" onClick={() => { setTerm(''); setQ(''); setPage(1); setSelectedKeys(new Set()); }} className="text-sm text-gray-500 px-2">초기화</button>}
        </form>
        <div className="ml-auto text-sm text-gray-500">총 {total.toLocaleString()}건</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      )}

      {selectedKeys.size > 0 && (
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedKeys.size}
            onClearSelection={() => setSelectedKeys(new Set())}
            statusInfo="선택 항목에 대한 일괄 작업은 후속 WO에서 제공됩니다."
            actions={[]}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <BaseTable<DescriptionStatusRow>
          columns={columns}
          data={rows}
          rowKey={(r) => r.masterId}
          onRowClick={(r) => navigate(`/admin/o4o-product-db/masters/${r.masterId}`)}
          emptyMessage={loading ? '불러오는 중…' : '현재 조건에 맞는 상품이 없습니다.'}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          tableId="o4o-product-description-status"
          columnVisibility
          persistState
        />

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">{page} / {totalPages} 페이지</span>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">이전</button>
              <button disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">다음</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const REGULATORY_LABEL: Record<string, string> = {
  DRUG: '의약품', MEDICAL_DEVICE: '의료기기', HEALTH_FUNCTIONAL_FOOD: '건강기능식품', QUASI_DRUG: '의약외품', GENERAL: '일반',
};
function regulatoryLabel(v: string | null): string {
  if (!v) return '—';
  return REGULATORY_LABEL[v] ?? v;
}
const SOURCE_LABEL: Record<string, string> = {
  mfds_easy_drug: 'e약은요', mfds_drug_otc: 'OTC설명', drug_extension: '허가정보', supplier: '공급자',
  operator: '운영자', ai: 'AI', store_contribution: '매장', manual: '수기', migration: '이관',
};
function sourceLabel(v: string): string {
  return SOURCE_LABEL[v] ?? v;
}
function verdictShort(v: string): string {
  const m: Record<string, string> = {
    INSERT_auto: '자동', INSERT_review_flag: '검토', INSERT_low_ground_flag: '저ground',
    INSERT_rx_minor_flag: 'RX', INSERT_manual_flag: '수동',
  };
  return m[v] ?? '초안';
}

function FinalBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    canonical: { label: '공식', cls: 'bg-green-100 text-green-700' },
    needs_review: { label: '검토 필요', cls: 'bg-amber-100 text-amber-700' },
    draft: { label: '초안', cls: 'bg-blue-100 text-blue-700' },
    none: { label: '없음', cls: 'bg-gray-100 text-gray-500' },
  };
  const m = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}>{m.label}</span>;
}
function SummaryPill({ label, value, cls, onClick }: { label: string; value?: number; cls: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded text-sm font-medium ${cls}`}>
      {label} {typeof value === 'number' ? value.toLocaleString() : '—'}
    </button>
  );
}
function Dot({ cls }: { cls: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}
