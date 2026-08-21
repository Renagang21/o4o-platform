/**
 * SupplierServiceDeliveryPage — 서비스 제공 설정 (공급자 직접 opt-in)
 *
 * WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1
 *
 * 공급자는 Neture 에서만 활동한다. Pharmacy-Hub 같은 **운영자 공급 승인이 없는 서비스**에
 * 대한 제공 시작/중지·서비스별 공급가를 여기에서 설정한다.
 * (이 화면은 web-pharmacy-hub 의 공급자 상품 화면을 Neture 로 옮긴 것이다 —
 *  Pharmacy-Hub 에는 공급자 회원·shell 이 존재하지 않는다.)
 *
 * 범위: 이미 등록한 상품의 제공 설정만. 상품 등록·수정은 `/supplier/products` 가 담당한다.
 * 계약: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §3
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  SUPPLIER_OPTIN_SERVICES,
  isSupplierOptinService,
  supplierServiceDeliveryApi,
} from '../../lib/api/supplierServiceDelivery';
import type {
  ServiceDeliveryOfferRow,
  ServiceDeliveryPagination,
} from '../../lib/api/supplierServiceDelivery';

const FILTER_TABS = [
  { value: '', label: '전체' },
  { value: 'true', label: '제공 중' },
  { value: 'false', label: '미제공' },
];

const won = (v: number | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-';

export default function SupplierServiceDeliveryPage() {
  const { serviceKey = '' } = useParams<{ serviceKey: string }>();
  const meta = SUPPLIER_OPTIN_SERVICES.find((s) => s.key === serviceKey);
  const label = meta?.label ?? serviceKey;

  const [delivered, setDelivered] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ServiceDeliveryOfferRow[]>([]);
  const [pagination, setPagination] = useState<ServiceDeliveryPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});

  const supported = isSupplierOptinService(serviceKey);

  const load = useCallback(async () => {
    if (!supported) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await supplierServiceDeliveryApi.listProducts(serviceKey, {
      delivered,
      q,
      page,
      limit: 20,
    });
    if (!res.success || !res.data) {
      // 조회 실패를 빈 목록으로 삼키지 않는다 (Load-Error 계약).
      setError(res.error ?? '상품 목록을 불러오지 못했습니다.');
      setItems([]);
      setPagination(null);
    } else {
      setItems(res.data.items ?? []);
      setPagination(res.data.pagination ?? null);
    }
    setLoading(false);
  }, [supported, serviceKey, delivered, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDelivery = async (row: ServiceDeliveryOfferRow, enabled: boolean) => {
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
      const res = await supplierServiceDeliveryApi.setDelivery(serviceKey, row.offerId, {
        enabled,
        ...(enabled && parsed !== undefined ? { unitPrice: parsed } : {}),
      });
      if (!res.success || !res.data) {
        setError(res.error ?? '제공 설정 변경에 실패했습니다.');
        return;
      }
      const result = res.data;
      setNotice(
        enabled
          ? `${row.name ?? '상품'} 을(를) ${label} 에 제공 시작했습니다.`
          : `${row.name ?? '상품'} 의 ${label} 제공을 중지했습니다.`,
      );
      // 다른 서비스 키 보존 확인용 — 서버가 돌려준 최종 serviceKeys 를 그대로 반영한다.
      setItems((prev) =>
        prev.map((it) =>
          it.offerId === row.offerId
            ? {
                ...it,
                delivered: enabled,
                serviceKeys: result.serviceKeys ?? it.serviceKeys,
                serviceUnitPrice: result.unitPrice ?? it.serviceUnitPrice,
              }
            : it,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!supported) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">서비스 제공 설정</h1>
        <p className="mt-2 text-sm text-slate-600">
          공급자가 직접 제공 설정을 할 수 있는 서비스가 아닙니다. KPA Society · GlycoPharm ·
          K-Cosmetics 는 운영자 승인 축이므로 제품 목록의 유통 정책에서 신청합니다.
        </p>
        <Link
          to="/supplier/supply-offers"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          공급 오퍼로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{label} 제공 설정</h1>
        <p className="mt-1 text-sm text-slate-500">
          {meta?.description ?? '이미 등록한 상품을 이 서비스 제공 대상으로 선택합니다.'} 상품
          등록·수정은{' '}
          <Link to="/supplier/products" className="text-blue-600 hover:text-blue-700">
            제품 목록
          </Link>
          에서 진행합니다.
        </p>
      </div>

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
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-600'
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
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            검색
          </button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-blue-600">{notice}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">상품</th>
              <th className="px-3 py-2">식별정보</th>
              <th className="px-3 py-2 text-right">기본 공급가</th>
              <th className="px-3 py-2 text-right">{label} 공급가</th>
              <th className="px-3 py-2">활성</th>
              <th className="px-3 py-2">제공 상태</th>
              <th className="px-3 py-2 text-right">처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  불러오는 중…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  {error
                    ? '목록을 표시할 수 없습니다.'
                    : delivered === 'true'
                      ? `${label} 에 제공 중인 상품이 없습니다.`
                      : '등록된 상품이 없습니다. 제품 목록에서 상품을 먼저 등록해 주세요.'}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.offerId} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.name ?? '-'}</span>
                    <span className="block text-xs text-slate-400">
                      {row.manufacturerName ?? '-'}
                      {row.isRegulated && (
                        <span className="ml-1 rounded bg-amber-50 px-1 text-amber-700">
                          규제 상품
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {row.barcode ?? '바코드 없음'}
                    <span className="block">{row.regulatoryType ?? '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{won(row.priceGeneral)}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      inputMode="numeric"
                      value={priceDraft[row.offerId] ?? (row.serviceUnitPrice ?? '')}
                      onChange={(e) =>
                        setPriceDraft((prev) => ({ ...prev, [row.offerId]: e.target.value }))
                      }
                      placeholder="기본 공급가 사용"
                      className="w-32 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                      적용 {won(row.serviceUnitPrice ?? row.priceGeneral)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.isActive ? (
                      <span className="text-slate-600">활성</span>
                    ) : (
                      <span className="text-amber-700">비활성 — 노출되지 않습니다</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.delivered ? (
                      <span className="text-blue-600">제공 중</span>
                    ) : (
                      <span className="text-slate-400">미제공</span>
                    )}
                    <span className="block text-slate-400">
                      전체 서비스 {(row.serviceKeys ?? []).length}개
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.delivered ? (
                      <button
                        type="button"
                        disabled={busyId === row.offerId}
                        onClick={() => void setDelivery(row, false)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        제공 중지
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === row.offerId}
                        onClick={() => void setDelivery(row, true)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
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
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-slate-500">
            {pagination.page} / {pagination.totalPages} (총 {pagination.total}건)
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
