/**
 * ProductMastersPage — 기본 상품 목록/검색 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * ProductMaster 목록/검색 + 서버 페이지네이션(meta 사용).
 * 관리 콘솔 컬럼: 이미지/상품명/공식명/제조사/브랜드/분류/규격/바코드/이미지 상태.
 * 검증: 목록 응답에는 regulatoryType·설명 상태가 없어 목록 컬럼에서 제외 (상세에만 표시).
 * WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1. mutation 없음 (GET-only).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listProductMasters, ProductMasterRow } from '@/api/o4o-product-db.api';

const LIMIT = 20;

export default function ProductMastersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductMasterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');   // 입력 중인 검색어
  const [q, setQ] = useState('');         // 실제 적용된 검색어
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProductMasters({ q: q || undefined, page, limit: LIMIT });
      setRows(res.items);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '기본 상품을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(term.trim());
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="상품명 / 바코드 / 제조사"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm">
            <Search className="w-4 h-4" /> 검색
          </button>
          {q && (
            <button
              type="button"
              onClick={() => { setTerm(''); setQ(''); setPage(1); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2"
            >초기화</button>
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
              <Th>이미지</Th>
              <Th>상품명</Th>
              <Th>공식명</Th>
              <Th>제조사</Th>
              <Th>브랜드</Th>
              <Th>분류</Th>
              <Th>규격</Th>
              <Th>바코드</Th>
              <Th>이미지 상태</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">아직 표시할 데이터가 없습니다</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(r.id)} className="hover:bg-blue-50 cursor-pointer">
                  <Td>
                    {r.primaryImageUrl
                      ? <img src={r.primaryImageUrl} alt="" className="w-10 h-10 object-cover rounded" />
                      : <div className="w-10 h-10 bg-gray-100 rounded" />}
                  </Td>
                  <Td className="font-medium text-gray-900">{r.name || '—'}</Td>
                  <Td>{r.regulatoryName || '—'}</Td>
                  <Td>{r.manufacturerName || '—'}</Td>
                  <Td>{r.brand?.name || '—'}</Td>
                  <Td>{r.category?.name || '—'}</Td>
                  <Td>{r.specification || '—'}</Td>
                  <Td className="text-gray-500">{r.barcode || '—'}</Td>
                  <Td>
                    {r.primaryImageUrl
                      ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">있음</span>
                      : <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">없음</span>}
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
  return <td className={`px-4 py-3 align-middle whitespace-nowrap ${className}`}>{children}</td>;
}
