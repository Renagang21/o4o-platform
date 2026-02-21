/**
 * StoreAssetsPage — 매장 자산 운영 대시보드
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (pagination)
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 (sourceService column)
 * WO-KPA-A-HUB-TO-STORE-CLONE-FLOW-V2: ?tab= URL 파라미터 지원
 * WO-KPA-A-STORE-IA-REALIGN-PHASE1-V1: StoreHubPage KPI 흡수, 단일 자산 진입점
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1: publish 상태 배지 + 토글
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2: forced 배지, locked 표시, 기간 노출
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1: 콘텐츠 편집 버튼
 * WO-KPA-A-ASSET-OPERATIONAL-VISIBILITY-V1: 운영 대시보드형 재구성
 *
 * 구조:
 * ├─ [A] 노출 요약 카드 (채널별 게시 + 강제노출 집계)
 * ├─ [B] 상태/채널 필터 바 + 정렬
 * └─ [C] 자산 리스트 (강제노출 만료 경고 포함, 클라이언트 페이지네이션)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldAlert,
  Pencil,
  Home,
  Tv,
  Megaphone,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import {
  storeAssetControlApi,
  type StoreAssetItem,
  type AssetPublishStatus,
} from '../../api/assetSnapshot';

/* ─── Types ──────────────────────────────────── */

type TabKey = 'all' | 'cms' | 'signage';
type StatusFilter = 'all' | 'published' | 'draft' | 'hidden' | 'forced';
type ChannelFilter = 'all' | 'home' | 'signage' | 'promotion';
type SortKey = 'newest' | 'forced-first' | 'published-first';

/* ─── Constants ──────────────────────────────── */

const PAGE_LIMIT = 20;
const FORCED_WARN_DAYS = 7;

const SERVICE_LABELS: Record<string, string> = {
  kpa: 'KPA',
  neture: 'Neture',
};

const STATUS_CONFIG: Record<AssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};

/* ─── Helpers ────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isForcedActive(item: StoreAssetItem): boolean {
  if (!item.isForced) return false;
  const now = new Date();
  if (item.forcedStartAt && new Date(item.forcedStartAt) > now) return false;
  if (item.forcedEndAt && new Date(item.forcedEndAt) < now) return false;
  return true;
}

function isForcedExpiringSoon(item: StoreAssetItem): boolean {
  if (!item.isForced || !item.forcedEndAt) return false;
  const days = daysUntil(item.forcedEndAt);
  return days >= 0 && days <= FORCED_WARN_DAYS;
}

function isForcedExpired(item: StoreAssetItem): boolean {
  if (!item.isForced || !item.forcedEndAt) return false;
  return new Date(item.forcedEndAt) < new Date();
}

function parseTabParam(value: string | null): TabKey {
  if (value === 'cms' || value === 'signage') return value;
  return 'all';
}

/* ─── KPI Computation ────────────────────────── */

function computeKpi(items: StoreAssetItem[]) {
  let homePublished = 0;
  let signagePublished = 0;
  let promoPublished = 0;
  let forcedActive = 0;

  for (const item of items) {
    // Published channel count: forced 기간 만료 아이템 제외 (서버 렌더 필터와 동일 기준)
    const isVisible = item.publishStatus === 'published' &&
      (!item.isForced || isForcedActive(item));
    if (isVisible && item.channelMap?.home) homePublished++;
    if (isVisible && item.channelMap?.signage) signagePublished++;
    if (isVisible && item.channelMap?.promotion) promoPublished++;

    if (isForcedActive(item)) forcedActive++;
  }

  return { homePublished, signagePublished, promoPublished, forcedActive };
}

/* ─── Filter & Sort ──────────────────────────── */

