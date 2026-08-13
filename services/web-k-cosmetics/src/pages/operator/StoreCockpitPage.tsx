/**
 * StoreCockpitPage - K-Cosmetics 매장 전용 Cockpit 대시보드
 *
 * WO-KCOS-STORES-PHASE3-STORE-COCKPIT-V1
 * WO-O4O-STORE-DASHBOARD-DESIGN-REFINEMENT-V1: pink → primary, div → Card 적용
 *
 * 5-Block 구조:
 * 1. Store Status Header
 * 2. KPI Cards (오늘 주문, 이번달 매출, 채널 비율, 등록 상품)
 * 3. 상품 운영 현황
 * 4. 콘텐츠/사이니지 (placeholder)
 * 5. AI 슬롯 (비활성)
 */

import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, useTemplate } from '@o4o/ui';
// WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1:
// canonical StoreHomeShell 2번째 소비처. 다중 매장 selector 를 storeSelectorSlot 으로 수렴.
// 기존 5-block 운영 대시보드(KPI/상품/사이니지/AI인사이트/최근주문)는 의미·순서 그대로 유지.
// WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1:
// 로딩/오류/빈 상태 + KPI 그리드를 canonical 파트로 수렴. 다중 매장 selector 는 기존대로 슬롯 유지.
// 5-block 운영 대시보드의 나머지 블록(상품/사이니지/AI/최근주문)은 K-Cosmetics 고유 — children 으로 유지.
import {
  StoreHomeShell,
  StoreHomeStatusCard,
  StoreHomeMetricGrid,
  StoreHomeStateView,
  StoreHomeActivityPanel,
} from '@o4o/store-ui-core';
import type { StoreHomeMetricItem } from '@o4o/store-ui-core';
import { kcosmeticsConfig } from '@o4o/operator-ux-core';
import {
  storeApi,
  type StoreInfo,
  type StoreSummary,
  type StoreListing,
  type StorePlaylist,
  type StoreInsightsResult,
} from '@/services/storeApi';

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  approved: { label: '운영중', bg: 'bg-green-100', text: 'text-green-700' },
  pending: { label: '승인 대기', bg: 'bg-amber-100', text: 'text-amber-700' },
  draft: { label: '준비중', bg: 'bg-slate-100', text: 'text-slate-600' },
  suspended: { label: '정지됨', bg: 'bg-red-100', text: 'text-red-700' },
  rejected: { label: '거절됨', bg: 'bg-red-100', text: 'text-red-600' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// ============================================================================
// Formatters
// ============================================================================

function formatCurrency(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function StoreCockpitPage() {
  const tpl = useTemplate();
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [summary, setSummary] = useState<StoreSummary | null>(null);
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [listingTotal, setListingTotal] = useState(0);
  const [playlists, setPlaylists] = useState<StorePlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [insights, setInsights] = useState<StoreInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stores
  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const myStores = await storeApi.getMyStores();
      if (!myStores || myStores.length === 0) {
        setStores([]);
        setSelectedStore(null);
        setLoading(false);
        return;
      }

      setStores(myStores);

      // Auto-select first store
      const store = myStores[0];
      setSelectedStore(store);

      // Load store data in parallel
      const [summaryData, listingsData, playlistData, insightsData] = await Promise.all([
        storeApi.getStoreSummary(store.id),
        storeApi.getStoreListings(store.id, { limit: 5 }),
        storeApi.getStorePlaylists(store.id),
        storeApi.getStoreInsights(store.id),
      ]);

      setSummary(summaryData);
      if (listingsData) {
        setListings(listingsData.listings);
        setListingTotal(listingsData.meta.total);
      }
      if (playlistData) setPlaylists(playlistData);
      setInsights(insightsData);
    } catch (err) {
      setError('매장 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('[StoreCockpit] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Handle store selection change
  const handleStoreChange = useCallback(async (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    setSelectedStore(store);
    setLoading(true);

    try {
      const [summaryData, listingsData, playlistData, insightsData] = await Promise.all([
        storeApi.getStoreSummary(store.id),
        storeApi.getStoreListings(store.id, { limit: 5 }),
        storeApi.getStorePlaylists(store.id),
        storeApi.getStoreInsights(store.id),
      ]);

      setSummary(summaryData);
      if (listingsData) {
        setListings(listingsData.listings);
        setListingTotal(listingsData.meta.total);
      }
      if (playlistData) setPlaylists(playlistData);
      setInsights(insightsData);
    } catch {
      setError('매장 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [stores]);

  // Generate default playlist from top products
  const handleGenerateDefault = useCallback(async () => {
    if (!selectedStore) return;
    setPlaylistLoading(true);
    try {
      const result = await storeApi.generateDefaultPlaylist(selectedStore.id);
      if (result) {
        const fresh = await storeApi.getStorePlaylists(selectedStore.id);
        if (fresh) setPlaylists(fresh);
      }
    } catch (err) {
      console.error('[StoreCockpit] Generate playlist error:', err);
    } finally {
      setPlaylistLoading(false);
    }
  }, [selectedStore]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (loading && !selectedStore) {
    return (
      <StoreHomeStateView
        state="loading"
        icon={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />}
      />
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (error && !selectedStore) {
    return (
      <StoreHomeStateView
        state="error"
        icon={
          <svg className="w-16 h-16 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
        }
        title="오류가 발생했습니다"
        description={error}
        onRetry={loadStores}
      />
    );
  }

  // ============================================================================
  // Empty State (No stores)
  // ============================================================================

  if (stores.length === 0) {
    return (
      <StoreHomeStateView
        state="empty"
        icon={
          <svg className="w-20 h-20 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
          </svg>
        }
        title="등록된 매장이 없습니다"
        description="매장 신청을 통해 K-Cosmetics 네트워크에 참여하세요."
        actionLabel="매장 신청하기"
        actionTo="/operator/applications"
      />
    );
  }

  // ============================================================================
  // Main Cockpit
  // ============================================================================

  const stats = summary?.stats;

  const metricItems: StoreHomeMetricItem[] = [
    {
      key: 'today-orders',
      label: '오늘 주문',
      value: stats?.todayOrders ?? 0,
      unit: '건',
      hint: (stats?.todayRevenue ?? 0) > 0 ? formatCurrency(stats!.todayRevenue) : undefined,
      icon: (
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
      ),
    },
    {
      key: 'monthly-revenue',
      label: '이번달 매출',
      value: formatCurrency(stats?.monthlyRevenue ?? 0),
      hint: `${stats?.monthlyOrders ?? 0}건`,
      icon: (
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      ),
    },
    {
      key: 'channel-breakdown',
      label: '채널 비율',
      icon: (
        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
          </svg>
        </div>
      ),
      // 값이 단일 숫자가 아니므로 카드 본문을 통째로 주입 (공통 그리드의 content escape hatch)
      content:
        summary?.channelBreakdown && summary.channelBreakdown.length > 0 ? (
          <div className="space-y-1">
            {summary.channelBreakdown.map((ch) => (
              <div key={ch.channel} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{ch.channel === 'local' ? '현장' : ch.channel === 'travel' ? '여행' : ch.channel}</span>
                <span className="font-medium text-slate-800">{ch.orderCount}건</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 m-0">데이터 없음</p>
        ),
    },
    {
      key: 'registered-products',
      label: '등록 상품',
      value: listingTotal,
      unit: '개',
      hint: `노출 ${listings.filter((l) => l.isVisible).length}개`,
      icon: (
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1:                */}
      {/* canonical StoreHomeShell 이 헤더 → 매장선택 → 매장상태 → KPI →      */}
      {/* 본문 순서를 담당. 다중 매장 선택·5-block 구성·API 는 K-Cosmetics    */}
      {/* service-local 유지 (셸은 API 를 알지 않는다).                        */}
      {/* ================================================================== */}
      <StoreHomeShell
        title={kcosmeticsConfig.uiText.storeHomeTitle}
        subtitle={kcosmeticsConfig.uiText.storeHomeSubtitle}
        loading={loading}
        onRefresh={loadStores}
        storeSelectorSlot={
          stores.length > 1 ? (
            <div className="flex justify-end mb-4">
              <select
                value={selectedStore?.id || ''}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                aria-label="매장 선택"
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : null
        }
        statusSlot={
          <div className="mb-6">
          {/* WO-O4O-MY-STORE-HOME-STORE-STATUS-CARD-CROSSSERVICE-COMMONIZATION-V1:
              배치만 공통 StoreHomeStatusCard 로 위임. 매장 운영 승인 상태(STATUS_CONFIG)·역할 표기는
              K-Cosmetics 소유 — 판정/의미를 공통 Core 로 옮기지 않는다. */}
          <StoreHomeStatusCard
            variant="inline"
            wrapper={(content) => <Card className="p-6">{content}</Card>}
            icon={
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                <path d="M2 7h20" />
              </svg>
            }
            iconWrapClassName="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0"
            title={selectedStore?.name}
            badgeSlot={selectedStore ? <StatusBadge status={selectedStore.status} /> : null}
            meta={[
              { key: 'code', label: '코드', value: selectedStore?.code },
              { key: 'members', value: `멤버 ${selectedStore?.memberCount || 0}명` },
              {
                key: 'role',
                label: '역할',
                value:
                  selectedStore?.myRole === 'owner'
                    ? '소유자'
                    : selectedStore?.myRole === 'manager'
                      ? '관리자'
                      : '스태프',
              },
            ]}
            actionsSlot={
              /* 매장 선택 select 는 StoreHomeShell.storeSelectorSlot 로 이동 (WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1) */
              <div className="flex items-center gap-3">
                <NavLink
                  to="/operator/products"
                  className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  상품 관리
                </NavLink>
                <NavLink
                  to="/operator/orders"
                  className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  주문 관리
                </NavLink>
              </div>
            }
          />
          </div>
        }
        metricsSlot={
          <div className="mb-6">
            <StoreHomeMetricGrid
              items={metricItems}
              variant="icon-inline"
              loading={loading}
              columnsClassName={tpl?.layout?.grid ?? 'grid-cols-2 lg:grid-cols-4'}
            />
          </div>
        }
      >
      <div className="space-y-6">
      {/* ================================================================== */}
      {/* Block 3: 상품 운영 현황 */}
      {/* ================================================================== */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">상품 운영 현황</h2>
          <NavLink
            to="/operator/products"
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            전체 보기 &rarr;
          </NavLink>
        </div>

        {/* Top Products (from summary) */}
        {summary?.topProducts && summary.topProducts.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-600 mb-2">이번달 인기 상품</p>
            {summary.topProducts.map((product, idx) => (
              <div key={product.productId} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700">{product.productName}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-800">{formatCurrency(product.revenue)}</span>
                  <span className="text-xs text-slate-400 ml-2">{product.quantity}개</span>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-600 mb-2">최근 등록 상품</p>
            {listings.slice(0, 5).map(listing => (
              <div key={listing.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${listing.isVisible ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <span className="text-sm text-slate-700">{listing.product?.name || listing.productId}</span>
                </div>
                {listing.product?.brand && (
                  <span className="text-xs text-slate-400">{listing.product.brand.name}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
            </svg>
            <p className="text-slate-500 text-sm">등록된 상품이 없습니다</p>
            <p className="text-slate-400 text-xs mt-1">상품을 등록하여 판매를 시작하세요</p>
          </div>
        )}
      </Card>

      {/* Bottom row: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================================================================== */}
        {/* Block 4: 콘텐츠/사이니지 (WO-KCOS-STORES-PHASE4) */}
        {/* ================================================================== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">콘텐츠 / 사이니지</h2>
            {playlists.length > 0 && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                활성 {playlists.filter(p => p.isActive).length}개
              </span>
            )}
          </div>

          {playlists.length > 0 ? (
            <div className="space-y-2">
              {playlists.map(pl => (
                <div key={pl.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pl.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className="text-sm text-slate-700 truncate">{pl.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{pl.items?.length || 0}개 항목</span>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{formatDate(pl.updatedAt)}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleGenerateDefault}
                  disabled={playlistLoading}
                  className="text-sm text-primary hover:text-primary-dark font-medium disabled:opacity-50"
                >
                  {playlistLoading ? '생성중...' : '자동 편성'}
                </button>
                <NavLink
                  to="/operator/signage/content"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  사이니지 콘텐츠 →
                </NavLink>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl">
              <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
              <p className="text-slate-500 text-sm font-medium">아직 플레이리스트가 없습니다</p>
              <p className="text-slate-400 text-xs mt-1">인기 상품으로 자동 편성하거나 직접 만들어보세요</p>
              <button
                onClick={handleGenerateDefault}
                disabled={playlistLoading}
                className="inline-flex items-center mt-3 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
              >
                {playlistLoading ? '생성중...' : '인기 상품 자동 편성'}
              </button>
            </div>
          )}
        </Card>

        {/* ================================================================== */}
        {/* Block 5: AI 인사이트 (WO-KCOS-STORES-PHASE5) */}
        {/* ================================================================== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">AI 인사이트</h2>
            {insights && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                insights.level === 'positive' ? 'bg-green-100 text-green-700' :
                insights.level === 'warning' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {insights.level === 'positive' ? '긍정' : insights.level === 'warning' ? '주의' : '정보'}
              </span>
            )}
          </div>

          {insights && insights.insights.length > 0 ? (
            <div className="space-y-2.5">
              {insights.insights.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    item.level === 'positive' ? 'bg-green-50' :
                    item.level === 'warning' ? 'bg-amber-50' :
                    'bg-blue-50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.level === 'positive' ? (
                      <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : item.level === 'warning' ? (
                      <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-sm ${
                    item.level === 'positive' ? 'text-green-800' :
                    item.level === 'warning' ? 'text-amber-800' :
                    'text-blue-800'
                  }`}>
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-br from-slate-50 to-primary-50 rounded-xl">
              <svg className="w-12 h-12 text-primary-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <p className="text-slate-500 text-sm font-medium">충분한 데이터가 없습니다</p>
              <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                주문 데이터가 쌓이면 자동으로 인사이트가 표시됩니다.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Recent Orders (from summary) */}
      {/* ================================================================== */}
      {/* WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1:                */}
      {/* 패널 chrome(제목/전체보기/빈 상태)을 StoreHomeActivityPanel 공통으로 */}
      {/* 위임. 표 본문은 K-Cosmetics 고유라 그대로 둔다.                      */}
      {/* ================================================================== */}
      <StoreHomeActivityPanel
        title="최근 주문"
        moreLabel="전체 보기 →"
        moreTo="/operator/orders"
        loading={loading}
        isEmpty={!summary?.recentOrders || summary.recentOrders.length === 0}
        emptyContent="아직 주문 내역이 없습니다"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">주문번호</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">금액</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">채널</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-slate-500">시간</th>
              </tr>
            </thead>
            <tbody>
              {summary?.recentOrders?.map(order => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-sm text-slate-700 font-mono">{order.orderNumber}</td>
                  <td className="py-2.5 px-3 text-sm text-slate-800 font-medium">{formatCurrency(order.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-sm text-slate-600">
                    {order.channel === 'local' ? '현장' : order.channel === 'travel' ? '여행' : order.channel || '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'created' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-400 text-right">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StoreHomeActivityPanel>
      </div>
      </StoreHomeShell>
    </div>
  );
}
