/**
 * HandledProductsPage (약국 경영자) — 매장 경영활용 제품
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
 *
 * 축 구분 (합치지 않는다)
 *   /store-owner/products         공급 상품 — 공급자가 제공한 B2B 구매 대상
 *   /store-owner/handled-products 매장 경영활용 제품 — 약국이 취급하기로 한 O4O 제품 (이 화면)
 *   /store-owner/local-products   매장 자체 상품 — O4O 무관 직접 등록
 *
 * 주문 완료 상품이 자동으로 이 목록에 들어오지 않는다. 등록은 이 화면의 명시적 행위다.
 * 조직은 서버가 결정한다 — 화면은 organizationId 를 보내지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import {
  fetchHandledProducts,
  applyHandledProduct,
  setHandledProductActive,
  removeHandledProducts,
  type HandledProduct,
  type HandledProductSource,
  type HandledStoreConnection,
} from '../../lib/api/pharmacyHubHandledProducts';
import { StoreConnectionNotice } from '../../components/store-owner/StoreConnectionNotice';

const PAGE_SIZE = 20;

const SOURCE_TABS: Array<{ value: 'all' | HandledProductSource; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'listing', label: 'O4O 기반 제품' },
  { value: 'local', label: '매장 자체 상품' },
];

const won = (v: number | null) => (typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-');
const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
};

/** 행 식별 키 — sourceType + sourceId 조합(교차 소스 유일). */
const rowKey = (it: Pick<HandledProduct, 'sourceType' | 'sourceId'>) => `${it.sourceType}:${it.sourceId}`;

