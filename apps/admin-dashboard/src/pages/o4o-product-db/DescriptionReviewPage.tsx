/**
 * DescriptionReviewPage — SharedProductDescription 검토 목록/검색
 *
 * WO-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1
 *
 * e약은요 파생 설명(needs_review)을 master 횡단으로 조회. 필터: status/sourceType/flag/검색.
 * row 클릭 → 상세(canonical 승격). bulk 후보 dry-run 배너 표시(자동 승격 없음).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  listDescriptionReviews,
  getBulkCanonicalDryRun,
  DescriptionReviewRow,
  BulkCanonicalDryRunResult,
} from '@/api/o4o-product-db.api';

const LIMIT = 20;
const STATUS_OPTIONS = [
  { value: 'needs_review', label: '검토 대기' },
  { value: 'canonical', label: '대표(canonical)' },
  { value: 'candidate', label: '후보' },
  { value: 'deprecated', label: '반려' },
  { value: 'all', label: '전체' },
];

export default function DescriptionReviewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DescriptionReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('needs_review');
  const [multiManuf, setMultiManuf] = useState(false);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<BulkCanonicalDryRunResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDescriptionReviews({
        status,
        sourceType: 'mfds_easy_drug',
        q: q || undefined,
        multiManufacturer: multiManuf || undefined,
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
  }, [status, q, multiManuf, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getBulkCanonicalDryRun('mfds_easy_drug').then(setDryRun).catch(() => setDryRun(null));
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(term.trim());
  };

  return (
    <div>
      {dryRun && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-gray-700">
          <div className="flex items-center gap-2 font-medium text-blue-800 mb-1">
            <CheckCircle2 className="w-4 h-4" /> 대량 canonical 후보 (dry-run · 자동 승격 없음)
          </div>
          검토 대기 <b>{dryRun.totalNeedsReview.toLocaleString()}</b>건 중 안전 후보{' '}
          <b>{dryRun.eligibleForBulkCanonical.toLocaleString()}</b>건 · 제외: 다제조사{' '}
          {dryRun.excludedMultiManufacturer.toLocaleString()} / 기존 canonical{' '}
          {dryRun.excludedExistingCanonical.toLocaleString()} / 빈 내용{' '}
          {dryRun.excludedEmptyContent.toLocaleString()}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={multiManuf} onChange={(e) => { setMultiManuf(e.target.checked); setPage(1); }} />
          다제조사만
        </label>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="상품명 / MFDS코드 / 바코드"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
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
              <Th>대표상품명</Th>
              <Th>상품명(SKU)</Th>
              <Th>제조사</Th>
              <Th>MFDS코드</Th>
              <Th>상태</Th>
              <Th>플래그</Th>
              <Th>수정일</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">표시할 설명이 없습니다</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(r.id)} className="hover:bg-blue-50 cursor-pointer">
                  <Td className="font-medium text-gray-900">{r.representativeName || '—'}</Td>
                  <Td>{r.masterName || '—'}</Td>
                  <Td>{r.manufacturerName || '—'}</Td>
                  <Td className="text-gray-500">{r.mfdsCode || '—'}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    <div className="flex gap-1">
                      {r.multiManufacturer && <Flag>다제조사</Flag>}
                      {r.multiName && <Flag>다품명</Flag>}
                      {r.hasRepresentativeImage && <Flag tone="green">이미지</Flag>}
                    </div>
                  </Td>
                  <Td className="text-gray-400">{r.updatedAt?.slice(0, 10) || '—'}</Td>
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

function Flag({ children, tone = 'amber' }: { children: React.ReactNode; tone?: 'amber' | 'green' }) {
  const cls = tone === 'green' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200';
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border ${cls}`}>{tone === 'amber' && <AlertTriangle className="w-3 h-3" />}{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle whitespace-nowrap ${className}`}>{children}</td>;
}
