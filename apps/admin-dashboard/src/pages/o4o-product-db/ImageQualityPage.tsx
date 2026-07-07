/**
 * ImageQualityPage — 기본상품(master) 이미지 상태 점검 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1
 *
 * 이미지 있음/없음/대표 여부를 master 축으로 조회. 썸네일 미리보기(onError fallback).
 * 이미지 업로드/교체/삭제·AI 보정 없음(GET-only). ProductMaster 상세로 이동만.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ImageOff } from 'lucide-react';
import { listImageQuality, getImageQualitySummary, ImageQualityRow } from '@/api/o4o-product-db.api';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: '이미지 상태 전체' },
  { value: 'has_representative_image', label: '대표 이미지 있음' },
  { value: 'has_images_no_representative', label: '이미지 있음·대표 없음' },
  { value: 'missing_image', label: '이미지 없음' },
];

const REGULATORY_OPTIONS = [
  { value: 'all', label: '규제구분 전체' },
  { value: 'DRUG', label: '의약품' },
  { value: 'MEDICAL_DEVICE', label: '의료기기' },
  { value: 'QUASI_DRUG', label: '의약외품' },
  { value: 'HEALTH_FUNCTIONAL_FOOD', label: '건강기능식품' },
  { value: 'GENERAL', label: '일반' },
];

export default function ImageQualityPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ImageQualityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [imageStatus, setImageStatus] = useState('all');
  const [regulatoryType, setRegulatoryType] = useState('all');
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getImageQualitySummary().then(setSummary).catch(() => setSummary({}));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listImageQuality({
        imageStatus: imageStatus === 'all' ? undefined : imageStatus,
        regulatoryType: regulatoryType === 'all' ? undefined : regulatoryType,
        q: q || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '이미지 상태 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [imageStatus, regulatoryType, q, page]);

  useEffect(() => { load(); }, [load]);

  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setQ(term.trim()); };
  const resetPage = () => setPage(1);

  return (
    <div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
        기본상품(ProductMaster) 이미지 상태를 조회하는 read-only 점검 화면입니다. 대표 이미지 유무·이미지 수·썸네일을
        확인하고 보강 대상을 파악합니다. 이미지 업로드·교체·삭제·보정 기능은 제공하지 않습니다.
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <SummaryPill label="대표 이미지 있음" value={summary.has_representative_image} cls="bg-green-100 text-green-700" onClick={() => { setImageStatus('has_representative_image'); resetPage(); }} />
        <SummaryPill label="대표 없음(이미지만)" value={summary.has_images_no_representative} cls="bg-amber-100 text-amber-700" onClick={() => { setImageStatus('has_images_no_representative'); resetPage(); }} />
        <SummaryPill label="이미지 없음" value={summary.missing_image} cls="bg-gray-100 text-gray-600" onClick={() => { setImageStatus('missing_image'); resetPage(); }} />
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={imageStatus} onChange={(e) => { setImageStatus(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={regulatoryType} onChange={(e) => { setRegulatoryType(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {REGULATORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="상품명 / 제조사 / 바코드 / master id" className="border border-gray-300 rounded px-3 py-2 text-sm w-72" />
          <button type="submit" className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm"><Search className="w-4 h-4" /> 검색</button>
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
              <Th>대표 이미지</Th>
              <Th>상품명</Th>
              <Th>제조사</Th>
              <Th>규제구분</Th>
              <Th>바코드</Th>
              <Th>이미지 상태</Th>
              <Th>이미지 수</Th>
              <Th>출처</Th>
              <Th>최근 수정</Th>
              <Th>상세</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">현재 조건에 맞는 상품이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.masterId} onClick={() => navigate(`/admin/o4o-product-db/masters/${r.masterId}`)} className="hover:bg-blue-50 cursor-pointer">
                  <Td><Thumb url={r.thumbnailUrl} /></Td>
                  <Td className="font-medium text-gray-900 max-w-xs truncate">{r.productName || '—'}</Td>
                  <Td className="max-w-[10rem] truncate text-gray-500">{r.manufacturerName || '—'}</Td>
                  <Td className="text-gray-500">{regulatoryLabel(r.regulatoryType)}</Td>
                  <Td className="text-gray-400 font-mono text-xs">{r.barcode || '—'}</Td>
                  <Td><ImageStatusBadge status={r.imageStatus} /></Td>
                  <Td className="text-center text-gray-600">{r.imageCount}</Td>
                  <Td className="text-gray-500 text-xs">{r.thumbnailType || '—'}</Td>
                  <Td className="text-gray-400">{r.imageUpdatedAt?.slice(0, 10) || '—'}</Td>
                  <Td className="text-admin-blue whitespace-nowrap">상품 상세 →</Td>
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

function Thumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-300" title={url ? '이미지를 불러올 수 없음' : '이미지 없음'}>
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }
  return <img src={url} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" loading="lazy" onError={() => setBroken(true)} />;
}

const REGULATORY_LABEL: Record<string, string> = {
  DRUG: '의약품', MEDICAL_DEVICE: '의료기기', HEALTH_FUNCTIONAL_FOOD: '건강기능식품', QUASI_DRUG: '의약외품', GENERAL: '일반',
};
function regulatoryLabel(v: string | null): string {
  if (!v) return '—';
  return REGULATORY_LABEL[v] ?? v;
}

function ImageStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    has_representative_image: { label: '대표 있음', cls: 'bg-green-100 text-green-700' },
    has_images_no_representative: { label: '대표 없음', cls: 'bg-amber-100 text-amber-700' },
    missing_image: { label: '없음', cls: 'bg-gray-100 text-gray-500' },
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
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle whitespace-nowrap ${className}`}>{children}</td>;
}
