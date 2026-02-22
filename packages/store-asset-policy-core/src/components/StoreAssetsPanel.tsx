/**
 * StoreAssetsPanel — Main store asset management orchestration component
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 *
 * Handles filtering, sorting, pagination, KPI computation, section separation.
 * Data fetching and API calls remain in each service.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Home,
  Tv,
  Megaphone,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  StoreAssetItem,
  TabKey,
  StatusFilter,
  PolicyFilter,
  ChannelFilter,
  SortKey,
} from '../types/snapshot';
import { isForcedActive, isForcedExpired } from '../policy/policyGate';
import { isForcedExpiringSoon } from '../policy/expiringSoon';
import { PolicyFilterBar } from './PolicyFilterBar';
import { ForcedSection } from './ForcedSection';
import { AssetRow } from './AssetRow';

/* ─── Constants ──────────────────────────── */

const PAGE_LIMIT = 20;

/* ─── Props ──────────────────────────────── */

export interface StoreAssetsPanelProps {
  /** All items from API (unfiltered, high-limit fetch) */
  items: StoreAssetItem[];
  loading: boolean;
  error: string | null;
  updatingId: string | null;
  onRefresh: () => void;
  onToggleStatus: (item: StoreAssetItem) => void;
  onEdit: (snapshotId: string) => void;
  /** Back link to dashboard (default: '/store') */
  dashboardPath?: string;
  /** Link to full content list, used in forced-expiring banner (default: '/store/content') */
  contentListPath?: string;
}

/* ─── KPI Computation ────────────────────── */

function computeKpi(items: StoreAssetItem[]) {
  let homePublished = 0;
  let signagePublished = 0;
  let promoPublished = 0;
  let forcedActive = 0;

  for (const item of items) {
    const isVisible = item.publishStatus === 'published' &&
      (!item.isForced || isForcedActive(item));
    if (isVisible && item.channelMap?.home) homePublished++;
    if (isVisible && item.channelMap?.signage) signagePublished++;
    if (isVisible && item.channelMap?.promotion) promoPublished++;
    if (isForcedActive(item)) forcedActive++;
  }

  return { homePublished, signagePublished, promoPublished, forcedActive };
}

/* ─── Filter & Sort ──────────────────────── */

function applyFilters(
  items: StoreAssetItem[],
  statusFilter: StatusFilter,
  channelFilter: ChannelFilter,
  policyFilter: PolicyFilter,
): StoreAssetItem[] {
  return items.filter(item => {
    if (statusFilter === 'published' && item.publishStatus !== 'published') return false;
    if (statusFilter === 'draft' && item.publishStatus !== 'draft') return false;
    if (statusFilter === 'hidden' && item.publishStatus !== 'hidden') return false;

    if (policyFilter === 'user_copy' && item.snapshotType !== 'user_copy') return false;
    if (policyFilter === 'hq_forced' && item.snapshotType !== 'hq_forced') return false;
    if (policyFilter === 'campaign_push' && item.snapshotType !== 'campaign_push') return false;
    if (policyFilter === 'expiring_soon' && !isForcedExpiringSoon(item)) return false;
    if (policyFilter === 'expired' && item.lifecycleStatus !== 'expired' && !isForcedExpired(item)) return false;

    if (channelFilter !== 'all') {
      if (!item.channelMap?.[channelFilter]) return false;
    }

    return true;
  });
}

function applySort(items: StoreAssetItem[], sortKey: SortKey): StoreAssetItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortKey === 'forced-first') {
      const aForced = isForcedActive(a) ? 1 : 0;
      const bForced = isForcedActive(b) ? 1 : 0;
      if (bForced !== aForced) return bForced - aForced;
      if (a.forcedEndAt && b.forcedEndAt) {
        return new Date(a.forcedEndAt).getTime() - new Date(b.forcedEndAt).getTime();
      }
    }
    if (sortKey === 'published-first') {
      const order: Record<string, number> = { published: 0, draft: 1, hidden: 2 };
      const diff = (order[a.publishStatus] ?? 9) - (order[b.publishStatus] ?? 9);
      if (diff !== 0) return diff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return sorted;
}

function parseTabParam(value: string | null): TabKey {
  if (value === 'cms' || value === 'signage') return value;
  return 'all';
}

/* ─── Main Component ─────────────────────── */

