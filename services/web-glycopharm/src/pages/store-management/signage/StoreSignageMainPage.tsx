/**
 * StoreSignageMainPage — GlycoPharm 사이니지 운영 엔진
 *
 * WO-O4O-GLYCOPHARM-SIGNAGE-STORE-UX-V1
 * KPA-Society canonical StoreSignagePage 이식
 *
 * /store/signage: 4탭 구조
 *  [Tab 1] 가져올 콘텐츠 (explore)  — ContentLibraryPage 연결
 *  [Tab 2] 내 동영상    (assets)    — storeAssetControlApi 기반
 *  [Tab 3] 내 플레이리스트 (playlist) — store-playlists CRUD + item 관리
 *  [Tab 4] 스케줄       (schedules) — 준비 중 (Phase 2)
 *
 * 이식 원칙: serviceKey='glycopharm', 동일 구조·동일 흐름, 라우트·조직 매핑만 변경
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldAlert,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Tv,
  Eye,
  EyeOff,
  Megaphone,
  Home,
  Plus,
  ListVideo,
  Trash2,
  GripVertical,
  Play,
  Calendar,
  Search,
  ExternalLink,
} from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import {
  storeAssetControlApi,
  type StoreAssetItem,
  type AssetPublishStatus,
  type ChannelMap,
} from '@/api/assetSnapshot';
import {
  fetchStorePlaylists,
  createStorePlaylist,
  updateStorePlaylist,
  deleteStorePlaylist,
  fetchPlaylistItems,
  addPlaylistItem,
  addPlaylistItemFromLibrary,
  deletePlaylistItem,
  reorderPlaylistItems,
  type StorePlaylist,
  type StorePlaylistItem,
} from '@/api/storePlaylist';
import { StoreLibrarySelectorModal } from '@/components/store/StoreLibrarySelectorModal';
import type { LibrarySelectorResult } from '@/components/store/StoreLibrarySelectorModal';

/* ─── Constants ──────────────────────────────── */

const PAGE_LIMIT = 20;
const FORCED_WARN_DAYS = 7;

const STATUS_CONFIG: Record<AssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};

type StatusFilter = 'all' | 'published' | 'draft' | 'hidden' | 'forced';
type SortKey = 'newest' | 'forced-first' | 'published-first';

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

/* ─── KPI Computation ────────────────────────── */

function computeSignageKpi(items: StoreAssetItem[]) {
  let published = 0;
  let draft = 0;
  let hidden = 0;
  let forcedActive = 0;
  let signageChannel = 0;

  for (const item of items) {
    if (item.publishStatus === 'published') published++;
    else if (item.publishStatus === 'draft') draft++;
    else if (item.publishStatus === 'hidden') hidden++;
    if (isForcedActive(item)) forcedActive++;
    if (item.publishStatus === 'published' && item.channelMap?.signage) signageChannel++;
  }

  return { published, draft, hidden, forcedActive, signageChannel };
}

/* ─── Filter & Sort ──────────────────────────── */

function applyFilters(items: StoreAssetItem[], statusFilter: StatusFilter): StoreAssetItem[] {
  return items.filter(item => {
    if (statusFilter === 'published' && item.publishStatus !== 'published') return false;
    if (statusFilter === 'draft' && item.publishStatus !== 'draft') return false;
    if (statusFilter === 'hidden' && item.publishStatus !== 'hidden') return false;
    if (statusFilter === 'forced' && !isForcedActive(item)) return false;
    return true;
  });
}

