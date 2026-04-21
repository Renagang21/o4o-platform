/**
 * 타블렛 채널 설정 페이지
 *
 * WO-TABLET-OPERATOR-UI-V1
 *
 * 경로: /store/tablet/settings
 *
 * 기능:
 * - TABLET 채널 상태 표시
 * - 진열 상품 목록 + 타블렛 노출 상태 조회
 * - 상품별 타블렛 노출 ON/OFF 토글
 * - 상품명 검색 / 노출 상태 필터
 *
 * 설계 원칙:
 * - 공급자 원본 데이터 직접 참조 구조 유지 (복사 없음)
 * - 운영자는 노출 여부만 관리
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Tablet, Search, RefreshCw, AlertCircle, CheckCircle2,
  Package, ToggleLeft, ToggleRight, Info,
} from 'lucide-react';
import {
  tabletOperatorApi,
  TabletChannel,
  TabletProductItem,
} from '@/api/tablet-operator.api';

// ============================================
// Channel Status Badge
// ============================================

function ChannelStatusBadge({ status }: { status: TabletChannel['status'] }) {
  const styles: Record<TabletChannel['status'], { bg: string; text: string; label: string }> = {
    APPROVED:   { bg: 'bg-green-100',  text: 'text-green-700',  label: '활성' },
    PENDING:    { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '대기 중' },
    REJECTED:   { bg: 'bg-red-100',    text: 'text-red-700',    label: '거절됨' },
    SUSPENDED:  { bg: 'bg-orange-100', text: 'text-orange-700', label: '일시 중지' },
    EXPIRED:    { bg: 'bg-gray-100',   text: 'text-gray-500',   label: '만료됨' },
    TERMINATED: { bg: 'bg-gray-100',   text: 'text-gray-500',   label: '종료됨' },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ============================================
// Product Row
// ============================================

function ProductRow({
  item,
  onToggle,
  toggling,
}: {
  item: TabletProductItem;
  onToggle: (listingId: string, visible: boolean) => void;
  toggling: boolean;
}) {
  const name = item.productName || item.regulatoryName || '(이름 없음)';

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* 상품 정보 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={name}
              className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-gray-300" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{name}</p>
            {item.specification && (
              <p className="text-xs text-gray-400 truncate max-w-xs">{item.specification}</p>
            )}
          </div>
        </div>
      </td>

      {/* 공급자 */}
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {item.supplierName || '-'}
      </td>

      {/* 가격 */}
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">
        {item.priceGeneral != null
          ? `₩${Number(item.priceGeneral).toLocaleString()}`
          : '-'}
      </td>

      {/* 노출 상태 */}
      <td className="px-4 py-3 text-center">
        {item.tabletVisible ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> 노출 중
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            미노출
          </span>
        )}
      </td>

      {/* 토글 */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggle(item.listingId, !item.tabletVisible)}
          disabled={toggling}
          title={item.tabletVisible ? '타블렛 노출 OFF' : '타블렛 노출 ON'}
          className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          {item.tabletVisible ? (
            <ToggleRight className="w-7 h-7 text-green-500" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-gray-400" />
          )}
        </button>
      </td>
    </tr>
  );
}

// ============================================
// Main Page
// ============================================

type VisibleFilter = 'all' | 'true' | 'false';

export default function TabletChannelSettingsPage() {
  const [channel, setChannel] = useState<TabletChannel | null>(null);
  const [channelLoading, setChannelLoading] = useState(true);

  const [items, setItems] = useState<TabletProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [visibleFilter, setVisibleFilter] = useState<VisibleFilter>('all');

  // Per-row toggling state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Channel load ──────────────────────────────────────────────────────
  useEffect(() => {
    tabletOperatorApi
      .getChannel()
      .then(({ channel: ch }) => setChannel(ch))
      .catch(() => {})
      .finally(() => setChannelLoading(false));
  }, []);

  // ── Products load ─────────────────────────────────────────────────────
  const loadProducts = useCallback(
    async (p: number, q: string, v: VisibleFilter) => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const res = await tabletOperatorApi.listProducts({
          search: q || undefined,
          visible: v === 'all' ? undefined : v === 'true',
          page: p,
          limit,
        });
        setItems(res.items);
        setTotal(res.total);
      } catch {
        setProductsError('상품 목록을 불러오는 데 실패했습니다.');
      } finally {
        setProductsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadProducts(page, search, visibleFilter);
  }, [loadProducts, page, visibleFilter]);

  const handleSearch = () => {
    setPage(1);
    loadProducts(1, search, visibleFilter);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Toggle ────────────────────────────────────────────────────────────
  const handleToggle = async (listingId: string, newVisible: boolean) => {
    setTogglingId(listingId);
    try {
      await tabletOperatorApi.setVisibility(listingId, newVisible);
      setItems((prev) =>
        prev.map((item) =>
          item.listingId === listingId
            ? { ...item, tabletVisible: newVisible }
            : item,
        ),
      );
      showToast(true, newVisible ? '타블렛 노출이 켜졌습니다.' : '타블렛 노출이 꺼졌습니다.');
    } catch {
      showToast(false, '설정 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setTogglingId(null);
    }
  };

  const showToast = (ok: boolean, text: string) => {
    setToastMsg({ ok, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const totalPages = Math.ceil(total / limit);
  const visibleCount = items.filter((i) => i.tabletVisible).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toastMsg.ok
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toastMsg.ok ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Tablet className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">타블렛 채널 설정</h1>
          <p className="text-sm text-gray-500 mt-0.5">진열 상품의 타블렛 화면 노출 여부를 관리합니다</p>
        </div>
      </div>

      {/* Channel Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">TABLET 채널 상태</p>
            {channelLoading ? (
              <div className="mt-1 h-5 w-24 bg-gray-100 animate-pulse rounded" />
            ) : channel ? (
              <div className="flex items-center gap-2 mt-1">
                <ChannelStatusBadge status={channel.status} />
                <span className="text-xs text-gray-400">ID: {channel.id.slice(0, 8)}…</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">채널 미설정 (첫 노출 시 자동 생성)</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">현재 노출 중</p>
            <p className="text-2xl font-bold text-blue-600">{visibleCount}</p>
            <p className="text-xs text-gray-400">/ {total} 상품</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-4 flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            타블렛 화면은 공급자 원본 데이터를 직접 참조합니다.
            내 매장에 별도로 복사·저장되지 않으며, 노출 여부만 설정합니다.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="상품명, 공급자명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={productsLoading}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {productsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '검색'}
        </button>

        {/* Visible filter */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {([['all', '전체'], ['true', '노출 중'], ['false', '미노출']] as const).map(
            ([val, label]) => (
              <button
                key={val}
                onClick={() => { setPage(1); setVisibleFilter(val); }}
                className={`px-3 py-1.5 transition-colors ${
                  visibleFilter === val
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {productsError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 border-b border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {productsError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상품</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">공급자</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">가격</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">노출 상태</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">타블렛 노출</th>
              </tr>
            </thead>
            <tbody>
              {productsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-300 animate-spin" />
                    <p className="text-sm text-gray-400">불러오는 중...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      {search || visibleFilter !== 'all'
                        ? '검색 결과가 없습니다.'
                        : '진열된 상품이 없습니다. 먼저 상품 진열을 등록하세요.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <ProductRow
                    key={item.listingId}
                    item={item}
                    onToggle={handleToggle}
                    toggling={togglingId === item.listingId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              총 {total}개 중 {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || productsLoading}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-xs text-gray-500 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages || productsLoading}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
