/**
 * StoreSignagePage — 사이니지 플레이리스트 관리
 *
 * WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1
 * Adapted from GlycoPharm StoreSignagePage for Neture.
 *
 * /supplier/signage/manage: 플레이리스트 CRUD + item 관리
 * 전이 패턴: Hub → assetSnapshotApi.copy → o4o_asset_snapshots → Playlist에 추가
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lock,
  Plus,
  ListVideo,
  Trash2,
  GripVertical,
  Play,
} from 'lucide-react';
import { assetSnapshotApi } from '@/lib/api/assetSnapshot';
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
} from '@/lib/api/storePlaylist';

/* ─── Main Component ─────────────────────────── */

export default function StoreSignagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingMediaId = searchParams.get('mediaId');

  // ── Playlist state ──
  const [playlists, setPlaylists] = useState<StorePlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistItems, setPlaylistItems] = useState<StorePlaylistItem[]>([]);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // ── Pending media from Community "매장에 적용" ──
  const [pendingBusy, setPendingBusy] = useState(false);
  const pendingHandled = useRef(false);

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

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

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

  // ── Handle pending mediaId: copy snapshot → add to selected playlist ──
  const handleApplyPendingMedia = useCallback(async (playlistId: string) => {
    if (!pendingMediaId || pendingBusy) return;
    setPendingBusy(true);
    try {
      let snapshotId: string;
      try {
        const copyRes = await assetSnapshotApi.copy({
          sourceAssetId: pendingMediaId,
          assetType: 'signage',
        });
        snapshotId = copyRes.data.id;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          // DUPLICATE_SNAPSHOT — already copied, skip
          throw err;
        }
        throw err;
      }

      await addPlaylistItem(playlistId, snapshotId);
      await loadPlaylistItems(playlistId);
      setSearchParams({}, { replace: true });
    } catch {
      // user can retry
    } finally {
      setPendingBusy(false);
    }
  }, [pendingMediaId, pendingBusy, loadPlaylistItems, setSearchParams]);

  // Auto-handle pending media when a playlist is already selected
  useEffect(() => {
    if (pendingMediaId && selectedPlaylistId && !pendingHandled.current) {
      pendingHandled.current = true;
      handleApplyPendingMedia(selectedPlaylistId);
    }
  }, [pendingMediaId, selectedPlaylistId, handleApplyPendingMedia]);

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to="/supplier/signage/content" className="text-blue-600 hover:underline">&larr; 사이니지 콘텐츠</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">사이니지 플레이리스트</h1>
          <p className="text-sm text-slate-500 mt-1">매장 사이니지 플레이리스트를 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/supplier/signage/content')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            <Monitor className="w-4 h-4" />
            콘텐츠 탐색
          </button>
          <button
            onClick={loadPlaylists}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* ─── Pending Media Banner ──────────────────── */}
      {pendingMediaId && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Monitor className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">커뮤니티에서 선택한 사이니지를 적용합니다</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {selectedPlaylistId
                ? pendingBusy ? '플레이리스트에 추가 중...' : '선택한 플레이리스트에 추가되었습니다.'
                : '아래에서 플레이리스트를 선택하면 자동으로 추가됩니다.'}
            </p>
          </div>
          {pendingBusy && <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
          <button
            onClick={() => setSearchParams({}, { replace: true })}
            className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
          >
            취소
          </button>
        </div>
      )}

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
          <p className="text-xs mt-1">새 플레이리스트를 만들고 콘텐츠를 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {playlists.map(pl => (
            <div
              key={pl.id}
              onClick={() => {
                setSelectedPlaylistId(pl.id);
                if (pendingMediaId && !pendingBusy) {
                  pendingHandled.current = true;
                  handleApplyPendingMedia(pl.id);
                }
              }}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedPlaylistId === pl.id
                  ? 'border-blue-400 bg-blue-50/50'
                  : pendingMediaId
                    ? 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50'
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
          </div>

          {/* Item list */}
          {playlistItemsLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> 로딩 중...
            </div>
          ) : playlistItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              항목이 없습니다. 콘텐츠 탐색에서 사이니지를 가져오세요.
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
  );
}
