/**
 * ProductCandidatesPage — 공공데이터 후보 목록 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * ProductCandidate 목록 조회 + 필터(status/matchStatus/sourceType) + 서버 페이지네이션.
 * mutation 없음. 후보 API 는 all=true(platform cross-service) 로 조회한다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listProductCandidates, ProductCandidateRow } from '@/api/o4o-product-db.api';

// 공공 seed 라벨 프리셋 (external_api 후보 분리용 — 직접 입력도 가능)
const SOURCE_LABEL_PRESETS = [
  'MFDS_HEALTH_FUNCTIONAL_FOOD',
  'MFDS_EASY_DRUG_INFO',
  'MFDS_QUASI_DRUG_PERMIT',
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ProductCandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [matchStatus, setMatchStatus] = useState(searchParams.get('matchStatus') || '');
  const [sourceType, setSourceType] = useState(searchParams.get('sourceType') || '');
  // committed(쿼리에 반영되는) source_label / search 와 입력 버퍼 분리 — 타이핑마다 조회 방지
  const [sourceLabel, setSourceLabel] = useState(searchParams.get('sourceLabel') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sourceLabelInput, setSourceLabelInput] = useState(sourceLabel);
  const [searchInput, setSearchInput] = useState(search);
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
        sourceLabel: sourceLabel || undefined,
        search: search || undefined,
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
  }, [status, matchStatus, sourceType, sourceLabel, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // URL query sync (공유/새로고침/뒤로가기 유지) — 기본값은 생략
  useEffect(() => {
    const q: Record<string, string> = {};
    if (status) q.status = status;
    if (matchStatus) q.matchStatus = matchStatus;
    if (sourceType) q.sourceType = sourceType;
    if (sourceLabel) q.sourceLabel = sourceLabel;
    if (search) q.search = search;
    if (page > 1) q.page = String(page);
    setSearchParams(q, { replace: true });
  }, [status, matchStatus, sourceType, sourceLabel, search, page, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(1);
    setter(e.target.value);
  };

  // source_label + search 는 폼 제출(Enter / 버튼) 시에만 commit
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSourceLabel(sourceLabelInput.trim());
    setSearch(searchInput.trim());
  };
  const onSearchReset = () => {
    setPage(1);
    setSourceLabelInput('');
    setSearchInput('');
    setSourceLabel('');
    setSearch('');
  };

  return (
    <div>
      {/* 유입 확인용 안내 (정비 action 화면 아님) — WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1 */}
      <div className="mb-4 text-sm text-gray-600 bg-blue-50/60 border border-blue-100 rounded p-3">
        공공데이터, import, 공급자/매장 입력 등에서 들어온 상품 후보를 확인합니다.
        현재 화면에서는 후보를 승격하거나 삭제하지 않습니다.
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
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

        {/* source_label(공공 seed 라벨) + 검색 — 폼 제출 시에만 commit */}
        <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2 items-center">
          <input
            list="source-label-presets"
            value={sourceLabelInput}
            onChange={(e) => setSourceLabelInput(e.target.value)}
            placeholder="source_label (예: MFDS_HEALTH_FUNCTIONAL_FOOD)"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <datalist id="source-label-presets">
            {SOURCE_LABEL_PRESETS.map((o) => <option key={o} value={o} />)}
          </datalist>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상품명 / 업체명 / 식별번호(STTEMNT_NO) 검색"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 hover:bg-gray-100">검색</button>
          {(sourceLabel || search) && (
            <button type="button" onClick={onSearchReset} className="px-3 py-2 text-sm text-gray-500 underline">초기화</button>
          )}
        </form>

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
