/**
 * StoreSignagePage — 사이니지 운영 엔진
 *
 * WO-O4O-STORE-SIGNAGE-ENGINE-V1
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1: Playlist 탭 추가
 *
 * /store/signage: 2탭 구조
 *  [Tab 1] 플레이리스트 — Store Playlist CRUD + item 관리
 *  [Tab 2] 자산 관리 — 기존 channel_map 기반 (점진적 축소)
 *
 * 전이 패턴: Hub → assetSnapshotApi.copy → o4o_asset_snapshots → Playlist에 추가
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본, Store = snapshot 조합
 * 2. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로
 * 3. Playlist = 유일한 재생 단위
 * 4. 공개 렌더링: /public/signage?playlist=:id
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
} from 'lucide-react';
import {
  storeAssetControlApi,
  type StoreAssetItem,
  type AssetPublishStatus,
  type ChannelMap,
} from '../../api/assetSnapshot';
import {
  fetchStorePlaylists,
  createStorePlaylist,
  updateStorePlaylist,
  deleteStorePlaylist,
  fetchPlaylistItems,
  addPlaylistItem,
  deletePlaylistItem,
  reorderPlaylistItems,
  type StorePlaylist,
  type StorePlaylistItem,
} from '../../api/storePlaylist';

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

type ActiveTab = 'playlist' | 'assets';

/* ─── Main Component ─────────────────────────── */

export function StoreSignagePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('playlist');

  // ── Legacy asset state ──
  const [items, setItems] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [channelUpdatingId, setChannelUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  // ── Playlist state ──
  const [playlists, setPlaylists] = useState<StorePlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistItems, setPlaylistItems] = useState<StorePlaylistItem[]>([]);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // ── Signage snapshot list for "add to playlist" ──
  const [signageSnapshots, setSignageSnapshots] = useState<StoreAssetItem[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);

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

  useEffect(() => { fetchItems(); loadPlaylists(); }, [fetchItems, loadPlaylists]);

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

  // Filter + Sort
  const filteredItems = useMemo(() => {
    const filtered = applyFilters(items, statusFilter);
    return applySort(filtered, sortKey);
  }, [items, statusFilter, sortKey]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_LIMIT));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredItems.slice(start, start + PAGE_LIMIT);
  }, [filteredItems, page]);

  useEffect(() => { setPage(1); }, [statusFilter, sortKey]);

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
          <p className="text-sm text-slate-500 mt-1">매장 사이니지 플레이리스트와 콘텐츠를 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/hub/signage')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            <Monitor className="w-4 h-4" />
            약국 HUB에서 가져오기
          </button>
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
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('playlist')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'playlist'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListVideo className="w-4 h-4" />
          플레이리스트
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
          자산 관리
        </button>
      </div>

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

          {/* Playlist list */}
          {playlistLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 플레이리스트 로딩 중...
            </div>
          ) : playlistError ? (
            <div className="text-center py-12 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              {playlistError}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ListVideo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">플레이리스트가 없습니다.</p>
              <p className="text-xs mt-1">새 플레이리스트를 만들고 Hub에서 가져온 콘텐츠를 추가하세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {playlists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlaylistId === pl.id
                      ? 'border-blue-400 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ListVideo className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 text-sm">{pl.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); handleTogglePublish(pl); }}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          pl.publishStatus === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {pl.publishStatus === 'published' ? '게시 중' : '초안'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeletePlaylist(pl); }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{pl.playlistType === 'SINGLE' ? '단일' : '목록'}</span>
                    <span>{pl.itemCount}개 항목</span>
                    {pl.forcedCount > 0 && <span className="text-red-500">{pl.forcedCount}개 강제</span>}
                  </div>
                </div>
              ))}
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
                  <p className="text-xs text-slate-500 mb-2">추가할 사이니지 자산을 선택하세요:</p>
                  {signageSnapshots.length === 0 ? (
                    <p className="text-xs text-slate-400">사이니지 자산이 없습니다. Hub에서 가져와주세요.</p>
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

      {/* ═══ Assets Tab (기존) ══════════════════════ */}
      {activeTab === 'assets' && <>

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
      {!loading && !error && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => navigate('/hub/signage')}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            약국 HUB에서 가져오기
          </button>
          <button
            onClick={() => navigate('/store/content?tab=signage')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            전체 자산에서 보기
          </button>
        </div>
      )}

      {/* ─── [B] 필터 바 ─────────────────────────── */}
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
              <p className="text-sm">사이니지 자산이 없습니다.</p>
              <p className="text-xs mt-1">약국 HUB에서 사이니지 콘텐츠를 가져와주세요.</p>
              <button
                onClick={() => navigate('/hub/signage')}
                className="mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                약국 HUB으로 이동
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
                  <th className="px-4 py-3 font-medium w-28">복사일</th>
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

function SignageRow({ item, updatingId, channelUpdatingId, onToggleStatus, onToggleChannel }: {
  item: StoreAssetItem;
  updatingId: string | null;
  channelUpdatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onToggleChannel: (item: StoreAssetItem, channelKey: string) => void;
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
    </tr>
  );
}
