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
 *
 * WO-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1:
 *   header/설명 · 검색 · 총 건수 · loading/error/empty · table 기본 구조 ·
 *   제품명/분류/가격/수정일 표시 · pagination · row key 를 @o4o/store-ui-core 로 위임.
 *   매장 연결 상태 · 공급상품 추가 · 활성/비활성 · 제거 정책 · API 는 이 서비스가 그대로 소유한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HandledProductsPageHeader,
  HandledProductsToolbar,
  HandledProductsCountRow,
  HandledProductsTable,
  HandledProductsPagination,
  HandledProductNameCell,
  HandledProductBadge,
  formatHandledProductPrice,
  formatHandledProductDate,
  handledProductClassificationLabel,
  handledProductKey,
  type HandledProductsColumn,
} from '@o4o/store-ui-core';
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
// 표시 포맷·행 키는 공통 계약(@o4o/store-ui-core)을 쓴다.
const rowKey = handledProductKey;

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

  // 공통 table 컬럼 정의 — 표시 규칙은 공통 헬퍼, 액션 컬럼은 서비스 소유.
  const columns: Array<HandledProductsColumn<HandledProduct>> = [
    {
      key: 'product',
      header: '제품',
      align: 'left',
      className: 'min-w-[240px]',
      render: (it) => (
        <HandledProductNameCell name={it.name} imageUrl={it.imageUrl} secondaryLabel={it.ownerLabel} />
      ),
    },
    { key: 'origin', header: '구분', render: (it) => <HandledProductBadge text={it.originLabel} tone="blue" /> },
    {
      key: 'classification',
      header: '분류',
      render: (it) => {
        const label = handledProductClassificationLabel(it);
        return label === '미분류' ? (
          <span className="text-slate-400">미분류</span>
        ) : (
          <HandledProductBadge text={label} tone="gray" />
        );
      },
    },
    { key: 'price', header: '매장 표시 가격', render: (it) => formatHandledProductPrice(it.price) },
    {
      key: 'active',
      header: '상태',
      render: (it) => (
        <HandledProductBadge text={it.isActive ? '활성' : '비활성'} tone={it.isActive ? 'green' : 'muted'} />
      ),
    },
    { key: 'updatedAt', header: '최근 수정', render: (it) => formatHandledProductDate(it.updatedAt) },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      // PharmacyHub 전용 액션 — 활성/비활성 · 제거 · 자체 상품 정보 진입
      render: (it) => {
        const busy = busyKey === rowKey(it);
        return (
          <div className="flex justify-end gap-2 text-xs">
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
        );
      },
    },
  ];

  const emptyContent = notConnected
    ? '매장이 연결되면 취급 제품을 등록할 수 있습니다.'
    : search
      ? '조건에 맞는 제품이 없습니다.'
      : '아직 취급 제품이 없습니다. ‘공급 상품에서 추가’로 등록해 주세요.';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <HandledProductsPageHeader
        title="매장 경영활용 제품"
        description={
          <>
            약국에서 취급하기로 한 제품 목록입니다. 공급 상품 목록(B2B 구매 대상)과는 다른 축이며,
            주문한 상품이 자동으로 등록되지는 않습니다.
          </>
        }
      />

      {/* PharmacyHub 고유 — 매장 연결 상태 */}
      {notConnected && (
        <div className="mb-6">
          <StoreConnectionNotice connection={connection!} />
        </div>
      )}

      <HandledProductsToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="제품명"
        onSearchSubmit={() => {
          setPage(1);
          setSearch(searchInput.trim());
        }}
        leadingSlot={
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        }
        trailingSlot={
          <button
            type="button"
            disabled={notConnected}
            onClick={() => setShowAdd(true)}
            className="whitespace-nowrap rounded border border-primary-600 bg-primary-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            공급 상품에서 추가
          </button>
        }
      />

      <HandledProductsCountRow total={total} />

      <HandledProductsTable
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        emptyContent={emptyContent}
      />

      <HandledProductsPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(next) => setPage(Math.min(Math.max(1, next), totalPages))}
      />

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
