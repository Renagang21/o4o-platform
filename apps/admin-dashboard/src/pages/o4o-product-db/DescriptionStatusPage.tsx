/**
 * DescriptionStatusPage — 기본상품(master) 기준 설명 상태 통합 뷰 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1
 *
 * canonical(공식) / needs_review(검토) / draft(OTC 초안) / none(없음)을 master 축으로 통합 조회.
 * 필터·검색·상세 이동만 제공. 설명/ProductMaster/ProductCandidate mutation 없음(GET only).
 * 기존 '설명 검토'(SPD) · 'OTC 설명 초안'(draft) 탭을 대체하지 않고 요약/탐색 축을 더한다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
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
    setQ(term.trim());
  };
  const resetPage = () => setPage(1);

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
          {q && <button type="button" onClick={() => { setTerm(''); setQ(''); setPage(1); }} className="text-sm text-gray-500 px-2">초기화</button>}
        </form>
        <div className="ml-auto text-sm text-gray-500">총 {total.toLocaleString()}건</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>상품명</Th>
              <Th>제조사</Th>
              <Th>규제구분</Th>
              <Th>바코드</Th>
              <Th>최종 상태</Th>
              <Th>공식</Th>
              <Th>검토</Th>
              <Th>초안</Th>
              <Th>출처</Th>
              <Th>이동</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">현재 조건에 맞는 상품이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.masterId}
                  onClick={() => navigate(`/admin/o4o-product-db/masters/${r.masterId}`)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <Td className="font-medium text-gray-900 max-w-xs truncate">{r.productName || '—'}</Td>
                  <Td className="max-w-[10rem] truncate text-gray-500">{r.manufacturerName || '—'}</Td>
                  <Td className="text-gray-500">{regulatoryLabel(r.regulatoryType)}</Td>
                  <Td className="text-gray-400 font-mono text-xs">{r.primaryIdentifier || '—'}</Td>
                  <Td><FinalBadge status={r.finalStatus} /></Td>
                  <Td className="text-center">{r.canonicalCount > 0 ? <Dot cls="bg-green-500" /> : '—'}</Td>
                  <Td className="text-center">{r.needsReviewCount > 0 ? <Dot cls="bg-amber-500" /> : '—'}</Td>
                  <Td className="text-center">
                    {r.draftCount > 0 ? <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{r.draftVerdicts[0] ? verdictShort(r.draftVerdicts[0]) : '초안'}</span> : '—'}
                  </Td>
                  <Td className="text-gray-500 text-xs max-w-[10rem] truncate">
                    {[...r.canonicalSourceTypes, ...r.needsReviewSourceTypes].map(sourceLabel).join(', ') || '—'}
                  </Td>
                  <Td className="whitespace-nowrap text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {r.needsReviewDescriptionId || r.canonicalDescriptionId ? (
                        <button onClick={() => navigate(`/admin/o4o-product-db/review/${r.needsReviewDescriptionId || r.canonicalDescriptionId}`)} className="text-gray-600 hover:text-admin-blue underline underline-offset-2">설명</button>
                      ) : null}
                      {r.draftId ? (
                        <button onClick={() => navigate(`/admin/o4o-product-db/drug-description-drafts/${r.draftId}`)} className="text-blue-600 hover:text-admin-blue underline underline-offset-2">초안</button>
                      ) : null}
                      <button onClick={() => navigate(`/admin/o4o-product-db/masters/${r.masterId}`)} className="text-admin-blue underline underline-offset-2">상품</button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">{page} / {totalPages} 페이지</span>
        <div className="flex gap-2">
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">이전</button>
          <button disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">다음</button>
        </div>
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
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return <td className={`px-4 py-3 align-middle whitespace-nowrap ${className}`} onClick={onClick}>{children}</td>;
}