function applySort(items: StoreAssetItem[], sortKey: SortKey): StoreAssetItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortKey === 'forced-first') {
      const aF = isForcedActive(a) ? 1 : 0;
      const bF = isForcedActive(b) ? 1 : 0;
      if (bF !== aF) return bF - aF;
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

type ActiveTab = 'assets' | 'playlist' | 'schedules' | 'explore';

/* ─── Main Component ─────────────────────────── */

export default function StoreSignageMainPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');

  // ── Legacy asset state ──
  const [items, setItems] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [channelUpdatingId, setChannelUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [assetKeyword, setAssetKeyword] = useState('');

  // ── Playlist state ──
  const [playlists, setPlaylists] = useState<StorePlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistItems, setPlaylistItems] = useState<StorePlaylistItem[]>([]);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistKeyword, setPlaylistKeyword] = useState('');

  // ── Signage snapshot list for "add to playlist" ──
  const [signageSnapshots, setSignageSnapshots] = useState<StoreAssetItem[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showLibrarySelector, setShowLibrarySelector] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeAssetControlApi.list({ type: 'signage', limit: 200 });
      const loadedItems = res.data.items || [];
      setItems(loadedItems);
      setSignageSnapshots(loadedItems);
    } catch {
      setItems([]);
      setSignageSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlaylists = useCallback(async () => {
    setPlaylistLoading(true);
    setPlaylistError(null);
    try {
      const data = await fetchStorePlaylists();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    } finally {
      setPlaylistLoading(false);
    }
  }, []);

  const loadPlaylistItems = useCallback(async (playlistId: string) => {
    setPlaylistItemsLoading(true);
    try {
      const data = await fetchPlaylistItems(playlistId);
      setPlaylistItems(data);
    } catch {
      setPlaylistItems([]);
    } finally {
      setPlaylistItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    loadPlaylists();
  }, [fetchItems, loadPlaylists]);

  useEffect(() => {
    if (selectedPlaylistId) loadPlaylistItems(selectedPlaylistId);
  }, [selectedPlaylistId, loadPlaylistItems]);

  // ── Playlist handlers ──
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createStorePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateForm(false);
      loadPlaylists();
    } catch { /* user can retry */ }
  };

  const handleTogglePublish = async (pl: StorePlaylist) => {
    const next = pl.publishStatus === 'draft' ? 'published' : 'draft';
    try {
      await updateStorePlaylist(pl.id, { publishStatus: next });
      loadPlaylists();
    } catch { /* user can retry */ }
  };

  const handleDeletePlaylist = async (pl: StorePlaylist) => {
    if (!confirm(`"${pl.name}" 플레이리스트를 삭제하시겠습니까?`)) return;
    try {
      await deleteStorePlaylist(pl.id);
      if (selectedPlaylistId === pl.id) {
        setSelectedPlaylistId(null);
        setPlaylistItems([]);
      }
      loadPlaylists();
    } catch { /* user can retry */ }
  };

  const handleAddItem = async (snapshotId: string) => {
    if (!selectedPlaylistId) return;
    try {
      await addPlaylistItem(selectedPlaylistId, snapshotId);
      setShowAddPicker(false);
      loadPlaylistItems(selectedPlaylistId);
    } catch { /* user can retry */ }
  };

  const handleAddFromLibrary = async (item: LibrarySelectorResult) => {
    if (!selectedPlaylistId) return;
    try {
      await addPlaylistItemFromLibrary(selectedPlaylistId, item.id);
      setShowLibrarySelector(false);
      loadPlaylistItems(selectedPlaylistId);
    } catch { /* user can retry */ }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedPlaylistId) return;
    try {
      await deletePlaylistItem(selectedPlaylistId, itemId);
      loadPlaylistItems(selectedPlaylistId);
    } catch { /* user can retry */ }
  };

  const handleMoveItem = async (index: number, direction: -1 | 1) => {
    if (!selectedPlaylistId) return;
    const newItems = [...playlistItems];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]];
    setPlaylistItems(newItems);
    try {
      await reorderPlaylistItems(selectedPlaylistId, newItems.map(i => i.id));
    } catch {
      loadPlaylistItems(selectedPlaylistId);
    }
  };

  // KPI
  const kpi = useMemo(() => computeSignageKpi(items), [items]);
  const forcedExpiringCount = useMemo(() => items.filter(isForcedExpiringSoon).length, [items]);

  // Filter + Sort + Keyword
  const filteredItems = useMemo(() => {
    let filtered = applyFilters(items, statusFilter);
    if (assetKeyword.trim()) {
      const kw = assetKeyword.toLowerCase();
      filtered = filtered.filter(item => item.title.toLowerCase().includes(kw));
    }
    return applySort(filtered, sortKey);
  }, [items, statusFilter, sortKey, assetKeyword]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_LIMIT));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredItems.slice(start, start + PAGE_LIMIT);
  }, [filteredItems, page]);

  useEffect(() => { setPage(1); }, [statusFilter, sortKey, assetKeyword]);

  const filteredPlaylists = useMemo(() => {
    if (!playlistKeyword.trim()) return playlists;
    const kw = playlistKeyword.toLowerCase();
    return playlists.filter(p => p.name.toLowerCase().includes(kw));
  }, [playlists, playlistKeyword]);

  // Handlers
  const handleToggleStatus = async (item: StoreAssetItem) => {
    if (item.isForced) return;
    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];
    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, nextStatus);
      setItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, publishStatus: res.data.publishStatus } : it,
      ));
    } catch { /* user can retry */ } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleChannel = async (item: StoreAssetItem, channelKey: string) => {
    if (item.isForced || item.isLocked) return;
    const currentMap = item.channelMap || {};
    const newMap: ChannelMap = { ...currentMap, [channelKey]: !currentMap[channelKey] };
    setChannelUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updateChannelMap(item.id, newMap);
      setItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, channelMap: res.data.channelMap } : it,
      ));
    } catch { /* user can retry */ } finally {
      setChannelUpdatingId(null);
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to="/store" className="text-blue-600 hover:underline">&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">사이니지 운영</h1>
          <p className="text-sm text-slate-500 mt-1">콘텐츠를 확보하고, 플레이리스트로 구성하고, 스케줄을 적용합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchItems(); loadPlaylists(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* ─── Tab Bar ─────────────────────────────── */}
      <div className="flex gap-1 mb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'explore'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Search className="w-4 h-4" />
          가져올 콘텐츠
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'assets'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
          내 동영상
        </button>
        <button
          onClick={() => setActiveTab('playlist')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'playlist'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListVideo className="w-4 h-4" />
          내 플레이리스트
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-300 cursor-not-allowed"
          title="스케줄 기능은 준비 중입니다"
        >
          <Calendar className="w-4 h-4" />
          스케줄
          <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-normal">준비 중</span>
        </button>
      </div>

      {/* ─── 운영 흐름 배너 ──────────────── */}
      <div className="flex items-center gap-0 mb-6 mt-3 text-xs text-slate-400 select-none">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
            activeTab === 'explore'
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:text-slate-600'
          }`}
        >
          <Search className="w-3 h-3" /> ① 콘텐츠 탐색
        </button>
        <span className="px-1 text-slate-200">→</span>
        <button
          onClick={() => setActiveTab('playlist')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
            activeTab === 'playlist'
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:text-slate-600'
          }`}
        >
          <ListVideo className="w-3 h-3" /> ② 플레이리스트 구성
        </button>
        <span className="px-1 text-slate-200">→</span>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
            activeTab === 'schedules'
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:text-slate-600'
          }`}
        >
          <Calendar className="w-3 h-3" /> ③ 스케줄 적용
        </button>
      </div>

      {/* ═══ Explore Tab (가져올 콘텐츠) ═══════════ */}
      {activeTab === 'explore' && (
        <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <Search className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">사이니지 허브에서 콘텐츠 탐색</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              본부 및 공급자가 제공하는 안내 영상·자료를 탐색하고 내 약국으로 가져오세요.
            </p>
          </div>
          <button
            onClick={() => navigate('/store/signage/library')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            콘텐츠 허브 열기
          </button>
        </div>
      )}

      {/* ═══ Playlist Tab ═══════════════════════════ */}
      {activeTab === 'playlist' && (
        <div>
          {/* Create + list */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">내 플레이리스트</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              새 플레이리스트
            </button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="flex gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="text"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                placeholder="플레이리스트 이름"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                autoFocus
              />
              <button onClick={handleCreatePlaylist} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">생성</button>
              <button onClick={() => { setShowCreateForm(false); setNewPlaylistName(''); }} className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">취소</button>
            </div>
          )}

          {/* Playlist search */}
          {!playlistLoading && !playlistError && playlists.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={playlistKeyword}
                onChange={e => setPlaylistKeyword(e.target.value)}
                placeholder="플레이리스트 이름으로 검색..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Playlist list — DataTable */}
          {playlistError ? (
            <div className="text-center py-12 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              {playlistError}
            </div>
          ) : playlists.length === 0 && !playlistLoading ? (
            <div className="text-center py-12 text-slate-400">
              <ListVideo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">플레이리스트가 없습니다.</p>
              <p className="text-xs mt-1">'가져올 콘텐츠' 탭에서 콘텐츠를 가져온 뒤 플레이리스트를 만들어 구성하세요.</p>
            </div>
          ) : (
            <div className="mb-6">
              <DataTable<StorePlaylist>
                columns={[
                  {
                    key: 'name',
                    title: '이름',
                    render: (_v, pl) => (
                      <div className="flex items-center gap-2">
                        <ListVideo className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-900 truncate max-w-xs">{pl.name}</span>
                        {pl.forcedCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                            강제 {pl.forcedCount}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'itemCount',
                    title: '항목 수',
                    dataIndex: 'itemCount',
                    align: 'center',
                    render: (v) => <span className="text-slate-600">{v}</span>,
                  },
                  {
                    key: 'playlistType',
                    title: '유형',
                    dataIndex: 'playlistType',
                    align: 'center',
                    render: (v) => (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600">
                        {v === 'SINGLE' ? '단일' : '목록'}
                      </span>
                    ),
                  },
                  {
                    key: 'updatedAt',
                    title: '수정일',
                    dataIndex: 'updatedAt',
                    render: (v) => <span className="text-xs text-slate-500">{new Date(v).toLocaleDateString('ko-KR')}</span>,
                  },
                  {
                    key: 'publishStatus',
                    title: '게시',
                    dataIndex: 'publishStatus',
                    render: (_v, pl) => (
                      <button
                        onClick={e => { e.stopPropagation(); handleTogglePublish(pl); }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          pl.publishStatus === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                        title="클릭하여 게시 상태 변경"
                      >
                        {pl.publishStatus === 'published' ? '게시 중' : '초안'}
                      </button>
                    ),
                  },
                  {
                    key: 'actions',
                    title: '',
                    align: 'right',
                    render: (_v, pl) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedPlaylistId(pl.id === selectedPlaylistId ? null : pl.id); }}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                            selectedPlaylistId === pl.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {selectedPlaylistId === pl.id ? '닫기' : '편집'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeletePlaylist(pl); }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ),
                  },
                ] as Column<StorePlaylist>[]}
                dataSource={filteredPlaylists}
                rowKey="id"
                loading={playlistLoading}
                onRow={pl => ({
                  onClick: () => setSelectedPlaylistId(pl.id === selectedPlaylistId ? null : pl.id),
                  className: selectedPlaylistId === pl.id ? 'bg-blue-50/40' : '',
                })}
                emptyText="검색 결과가 없습니다"
              />
            </div>
          )}

          {/* Selected playlist items */}
          {selectedPlaylistId && selectedPlaylist && (
            <div className="border border-slate-200 rounded-lg bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-slate-800">{selectedPlaylist.name}</span>
                  <span className="text-xs text-slate-400">({playlistItems.length}개 항목)</span>
                </div>
                <button
                  onClick={() => setShowAddPicker(!showAddPicker)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  항목 추가
                </button>
              </div>

              {/* Add item picker */}
              {showAddPicker && (
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">추가할 사이니지 자산을 선택하세요:</p>
                    <button
                      onClick={() => setShowLibrarySelector(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 border border-emerald-300 rounded-md hover:bg-emerald-50"
                    >
                      Library에서 선택
                    </button>
                  </div>
                  {signageSnapshots.length === 0 ? (
                    <p className="text-xs text-slate-400">사이니지 자산이 없습니다. Hub에서 가져오거나 Library에서 선택하세요.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {signageSnapshots.map(snap => (
                        <button
                          key={snap.id}
                          onClick={() => handleAddItem(snap.id)}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-300 truncate max-w-[200px]"
                        >
                          {snap.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Item list */}
              {playlistItemsLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> 로딩 중...
                </div>
              ) : playlistItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  항목이 없습니다. "항목 추가"로 사이니지 콘텐츠를 추가하세요.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {playlistItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 ${item.isForced ? 'bg-red-50/30' : ''}`}>
                      <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}</span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveItem(idx, -1)}
                          disabled={idx === 0}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                        >
                          <GripVertical className="w-3 h-3 rotate-180" />
                        </button>
                        <button
                          onClick={() => handleMoveItem(idx, 1)}
                          disabled={idx === playlistItems.length - 1}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                        >
                          <GripVertical className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{item.title}</div>
                        <div className="text-xs text-slate-400">{item.assetType}</div>
                      </div>
                      {item.isForced && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">강제</span>
                      )}
                      {item.isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-300" />
                      ) : (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-300 hover:text-red-500 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Schedule Tab — Phase 2 ══════════════════════════════════ */}
      {activeTab === 'schedules' && (
        <div className="flex items-center gap-3 p-6 bg-slate-50 border border-slate-200 rounded-xl">
          <Calendar className="w-8 h-8 text-slate-300 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-600">스케줄 기능 준비 중</p>
            <p className="text-sm text-slate-400 mt-0.5">시간·요일 기반 자동 재생 스케줄은 곧 제공될 예정입니다.</p>
          </div>
        </div>
      )}

      {/* ═══ Assets Tab (내 동영상) ════════════════ */}
      {activeTab === 'assets' && <>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">내 동영상</h2>
        <p className="text-xs text-slate-400">허브에서 가져온 사이니지 자산 목록입니다</p>
      </div>

      {/* ─── [A] Signage KPI ─────────────────────── */}
      {!loading && !error && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <KpiCard label="게시 중" count={kpi.published} color="green" />
          <KpiCard label="초안" count={kpi.draft} color="slate" />
          <KpiCard label="숨김" count={kpi.hidden} color="orange" />
          <KpiCard label="강제노출" count={kpi.forcedActive} color="red"
            warning={forcedExpiringCount > 0 ? `${forcedExpiringCount}건 만료 임박` : undefined}
          />
          <KpiCard label="사이니지 채널" count={kpi.signageChannel} color="purple" />
        </div>
      )}

      {/* ─── Quick Actions ─────────────────────────── */}
      {!loading && !error && items.length === 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('explore')}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            콘텐츠 탐색하러 가기
          </button>
        </div>
      )}

      {/* ─── [B] 검색 + 필터 바 ─────────────────── */}
      {!loading && !error && items.length > 0 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={assetKeyword}
            onChange={e => setAssetKeyword(e.target.value)}
            placeholder="동영상 이름으로 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-center justify-between mb-4">
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
            강제노출 만료 임박: <strong>{forcedExpiringCount}건</strong>의 사이니지가 7일 이내 만료됩니다.
          </span>
        </div>
      )}

      {/* ─── [C] 사이니지 리스트 ───────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          사이니지 목록을 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchItems} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          {items.length === 0 ? (
            <>
              <Monitor className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">동영상이 없습니다.</p>
              <p className="text-xs mt-1">'가져올 콘텐츠' 탭에서 콘텐츠를 가져와주세요.</p>
              <button
                onClick={() => setActiveTab('explore')}
                className="mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                콘텐츠 탐색하러 가기
              </button>
            </>
          ) : (
            <p className="text-sm">선택한 필터 조건에 해당하는 사이니지가 없습니다.</p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium w-24">상태</th>
                  <th className="px-4 py-3 font-medium w-40">채널 배치</th>
                  <th className="px-4 py-3 font-medium w-28">가져온 날짜</th>
                  <th className="px-4 py-3 font-medium w-24 text-right">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedItems.map(item => (
                  <SignageRow
                    key={item.id}
                    item={item}
                    updatingId={updatingId}
                    channelUpdatingId={channelUpdatingId}
                    onToggleStatus={handleToggleStatus}
                    onToggleChannel={handleToggleChannel}
                    onAddToPlaylist={() => setActiveTab('playlist')}
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
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </>}

      {/* Library Selector Modal */}
      <StoreLibrarySelectorModal
        open={showLibrarySelector}
        onSelect={handleAddFromLibrary}
        onClose={() => setShowLibrarySelector(false)}
      />
    </div>
  );
}