export function StoreAssetsPanel({
  items: allItems,
  loading,
  error,
  updatingId,
  onRefresh,
  onToggleStatus,
  onEdit,
  dashboardPath = '/store',
  contentListPath = '/store/content',
}: StoreAssetsPanelProps) {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(() => parseTabParam(searchParams.get('tab')));

  const viewParam = searchParams.get('view');
  const isForcedExpiringView = viewParam === 'forced-expiring';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [policyFilter, setPolicyFilter] = useState<PolicyFilter>(isForcedExpiringView ? 'expiring_soon' : 'all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>(isForcedExpiringView ? 'forced-first' : 'newest');
  const [page, setPage] = useState(1);

  // Tab-filtered base items
  const tabItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    return allItems.filter(i => i.assetType === activeTab);
  }, [allItems, activeTab]);

  const kpi = useMemo(() => computeKpi(tabItems), [tabItems]);

  const filteredItems = useMemo(() => {
    const filtered = applyFilters(tabItems, statusFilter, channelFilter, policyFilter);
    return applySort(filtered, sortKey);
  }, [tabItems, statusFilter, channelFilter, policyFilter, sortKey]);

  // Section separation: forced (hq_forced active) pinned at top
  const forcedItems = useMemo(
    () => filteredItems.filter(i => i.snapshotType === 'hq_forced' && i.lifecycleStatus === 'active' && isForcedActive(i)),
    [filteredItems],
  );
  const regularItems = useMemo(
    () => filteredItems.filter(i => !(i.snapshotType === 'hq_forced' && i.lifecycleStatus === 'active' && isForcedActive(i))),
    [filteredItems],
  );

  // Pagination (regular items only)
  const totalPages = Math.max(1, Math.ceil(regularItems.length / PAGE_LIMIT));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return regularItems.slice(start, start + PAGE_LIMIT);
  }, [regularItems, page]);

  useEffect(() => { setPage(1); }, [activeTab, statusFilter, channelFilter, policyFilter, sortKey]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setStatusFilter('all');
    setPolicyFilter('all');
    setChannelFilter('all');
  };

  const tabs: { key: TabKey; label: string; icon: LucideIcon; count: number }[] = [
    { key: 'all', label: '전체', icon: FileText, count: allItems.length },
    { key: 'cms', label: 'CMS 콘텐츠', icon: FileText, count: allItems.filter(i => i.assetType === 'cms').length },
    { key: 'signage', label: '사이니지', icon: Monitor, count: allItems.filter(i => i.assetType === 'signage').length },
  ];

  const forcedExpiringCount = tabItems.filter(isForcedExpiringSoon).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to={dashboardPath} className="text-blue-600 hover:underline">&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">매장 자산</h1>
          <p className="text-sm text-slate-500 mt-1">채널별 노출 현황을 확인하고 게시 상태를 관리합니다</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* [A] KPI Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <ExposureCard icon={Home} label="홈 게시" count={kpi.homePublished} color="blue" />
          <ExposureCard icon={Tv} label="사이니지 게시" count={kpi.signagePublished} color="purple" />
          <ExposureCard icon={Megaphone} label="프로모션 게시" count={kpi.promoPublished} color="emerald" />
          <ExposureCard
            icon={ShieldAlert}
            label="강제노출"
            count={kpi.forcedActive}
            color="red"
            warning={forcedExpiringCount > 0 ? `${forcedExpiringCount}건 만료 임박` : undefined}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-4">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              {tab.label}
              <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* [B] Filter bar */}
      {!loading && !error && allItems.length > 0 && (
        <PolicyFilterBar
          statusFilter={statusFilter}
          policyFilter={policyFilter}
          channelFilter={channelFilter}
          sortKey={sortKey}
          onStatusChange={setStatusFilter}
          onPolicyChange={setPolicyFilter}
          onChannelChange={setChannelFilter}
          onSortChange={setSortKey}
        />
      )}

      {/* Forced expiry banner */}
      {forcedExpiringCount > 0 && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            강제노출 만료 임박: <strong>{forcedExpiringCount}건</strong>의 자산이 7일 이내 만료됩니다.
          </span>
          {isForcedExpiringView && (
            <Link to={contentListPath} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
              전체 보기
            </Link>
          )}
        </div>
      )}

      {/* [C] Asset list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          자산 목록을 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
          <button onClick={onRefresh} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          {allItems.length === 0 ? (
            <>
              <p className="text-sm">복사된 자산이 없습니다.</p>
              <p className="text-xs mt-1">커뮤니티 콘텐츠/사이니지 관리에서 "매장으로 복사" 버튼을 이용해주세요.</p>
            </>
          ) : (
            <p className="text-sm">선택한 필터 조건에 해당하는 자산이 없습니다.</p>
          )}
        </div>
      ) : (
        <>
          {/* Forced section */}
          <ForcedSection
            items={forcedItems}
            updatingId={updatingId}
            onToggleStatus={onToggleStatus}
            onEdit={onEdit}
          />

          {/* Regular section */}
          {pagedItems.length > 0 && (
            <>
              {forcedItems.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">내 콘텐츠</h3>
                  <span className="text-xs text-slate-400">{regularItems.length}건</span>
                </div>
              )}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-3 font-medium">종류</th>
                      <th className="px-4 py-3 font-medium">유형</th>
                      <th className="px-4 py-3 font-medium">제목</th>
                      <th className="px-4 py-3 font-medium w-24">상태</th>
                      <th className="px-4 py-3 font-medium w-20">채널</th>
                      <th className="px-4 py-3 font-medium w-28">복사일</th>
                      <th className="px-4 py-3 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedItems.map(item => (
                      <AssetRow
                        key={item.id}
                        item={item}
                        updatingId={updatingId}
                        onToggleStatus={onToggleStatus}
                        onEdit={onEdit}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>{regularItems.length}건 중 {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, regularItems.length)} · {page}/{totalPages} 페이지</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Internal: ExposureCard ─────────────── */

function ExposureCard({ icon: Icon, label, count, color, warning }: {
  icon: LucideIcon;
  label: string;
  count: number;
  color: 'blue' | 'purple' | 'emerald' | 'red';
  warning?: string;
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', count: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', count: 'text-purple-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', count: 'text-emerald-700' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', count: 'text-red-700' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${c.bg}`}>
      <div className={`flex items-center gap-2 text-xs mb-2 ${c.icon}`}>
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className={`text-2xl font-bold ${c.count}`}>{count}<span className="text-sm font-normal ml-0.5">건</span></div>
      {warning && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-600 font-medium">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </div>
  );
}