function applyFilters(
  items: StoreAssetItem[],
  statusFilter: StatusFilter,
  channelFilter: ChannelFilter,
): StoreAssetItem[] {
  return items.filter(item => {
    // Status filter
    if (statusFilter === 'published' && item.publishStatus !== 'published') return false;
    if (statusFilter === 'draft' && item.publishStatus !== 'draft') return false;
    if (statusFilter === 'hidden' && item.publishStatus !== 'hidden') return false;
    if (statusFilter === 'forced' && !isForcedActive(item)) return false;

    // Channel filter
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
      // Secondary: forced end date ascending (soonest expiry first)
      if (a.forcedEndAt && b.forcedEndAt) {
        return new Date(a.forcedEndAt).getTime() - new Date(b.forcedEndAt).getTime();
      }
    }
    if (sortKey === 'published-first') {
      const order: Record<string, number> = { published: 0, draft: 1, hidden: 2 };
      const diff = (order[a.publishStatus] ?? 9) - (order[b.publishStatus] ?? 9);
      if (diff !== 0) return diff;
    }
    // Default: newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return sorted;
}

/* ─── Main Component ─────────────────────────── */

export default function StoreAssetsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(() => parseTabParam(searchParams.get('tab')));

  // All data (loaded once with high limit for client-side ops)
  const [allItems, setAllItems] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // WO-HUB-RISK-LOOP-COMPLETION-V1: ?view=forced-expiring auto-filter
  const viewParam = searchParams.get('view');
  const isForcedExpiringView = viewParam === 'forced-expiring';

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(isForcedExpiringView ? 'forced' : 'all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>(isForcedExpiringView ? 'forced-first' : 'newest');
  const [page, setPage] = useState(1);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeAssetControlApi.list({ limit: 200 });
      setAllItems(res.data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Tab-filtered base items
  const tabItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    return allItems.filter(i => i.assetType === activeTab);
  }, [allItems, activeTab]);

  // KPI computed from tab-filtered items
  const kpi = useMemo(() => computeKpi(tabItems), [tabItems]);

  // Apply filters + sort
  const filteredItems = useMemo(() => {
    let filtered = applyFilters(tabItems, statusFilter, channelFilter);
    // view=forced-expiring: Hub에서 진입 시 만료 임박 아이템만 표시
    if (isForcedExpiringView) {
      filtered = filtered.filter(isForcedExpiringSoon);
    }
    return applySort(filtered, sortKey);
  }, [tabItems, statusFilter, channelFilter, sortKey, isForcedExpiringView]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_LIMIT));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredItems.slice(start, start + PAGE_LIMIT);
  }, [filteredItems, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeTab, statusFilter, channelFilter, sortKey]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setStatusFilter('all');
    setChannelFilter('all');
  };

  const handleToggleStatus = async (item: StoreAssetItem) => {
    if (item.isForced) return;
    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];

    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, nextStatus);
      setAllItems(prev =>
        prev.map(it =>
          it.id === item.id ? { ...it, publishStatus: res.data.publishStatus } : it,
        ),
      );
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingId(null);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof FileText; count: number }[] = [
    { key: 'all', label: '전체', icon: FileText, count: allItems.length },
    { key: 'cms', label: 'CMS 콘텐츠', icon: FileText, count: allItems.filter(i => i.assetType === 'cms').length },
    { key: 'signage', label: '사이니지', icon: Monitor, count: allItems.filter(i => i.assetType === 'signage').length },
  ];

  // Forced expiry warning count
  const forcedExpiringCount = tabItems.filter(isForcedExpiringSoon).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to="/store" className="text-blue-600 hover:underline">&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">매장 자산</h1>
          <p className="text-sm text-slate-500 mt-1">채널별 노출 현황을 확인하고 게시 상태를 관리합니다</p>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* ─── [A] 노출 요약 카드 ─────────────────── */}
      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <ExposureCard
            icon={Home}
            label="홈 게시"
            count={kpi.homePublished}
            color="blue"
          />
          <ExposureCard
            icon={Tv}
            label="사이니지 게시"
            count={kpi.signagePublished}
            color="purple"
          />
          <ExposureCard
            icon={Megaphone}
            label="프로모션 게시"
            count={kpi.promoPublished}
            color="emerald"
          />
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

      {/* ─── [B] 필터 바 + 정렬 ─────────────────── */}
      {!loading && !error && allItems.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {([
                { key: 'all', label: '전체' },
                { key: 'published', label: '게시됨' },
                { key: 'draft', label: '초안' },
                { key: 'hidden', label: '숨김' },
                { key: 'forced', label: '강제노출' },
              ] as { key: StatusFilter; label: string }[]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === opt.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Channel filter divider */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Channel filter */}
            {([
              { key: 'all', label: '전체 채널' },
              { key: 'home', label: '홈' },
              { key: 'signage', label: '사이니지' },
              { key: 'promotion', label: '프로모션' },
            ] as { key: ChannelFilter; label: string }[]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setChannelFilter(opt.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  channelFilter === opt.key
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">최신순</option>
              <option value="forced-first">강제노출 우선</option>
              <option value="published-first">게시 상태 우선</option>
            </select>
          </div>
        </div>
      )}

      {/* Forced expiry banner */}
      {forcedExpiringCount > 0 && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            강제노출 만료 임박: <strong>{forcedExpiringCount}건</strong>의 자산이 7일 이내 만료됩니다.
          </span>
          {isForcedExpiringView && (
            <Link
              to="/store/content"
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              전체 보기
            </Link>
          )}
        </div>
      )}

      {/* ─── [C] 자산 리스트 ─────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          자산 목록을 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchItems} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
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
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">출처</th>
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
                    onToggleStatus={handleToggleStatus}
                    onEdit={(id) => navigate(`/store/content/${id}/edit`)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>{filteredItems.length}건 중 {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, filteredItems.length)} · {page}/{totalPages} 페이지</span>
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

/* ─── Sub-Components ─────────────────────────── */

function ExposureCard({ icon: Icon, label, count, color, warning }: {
  icon: typeof Home;
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

function ChannelDots({ channelMap }: { channelMap: Record<string, boolean> | null }) {
  if (!channelMap) return <span className="text-slate-300 text-xs">—</span>;
  const channels = [
    { key: 'home', label: '홈', color: 'bg-blue-400' },
    { key: 'signage', label: 'S', color: 'bg-purple-400' },
    { key: 'promotion', label: 'P', color: 'bg-emerald-400' },
  ];
  const active = channels.filter(ch => channelMap[ch.key]);
  if (active.length === 0) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex gap-1">
      {active.map(ch => (
        <span
          key={ch.key}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold ${ch.color}`}
          title={ch.label}
        >
          {ch.label.charAt(0)}
        </span>
      ))}
    </div>
  );
}

function AssetRow({ item, updatingId, onToggleStatus, onEdit }: {
  item: StoreAssetItem;
  updatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onEdit: (id: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
  const isUpdating = updatingId === item.id;
  const isForced = item.isForced;
  const isLocked = item.isLocked;
  const expiringSoon = isForcedExpiringSoon(item);
  const expired = isForcedExpired(item);

  return (
    <tr className={`hover:bg-slate-50 ${isForced && !expired ? 'bg-red-50/30' : ''} ${expired ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          item.assetType === 'cms' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
        }`}>
          {item.assetType === 'cms' ? 'CMS' : '사이니지'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {SERVICE_LABELS[item.sourceService] || item.sourceService}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900 truncate max-w-md">{item.title}</div>
        {isForced && (
          <div className="flex items-center gap-2 mt-1">
            {expired ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">
                강제노출 만료
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                expiringSoon ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>
                {expiringSoon && <AlertTriangle className="w-3 h-3" />}
                {!expiringSoon && <ShieldAlert className="w-3 h-3" />}
                {expiringSoon ? '만료 임박' : '강제노출'}
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                <Lock className="w-3 h-3" />
              </span>
            )}
            {(item.forcedStartAt || item.forcedEndAt) && (
              <span className="text-[10px] text-slate-400">
                {formatShortDate(item.forcedStartAt)} ~ {formatShortDate(item.forcedEndAt)}
                {expiringSoon && item.forcedEndAt && (
                  <span className="ml-1 text-amber-600 font-medium">
                    (D-{daysUntil(item.forcedEndAt)})
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isForced ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 cursor-not-allowed opacity-70"
            title="관리자 강제노출 - 변경 불가"
          >
            <Lock className="w-3 h-3 mr-1" />
            {statusCfg.label}
          </span>
        ) : (
          <button
            onClick={() => onToggleStatus(item)}
            disabled={isUpdating}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${statusCfg.bg} ${statusCfg.text}`}
            title="클릭하여 상태 변경"
          >
            {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {statusCfg.label}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <ChannelDots channelMap={item.channelMap} />
      </td>
      <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
      <td className="px-4 py-3">
        {item.assetType === 'cms' && (
          <button
            onClick={() => onEdit(item.id)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="콘텐츠 편집"
          >
            <Pencil className="w-3.5 h-3.5" />
            편집
          </button>
        )}
      </td>
    </tr>
  );
}