export default function StoreOwnerHandledProductsPage() {
  const [source, setSource] = useState<'all' | HandledProductSource>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<HandledProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [connection, setConnection] = useState<HandledStoreConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHandledProducts({ page, limit: PAGE_SIZE, search, source });
      setItems(data.items);
      setTotal(data.pagination.total);
      setConnection(data.storeConnection);
    } catch (e: any) {
      setError(e?.message || '매장 경영활용 제품을 불러오지 못했습니다.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = useCallback(
    async (it: HandledProduct) => {
      const key = rowKey(it);
      setBusyKey(key);
      try {
        await setHandledProductActive(it.sourceType, it.sourceId, !it.isActive);
        setItems((prev) =>
          prev.map((row) => (rowKey(row) === key ? { ...row, isActive: !row.isActive } : row)),
        );
      } catch (e: any) {
        window.alert(e?.message || '활성 상태를 변경하지 못했습니다.');
      } finally {
        setBusyKey(null);
      }
    },
    [],
  );

  const remove = useCallback(
    async (it: HandledProduct) => {
      const msg =
        it.sourceType === 'listing'
          ? '이 제품을 매장 경영활용 목록에서 제거하시겠습니까?\n상품 정보·상세설명서·QR 은 삭제되지 않습니다.'
          : '이 매장 자체 상품을 목록에서 제거하시겠습니까?\n등록한 상품 정보가 삭제됩니다.';
      if (!window.confirm(msg)) return;
      const key = rowKey(it);
      setBusyKey(key);
      try {
        const res = await removeHandledProducts([{ sourceType: it.sourceType, sourceId: it.sourceId }]);
        if (res.failed.length > 0) window.alert('제거에 실패했습니다.');
        await load();
      } catch (e: any) {
        window.alert(e?.message || '제거에 실패했습니다.');
      } finally {
        setBusyKey(null);
      }
    },
    [load],
  );

  const notConnected = connection != null && connection.status !== 'connected';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">매장 경영활용 제품</h1>
      <p className="mb-6 text-sm text-gray-500">
        약국에서 취급하기로 한 제품 목록입니다. 공급 상품 목록(B2B 구매 대상)과는 다른 축이며,
        주문한 상품이 자동으로 등록되지는 않습니다.
      </p>

      {notConnected && (
        <div className="mb-6">
          <StoreConnectionNotice connection={connection!} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setSource(tab.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              source === tab.value
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
            setSearch(searchInput.trim());
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제품명"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            검색
          </button>
          <button
            type="button"
            disabled={notConnected}
            onClick={() => setShowAdd(true)}
            className="rounded border border-primary-600 bg-primary-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            공급 상품에서 추가
          </button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">제품</th>
              <th className="px-3 py-2">구분</th>
              <th className="px-3 py-2">분류</th>
              <th className="px-3 py-2 text-right">매장 표시 가격</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">최근 수정</th>
              <th className="px-3 py-2 text-right">관리</th>
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
                  {notConnected
                    ? '매장이 연결되면 취급 제품을 등록할 수 있습니다.'
                    : search
                      ? '조건에 맞는 제품이 없습니다.'
                      : '아직 취급 제품이 없습니다. ‘공급 상품에서 추가’로 등록해 주세요.'}
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const key = rowKey(it);
                const busy = busyKey === key;
                return (
                  <tr key={key} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <span className="font-medium">{it.name}</span>
                      <span className="block text-xs text-gray-400">{it.ownerLabel}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">{it.originLabel}</td>
                    <td className="px-3 py-2 text-xs">
                      {it.classificationCode && it.classificationCode !== 'unknown'
                        ? it.classificationLabel
                        : '미분류'}
                    </td>
                    <td className="px-3 py-2 text-right">{won(it.price)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          it.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {it.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{day(it.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        {/* O4O 상품 정보 진입 — listing 은 공급 상품 상세, local 은 자체 상품 화면 */}
                        {it.sourceType === 'local' ? (
                          <Link to="/store-owner/local-products" className="text-primary-600 underline">
                            상품 정보
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleActive(it)}
                          className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
                        >
                          {it.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(it)}
                          className="rounded border border-red-300 px-2 py-1 text-red-600 disabled:opacity-40"
                        >
                          제거
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
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
            {page} / {totalPages} (총 {total}건)
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
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

      {showAdd && (
        <AddFromOffersModal
          onClose={() => setShowAdd(false)}
          onRegistered={() => {
            setShowAdd(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

// ─── 공급 상품에서 추가 ───────────────────────────────────────────────────────

interface OfferRow {
  offerId: string;
  name: string | null;
  manufacturerName: string | null;
  supplierName: string;
  effectiveUnitPrice: number;
}

/**
 * 공급 상품(offer)을 골라 취급 등록한다.
 * 목록은 기존 `/pharmacy-hub/store-owner/products` 를 그대로 쓴다 — 노출 게이트(공급자
 * opt-in)를 통과한 상품만 보이며, 서버의 등록 API 도 같은 게이트를 다시 확인한다.
 */
function AddFromOffersModal({
  onClose,
  onRegistered,
}: {
  onClose: () => void;
  onRegistered: () => void;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async (keyword: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pharmacy-hub/store-owner/products', {
        params: { q: keyword || undefined, page: 1, limit: 20 },
      });
      setRows(res.data?.data?.items ?? []);
    } catch {
      setError('공급 상품을 불러오지 못했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const apply = useCallback(
    async (row: OfferRow) => {
      setApplying(row.offerId);
      try {
        await applyHandledProduct(row.offerId);
        onRegistered();
      } catch (e: any) {
        window.alert(e?.message || '등록하지 못했습니다.');
      } finally {
        setApplying(null);
      }
    },
    [onRegistered],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold">공급 상품에서 추가</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            닫기
          </button>
        </div>

        <form
          className="flex gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void load(q.trim());
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품명 · 바코드 · 제조사"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            검색
          </button>
        </form>

        <div className="max-h-[50vh] overflow-y-auto border-t border-gray-100">
          {error && <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>}
          {!error && loading && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">불러오는 중…</p>
          )}
          {!error && !loading && rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">공급 상품이 없습니다.</p>
          )}
          {!error &&
            !loading &&
            rows.map((row) => (
              <div
                key={row.offerId}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{row.name ?? '-'}</span>
                  <span className="block text-xs text-gray-400">
                    {row.manufacturerName ?? '-'} · {row.supplierName}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{won(row.effectiveUnitPrice)}</span>
                <button
                  type="button"
                  disabled={applying === row.offerId}
                  onClick={() => void apply(row)}
                  className="rounded border border-primary-600 px-2 py-1 text-xs text-primary-600 disabled:opacity-40"
                >
                  취급 등록
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
