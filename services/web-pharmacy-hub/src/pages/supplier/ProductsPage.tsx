/**
 * ProductsPage (공급자) — 내 상품의 Pharmacy-Hub 제공 설정
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-C
 *
 * 범위: 기존 상품 조회 + Pharmacy-Hub 제공 시작/중지 + 서비스별 공급가.
 * 신규 상품 등록·수정은 여기서 하지 않는다 — 기존 Neture 공급자 원장이 담당한다 (§9).
 * 운영자 상품 승인 개념이 없으므로 제공 시작 즉시 약국 경영자에게 노출된다 (§4.5).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { BRAND } from '../../config/service';

interface OfferRow {
  offerId: string;
  masterId: string;
  name: string | null;
  barcode: string | null;
  manufacturerName: string | null;
  regulatoryType: string | null;
  isRegulated: boolean;
  priceGeneral: number;
  isActive: boolean;
  approvalStatus: string;
  distributionType: string;
  serviceKeys: string[] | null;
  deliveredToPharmacyHub: boolean;
  pharmacyHubUnitPrice: number | null;
  effectiveUnitPrice: number | null;
  imageUrl: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const FILTER_TABS = [
  { value: '', label: '전체' },
  { value: 'true', label: '제공 중' },
  { value: 'false', label: '미제공' },
];

const won = (v: number | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-';

export default function SupplierProductsPage() {
  const [delivered, setDelivered] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OfferRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pharmacy-hub/supplier/products', {
        params: { delivered: delivered || undefined, q: q || undefined, page, limit: 20 },
      });
      setItems(res.data?.data?.items ?? []);
      setPagination(res.data?.data?.pagination ?? null);
    } catch {
      setError('상품 목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [delivered, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDelivery = async (row: OfferRow, enabled: boolean) => {
    setBusyId(row.offerId);
    setError(null);
    setNotice(null);
    try {
      const raw = priceDraft[row.offerId];
      const parsed = raw !== undefined && raw !== '' ? Number(raw) : undefined;
      if (parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0)) {
        setError('공급가가 올바르지 않습니다.');
        return;
      }
      const res = await api.patch(`/pharmacy-hub/supplier/products/${row.offerId}/delivery`, {
        enabled,
        ...(enabled && parsed !== undefined ? { unitPrice: parsed } : {}),
      });
      setNotice(
        enabled
          ? `${row.name ?? '상품'} 을(를) ${BRAND.name} 에 제공 시작했습니다.`
          : `${row.name ?? '상품'} 의 ${BRAND.name} 제공을 중지했습니다.`,
      );
      // 다른 서비스 키 보존 확인용 — 서버가 돌려준 최종 serviceKeys 를 그대로 반영한다.
      const next = res.data?.data?.serviceKeys as string[] | undefined;
      setItems((prev) =>
        prev.map((it) =>
          it.offerId === row.offerId
            ? {
                ...it,
                deliveredToPharmacyHub: enabled,
                serviceKeys: next ?? it.serviceKeys,
                pharmacyHubUnitPrice:
                  (res.data?.data?.unitPrice as number | null) ?? it.pharmacyHubUnitPrice,
              }
            : it,
        ),
      );
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? '제공 설정 변경에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 상품 제공 설정</h1>
      <p className="mb-6 text-sm text-gray-500">
        이미 등록한 상품을 {BRAND.name} 제공 대상으로 선택합니다. 제공 시작 시 운영자 상품 승인 없이
        {BRAND.name} 약국 경영자에게 바로 노출됩니다. 상품 등록·수정은 공급자 원장에서 진행합니다.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => {
              setDelivered(tab.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              delivered === tab.value
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
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품명 · 바코드 검색"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            검색
          </button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-primary-600">{notice}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">상품</th>
              <th className="px-3 py-2">식별정보</th>
              <th className="px-3 py-2 text-right">기본 공급가</th>
              <th className="px-3 py-2 text-right">{BRAND.name} 공급가</th>
              <th className="px-3 py-2">활성</th>
              <th className="px-3 py-2">제공 상태</th>
              <th className="px-3 py-2 text-right">처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  불러오는 중…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  {delivered === 'true'
                    ? `${BRAND.name} 에 제공 중인 상품이 없습니다.`
                    : '등록된 상품이 없습니다. 공급자 원장에서 상품을 먼저 등록해 주세요.'}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.offerId} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.name ?? '-'}</span>
                    <span className="block text-xs text-gray-400">
                      {row.manufacturerName ?? '-'}
                      {row.isRegulated && (
                        <span className="ml-1 rounded bg-amber-50 px-1 text-amber-700">규제 상품</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {row.barcode ?? '바코드 없음'}
                    <span className="block">{row.regulatoryType ?? '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{won(row.priceGeneral)}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      inputMode="numeric"
                      value={priceDraft[row.offerId] ?? (row.pharmacyHubUnitPrice ?? '')}
                      onChange={(e) =>
                        setPriceDraft((prev) => ({ ...prev, [row.offerId]: e.target.value }))
                      }
                      placeholder="기본 공급가 사용"
                      className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                    />
                    <span className="mt-1 block text-xs text-gray-400">
                      적용 {won(row.pharmacyHubUnitPrice ?? row.priceGeneral)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.isActive ? (
                      <span className="text-gray-600">활성</span>
                    ) : (
                      <span className="text-amber-700">비활성 — 노출되지 않습니다</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.deliveredToPharmacyHub ? (
                      <span className="text-primary-600">제공 중</span>
                    ) : (
                      <span className="text-gray-400">미제공</span>
                    )}
                    <span className="block text-gray-400">
                      전체 서비스 {(row.serviceKeys ?? []).length}개
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.deliveredToPharmacyHub ? (
                      <button
                        type="button"
                        disabled={busyId === row.offerId}
                        onClick={() => void setDelivery(row, false)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        제공 중지
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === row.offerId}
                        onClick={() => void setDelivery(row, true)}
                        className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        제공 시작
                      </button>
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
        <Link to="/supplier" className="text-gray-500 underline">
          공급자 홈
        </Link>
      </p>
    </div>
  );
}
