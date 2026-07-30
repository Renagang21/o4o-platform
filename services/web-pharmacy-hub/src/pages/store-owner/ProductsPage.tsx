/**
 * ProductsPage (약국 경영자) — Pharmacy-Hub 제공 상품 목록
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-E
 *
 * 범위: 목록 / 검색 / 분류·공급자 필터 / 페이지네이션 / 상세 진입.
 * 담기 · 바로주문 · 결제 · 취급상품 등록 · 콘텐츠 가져오기 · 이벤트 오퍼는 이번 WO 범위 밖 (§9).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { BRAND } from '../../config/service';

interface ProductRow {
  offerId: string;
  masterId: string;
  name: string | null;
  barcode: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  regulatoryType: string | null;
  isRegulated: boolean;
  categoryName: string | null;
  supplierId: string;
  supplierName: string;
  priceGeneral: number;
  pharmacyHubUnitPrice: number | null;
  effectiveUnitPrice: number;
  imageUrl: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** 상품 분류 = 규제 유형 축 (약국 맥락에서 의미 있는 분류) */
const REGULATORY_TABS = [
  { value: '', label: '전체' },
  { value: 'DRUG', label: '의약품' },
  { value: 'HEALTH_FUNCTIONAL', label: '건강기능식품' },
  { value: 'QUASI_DRUG', label: '의약외품' },
  { value: 'COSMETIC', label: '화장품' },
  { value: 'GENERAL', label: '일반' },
];

const won = (v: number | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-';

export default function StoreOwnerProductsPage() {
  const [regulatoryType, setRegulatoryType] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProductRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pharmacy-hub/store-owner/products', {
        params: {
          q: q || undefined,
          regulatoryType: regulatoryType || undefined,
          supplierId: supplierId || undefined,
          page,
          limit: 20,
        },
      });
      setItems(res.data?.data?.items ?? []);
      setPagination(res.data?.data?.pagination ?? null);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(
        status === 403
          ? `${BRAND.name} 약국 경영자 승인이 완료된 계정만 상품을 조회할 수 있습니다.`
          : '상품 목록을 불러오지 못했습니다.',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, regulatoryType, supplierId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const suppliers = Array.from(
    new Map(items.map((it) => [it.supplierId, it.supplierName])).entries(),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 공급 상품</h1>
      <p className="mb-6 text-sm text-gray-500">
        공급자가 {BRAND.name} 에 제공한 상품입니다. 주문·장바구니는 후속 단계에서 연결됩니다.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {REGULATORY_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => {
              setRegulatoryType(tab.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              regulatoryType === tab.value
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-300 bg-white text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">공급자 전체</option>
            {suppliers.map(([id, nm]) => (
              <option key={id} value={id}>
                {nm}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품명 · 바코드 · 제조사"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            검색
          </button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">상품</th>
              <th className="px-3 py-2">분류</th>
              <th className="px-3 py-2">공급자</th>
              <th className="px-3 py-2 text-right">공급가</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  불러오는 중…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  {q || regulatoryType || supplierId
                    ? '조건에 맞는 상품이 없습니다.'
                    : `아직 ${BRAND.name} 에 제공된 상품이 없습니다.`}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.offerId} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <Link
                      to={`/store-owner/products/${row.offerId}`}
                      className="font-medium text-primary-600 underline"
                    >
                      {row.name ?? '-'}
                    </Link>
                    <span className="block text-xs text-gray-400">
                      {row.manufacturerName ?? '-'} · {row.barcode ?? '바코드 없음'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.categoryName ?? row.regulatoryType ?? '-'}
                    {row.isRegulated && (
                      <span className="ml-1 rounded bg-amber-50 px-1 text-amber-700">규제</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{row.supplierName}</td>
                  <td className="px-3 py-2 text-right">
                    {won(row.effectiveUnitPrice)}
                    {row.pharmacyHubUnitPrice != null && (
                      <span className="block text-xs text-gray-400">서비스 공급가 적용</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-gray-500">
            {pagination.page} / {pagination.totalPages} (총 {pagination.total}건)
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link to="/store-owner" className="text-gray-500 underline">
          약국 경영자 홈
        </Link>
      </p>
    </div>
  );
}
