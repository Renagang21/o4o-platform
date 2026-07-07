/**
 * DrugDescriptionDraftsPage — OTC 의약품 설명 초안(draft) 검토 목록 (read-only)
 *
 * WO-O4O-ADMIN-O4O-DRUG-DESCRIPTION-DRAFT-REVIEW-SHELL-V1
 *
 * product_candidate_description_drafts (source_label=MFDS_DRUG_OTC) 검토 대기 draft 목록.
 * verdict/상태/검색 필터(모두 GET query param). row → draft 상세(read-only).
 * 승인·반려·수정·삭제 mutation 없음. review_status 변경 없음.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listDrugDescriptionDrafts, DrugDescriptionDraftRow } from '@/api/o4o-product-db.api';

const LIMIT = 20;
const DEFAULT_SOURCE_LABEL = 'MFDS_DRUG_OTC';

const VERDICT_OPTIONS = [
  { value: 'all', label: 'verdict 전체' },
  { value: 'INSERT_auto', label: '자동' },
  { value: 'INSERT_review_flag', label: '약사검토강화' },
  { value: 'INSERT_low_ground_flag', label: '저 grounding' },
  { value: 'INSERT_rx_minor_flag', label: 'RX 소수혼입' },
  { value: 'INSERT_manual_flag', label: '수동큐레이션' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '상태 전체' },
  { value: 'needs_review', label: '검토 대기' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '반려' },
  { value: 'hidden', label: '숨김' },
  { value: 'deprecated', label: '폐기' },
];

export default function DrugDescriptionDraftsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DrugDescriptionDraftRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState('all');
  const [status, setStatus] = useState('all');
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDrugDescriptionDrafts({
        sourceLabel: DEFAULT_SOURCE_LABEL,
        verdict: verdict === 'all' ? undefined : verdict,
        reviewStatus: status === 'all' ? undefined : status,
        q: q || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '설명 초안 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [verdict, status, q, page]);

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
        이 화면은 OTC 설명 <b>초안(draft)</b>을 조회하는 read-only 검토 화면입니다. 목록/상세 모두 read-only이며
        승인·반려·수정·삭제, 공식 설명(SharedProductDescription) 승격 기능은 제공하지 않습니다.
        각 초안은 <b>성분·함량·제형 그룹 1건</b>이며 여러 포장단위(SKU)를 대표합니다.
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={verdict} onChange={(e) => { setVerdict(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {VERDICT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="그룹명 / 성분 / groupKey / candidate id"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
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
              <Th>그룹명</Th>
              <Th>verdict</Th>
              <Th>상태</Th>
              <Th>SKU(master)</Th>
              <Th>OTC/RX</Th>
              <Th>제조사</Th>
              <Th>e약은요 중복</Th>
              <Th>효능(미리보기)</Th>
              <Th>생성일</Th>
              <Th>상세</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">현재 조건에 맞는 설명 초안이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/admin/o4o-product-db/drug-description-drafts/${r.id}`)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <Td className="font-medium text-gray-900 max-w-xs truncate">{r.title || r.groupKey || '—'}</Td>
                  <Td><VerdictBadge verdict={r.verdict} /></Td>
                  <Td><StatusBadge status={r.reviewStatus} /></Td>
                  <Td className="text-gray-600">{r.masterTotal ?? '—'}</Td>
                  <Td className="text-gray-600">{r.otc ?? '—'}/{r.rx ?? 0}</Td>
                  <Td className="text-gray-500">{r.manufacturers ?? '—'}</Td>
                  <Td className="text-gray-500">{r.spdMasters != null && r.spdMasters > 0 ? `${r.spdMasters}건` : '—'}</Td>
                  <Td className="max-w-[18rem]"><span className="block truncate text-gray-600">{r.efficacyPreview || '—'}</span></Td>
                  <Td className="text-gray-400">{r.createdAt?.slice(0, 10) || '—'}</Td>
                  <Td className="text-admin-blue whitespace-nowrap">초안 상세 →</Td>
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

const VERDICT_LABEL: Record<string, { label: string; cls: string }> = {
  INSERT_auto: { label: '자동', cls: 'bg-green-100 text-green-700' },
  INSERT_review_flag: { label: '검토강화', cls: 'bg-amber-100 text-amber-700' },
  INSERT_low_ground_flag: { label: '저 grounding', cls: 'bg-orange-100 text-orange-700' },
  INSERT_rx_minor_flag: { label: 'RX 혼입', cls: 'bg-red-100 text-red-600' },
  INSERT_manual_flag: { label: '수동', cls: 'bg-purple-100 text-purple-700' },
};
function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-gray-400">—</span>;
  const m = VERDICT_LABEL[verdict] ?? { label: verdict, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    needs_review: { label: '검토 대기', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: '승인', cls: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', cls: 'bg-red-100 text-red-600' },
    hidden: { label: '숨김', cls: 'bg-gray-100 text-gray-500' },
    deprecated: { label: '폐기', cls: 'bg-gray-100 text-gray-500' },
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