/* ─── Sub-Components ─────────────────────────── */

function KpiCard({ label, count, color, warning }: {
  label: string;
  count: number;
  color: 'green' | 'slate' | 'orange' | 'red' | 'purple';
  warning?: string;
}) {
  const colorMap = {
    green: { bg: 'bg-green-50', text: 'text-green-700' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${c.bg}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${c.text}`}>
        {count}<span className="text-sm font-normal ml-0.5">건</span>
      </div>
      {warning && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-600 font-medium">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </div>
  );
}

const CHANNEL_DEFS = [
  { key: 'signage', label: '사이니지', Icon: Tv, color: 'purple' },
  { key: 'home', label: '홈', Icon: Home, color: 'blue' },
  { key: 'promotion', label: '프로모션', Icon: Megaphone, color: 'emerald' },
] as const;

function SignageRow({ item, updatingId, channelUpdatingId, onToggleStatus, onToggleChannel, onAddToPlaylist }: {
  item: StoreAssetItem;
  updatingId: string | null;
  channelUpdatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onToggleChannel: (item: StoreAssetItem, channelKey: string) => void;
  onAddToPlaylist?: () => void;
}) {
  const statusCfg = STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
  const isUpdating = updatingId === item.id;
  const isChannelUpdating = channelUpdatingId === item.id;
  const isForced = item.isForced;
  const isLocked = item.isLocked;
  const expiringSoon = isForcedExpiringSoon(item);
  const expired = isForcedExpired(item);

  return (
    <tr className={`hover:bg-slate-50 ${isForced && !expired ? 'bg-red-50/30' : ''} ${expired ? 'opacity-60' : ''}`}>
      {/* Title + forced badge */}
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
                {expiringSoon ? <AlertTriangle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
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
                  <span className="ml-1 text-amber-600 font-medium">(D-{daysUntil(item.forcedEndAt)})</span>
                )}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Status toggle */}
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
            title="클릭하여 상태 변경 (초안 → 게시됨 → 숨김)"
          >
            {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {statusCfg.label}
          </button>
        )}
      </td>

      {/* Channel toggles */}
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          {CHANNEL_DEFS.map(ch => {
            const isOn = item.channelMap?.[ch.key] ?? false;
            const disabled = isForced || isLocked || isChannelUpdating;
            return (
              <button
                key={ch.key}
                onClick={() => onToggleChannel(item, ch.key)}
                disabled={disabled}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  isOn
                    ? `bg-${ch.color}-100 text-${ch.color}-700 border border-${ch.color}-300`
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-80'}`}
                title={`${ch.label} 채널 ${isOn ? 'OFF' : 'ON'}`}
              >
                {isOn ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {ch.label}
              </button>
            );
          })}
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        {onAddToPlaylist && (
          <button
            onClick={onAddToPlaylist}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
            title="플레이리스트 탭으로 이동하여 추가"
          >
            <ListVideo className="w-3 h-3" />
            추가
          </button>
        )}
      </td>
    </tr>
  );
}
