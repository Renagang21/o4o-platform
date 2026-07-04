/**
 * ProductCandidatesPage — 공공데이터 후보 목록 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * ProductCandidate 목록 조회 + 필터(status/matchStatus/sourceType) + 서버 페이지네이션.
 * mutation 없음. 후보 API 는 all=true(platform cross-service) 로 조회한다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProductCandidates, ProductCandidateRow } from '@/api/o4o-product-db.api';

const STATUS_OPTIONS = [
  'pending', 'reviewing', 'matched', 'linked',
  'approved_new_master', 'rejected', 'merged', 'archived',
];
const MATCH_STATUS_OPTIONS = [
  'unmatched', 'exact_identifier_match', 'possible_identifier_match',
  'possible_text_match', 'conflict', 'no_match', 'manually_matched',
];
const SOURCE_TYPE_OPTIONS = [
  'supplier_web', 'pharmacy_web', 'store_web', 'mobile_draft',
  'csv_import', 'xlsx_import', 'operator_import', 'external_api', 'unknown',
];

const LIMIT = 20;

export default function ProductCandidatesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductCandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [matchStatus, setMatchStatus] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProductCandidates({
        status: status || undefined,
        matchStatus: matchStatus || undefined,
        sourceType: sourceType || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '후보 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, matchStatus, sourceType, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(1);
    setter(e.target.value);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={onFilterChange(setStatus)} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={matchStatus} onChange={onFilterChange(setMatchStatus)} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">전체 매칭</option>
          {MATCH_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={sourceType} onChange={onFilterChange(setSourceType)} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">전체 source</option>
          {SOURCE_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="ml-auto text-sm text-gray-500 self-center">총 {total.toLocaleString()}건</div>
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
              <Th>제조/업체</Th>
              <Th>분류</Th>
              <Th>source</Th>
              <Th>식별자</Th>
              <Th>후보 상태</Th>
              <Th>매칭 상태</Th>
              <Th>생성일</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">아직 표시할 데이터가 없습니다</td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(r.id)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <Td className="font-medium text-gray-900">{r.candidateName || '—'}</Td>
                  <Td>{r.candidateManufacturer || '—'}</Td>
                  <Td>{r.candidateCategory || '—'}</Td>
                  <Td>
                    <div>{r.sourceType}</div>
                    {r.sourceLabel && <div className="text-xs text-gray-400">{r.sourceLabel}</div>}
                  </Td>
                  <Td>
                    {r.identifierType ? (
                      <div>
                        <div className="text-xs text-gray-400">{r.identifierType}</div>
                        <div>{r.identifierValue}</div>
                      </div>
                    ) : '—'}
                  </Td>
                  <Td><Badge value={r.candidateStatus} /></Td>
                  <Td><Badge value={r.matchStatus} /></Td>
                  <Td className="text-gray-500">{formatDate(r.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">{page} / {totalPages} 페이지</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40"
          >이전</button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40"
          >다음</button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top whitespace-nowrap ${className}`}>{children}</td>;
}
function Badge({ value }: { value: string }) {
  return <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{value}</span>;
}
function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}
