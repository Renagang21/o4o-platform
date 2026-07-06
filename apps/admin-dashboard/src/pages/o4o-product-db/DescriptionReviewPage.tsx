/**
 * DescriptionReviewPage — SharedProductDescription 설명 검토 목록 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-SHELL-V1
 * (기반: WO-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1)
 *
 * ProductMaster 횡단으로 설명 후보/공식 설명 상태를 조회하는 read-only 검토 화면.
 * 규제구분·출처·언어·상태·검색 필터(모두 GET query param). row → 기본 상품 상세(read-only)로 이동.
 * 설명 생성/승인/수정/삭제 기능은 제공하지 않는다 (mutation 0).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listDescriptionReviews, DescriptionReviewRow } from '@/api/o4o-product-db.api';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: '상태 전체' },
  { value: 'needs_review', label: '검토 대기' },
  { value: 'canonical', label: '대표(canonical)' },
  { value: 'candidate', label: '후보' },
  { value: 'deprecated', label: '반려' },
  { value: 'hidden', label: '숨김' },
];

const REGULATORY_OPTIONS = [
  { value: 'all', label: '규제구분 전체' },
  { value: 'DRUG', label: '의약품' },
  { value: 'MEDICAL_DEVICE', label: '의료기기' },
  { value: 'HEALTH_FUNCTIONAL_FOOD', label: '건강기능식품' },
  { value: 'QUASI_DRUG', label: '의약외품' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: '출처 전체' },
  { value: 'mfds_easy_drug', label: 'e약은요' },
  { value: 'drug_extension', label: '허가정보' },
  { value: 'supplier', label: '공급자' },
  { value: 'operator', label: '운영자' },
  { value: 'ai', label: 'AI' },
  { value: 'store_contribution', label: '매장' },
  { value: 'manual', label: '수기' },
  { value: 'migration', label: '이관' },
];

const LANGUAGE_OPTIONS = [
  { value: 'all', label: '언어 전체' },
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];

export default function DescriptionReviewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DescriptionReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [regulatoryType, setRegulatoryType] = useState('all');
  const [sourceType, setSourceType] = useState('all');
  const [language, setLanguage] = useState('all');
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDescriptionReviews({
        status,
        regulatoryType,
        sourceType,
        language,
        q: q || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '설명 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [status, regulatoryType, sourceType, language, q, page]);

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
        이 화면은 설명 데이터를 조회하는 read-only 검토 화면입니다. 목록은 read-only이며 설명 생성·승인·수정·삭제 기능은 제공하지 않습니다.
        행을 클릭하면 해당 기본 상품 상세로 이동하고, 기존 큐레이션 상세(대표 승격·반려)는 각 행의 <b>큐레이션</b> 링크에서 별도 화면으로 유지됩니다.
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={regulatoryType}
          onChange={(e) => { setRegulatoryType(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {REGULATORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={sourceType}
          onChange={(e) => { setSourceType(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={language}
          onChange={(e) => { setLanguage(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="상품명 / 제조사 / 바코드"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-60"
          />
          <button type="submit" className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm">
            <Search className="w-4 h-4" /> 검색
          </button>
          {q && (
            <button type="button" onClick={() => { setTerm(''); setQ(''); setPage(1); }} className="text-sm text-gray-500 px-2">초기화</button>
          )}
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
              <Th>공식명</Th>
              <Th>제조사</Th>
              <Th>규제구분</Th>
              <Th>상태</Th>
              <Th>출처</Th>
              <Th>언어</Th>
              <Th>요약</Th>
              <Th>품질</Th>
              <Th>수정일</Th>
              <Th>상세</Th>
              <Th>큐레이션</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">현재 조건에 맞는 설명 데이터가 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/admin/o4o-product-db/masters/${r.masterId}`)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <Td className="font-medium text-gray-900 max-w-xs truncate">{r.masterName || r.representativeName || '—'}</Td>
                  <Td className="text-gray-500 max-w-xs truncate">{r.regulatoryName || '—'}</Td>
                  <Td className="max-w-[10rem] truncate">{r.manufacturerName || '—'}</Td>
                  <Td>{regulatoryLabel(r.regulatoryType)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td className="text-gray-500">{sourceLabel(r.sourceType)}</Td>
                  <Td className="text-gray-500 uppercase">{r.language || '—'}</Td>
                  <Td className="max-w-[16rem]">
                    <span className="block truncate text-gray-600">{r.summary || r.contentPreview || '—'}</span>
                  </Td>
                  <Td className="text-gray-500">{typeof r.qualityScore === 'number' ? r.qualityScore.toFixed(2) : '—'}</Td>
                  <Td className="text-gray-400">{(r.updatedAt || r.createdAt)?.slice(0, 10) || '—'}</Td>
                  <Td className="text-admin-blue whitespace-nowrap">상품 상세 →</Td>
                  <Td className="whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/o4o-product-db/review/${r.id}`); }}
                      className="text-gray-600 hover:text-admin-blue underline underline-offset-2"
                    >
                      큐레이션 상세
                    </button>
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
  DRUG: '의약품',
  MEDICAL_DEVICE: '의료기기',
  HEALTH_FUNCTIONAL_FOOD: '건강기능식품',
  QUASI_DRUG: '의약외품',
};
function regulatoryLabel(v: string | null): string {
  if (!v) return '—';
  return REGULATORY_LABEL[v] ?? v;
}

const SOURCE_LABEL: Record<string, string> = {
  mfds_easy_drug: 'e약은요',
  drug_extension: '허가정보',
  supplier: '공급자',
  operator: '운영자',
  ai: 'AI',
  store_contribution: '매장',
  manual: '수기',
  migration: '이관',
};
function sourceLabel(v: string): string {
  return SOURCE_LABEL[v] ?? v;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    needs_review: { label: '검토 대기', cls: 'bg-amber-100 text-amber-700' },
    canonical: { label: '대표', cls: 'bg-green-100 text-green-700' },
    candidate: { label: '후보', cls: 'bg-gray-100 text-gray-600' },
    deprecated: { label: '반려', cls: 'bg-red-100 text-red-600' },
    hidden: { label: '숨김', cls: 'bg-gray-100 text-gray-500' },
  };
  const m = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle whitespace-nowrap ${className}`}>{children}</td>;
}
