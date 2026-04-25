/**
 * HQ Playlist Detail Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-OPERATOR-HQ-PLAYLIST-CREATE-FLOW-REFINE-V1: 항목 구성 UI 추가
 *   - PRIMARY: URL 입력 → HQ Media 자동 생성 → Playlist Item 추가
 *   - SECONDARY: HQ 미디어 목록에서 선택 → Playlist Item 추가
 *   - 항목 제거 기능
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../contexts/AuthContext';
import { ArrowLeft, ListMusic, Play, Trash2, Link, Plus, X, Search, Film, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

interface PlaylistDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  loopEnabled: boolean;
  defaultItemDuration: number;
  transitionType: string;
  transitionDuration: number;
  totalDuration: number;
  itemCount: number;
  source: string;
  scope: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistItemData {
  id: string;
  sortOrder: number;
  duration: number | null;
  isActive: boolean;
  isForced: boolean;
  sourceType: string;
  media?: {
    id: string;
    name: string;
    mediaType: string;
    sourceType: string;
    sourceUrl: string;
    thumbnailUrl: string | null;
  };
}

interface HqMediaItem {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
}

const statusOptions = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '대기' },
  { value: 'active', label: '활성' },
  { value: 'archived', label: '아카이브' },
];

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

const mediaTypeLabel: Record<string, string> = {
  video: '동영상', image: '이미지', html: 'HTML', text: '텍스트',
};

function extractNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) {
      return `YouTube 동영상 (${new Date().toLocaleDateString('ko-KR')})`;
    }
    if (u.hostname.includes('vimeo')) {
      return `Vimeo 동영상 (${new Date().toLocaleDateString('ko-KR')})`;
    }
    return `동영상 (${new Date().toLocaleDateString('ko-KR')})`;
  } catch {
    return `동영상 (${new Date().toLocaleDateString('ko-KR')})`;
  }
}

export default function HqPlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [items, setItems] = useState<PlaylistItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // URL input (primary flow)
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // HQ media picker (secondary flow)
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [hqMediaList, setHqMediaList] = useState<HqMediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [addingMediaId, setAddingMediaId] = useState<string | null>(null);

  // Item removal
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  const fetchData = useCallback(async () => {
    if (!playlistId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [plData, itemsData] = await Promise.all([
        apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlistId}`),
        apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlistId}/items`),
      ]);
      setPlaylist(plData.data || plData.playlist || plData);
      setItems(itemsData.data || itemsData.items || []);
    } catch (err: any) {
      setError(err?.message || '플레이리스트를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Status change ───

  const handleStatusChange = async (newStatus: string) => {
    if (!playlist || playlist.status === newStatus) return;
    setIsUpdating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists/${playlist.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setPlaylist(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      setError(err?.message || '상태 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Playlist delete ───

  const handleDelete = async () => {
    if (!playlist) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists/${playlist.id}`, { method: 'DELETE' });
      navigate('/operator/signage/hq-playlists');
    } catch (err: any) {
      setError(err?.message || '삭제에 실패했습니다');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Add item by URL (primary flow) ───

  const handleAddByUrl = async () => {
    if (!urlInput.trim() || !playlistId) return;
    setIsAddingUrl(true);
    setError(null);
    try {
      // Step 1: Create HQ media from URL
      const mediaResult = await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: urlName.trim() || extractNameFromUrl(urlInput),
          mediaType: 'video',
          sourceUrl: urlInput.trim(),
          tags: ['HQ'],
        }),
      });
      const media = mediaResult.data || mediaResult;

      // Step 2: Add media as playlist item
      await apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlistId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          mediaId: media.id,
          sourceType: 'hq',
        }),
      });

      setUrlInput('');
      setUrlName('');
      fetchData();
    } catch (err: any) {
      setError(err?.message || '항목 추가에 실패했습니다');
    } finally {
      setIsAddingUrl(false);
    }
  };

  // ─── Add item from HQ media (secondary flow) ───

  const fetchHqMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/media?source=hq&limit=200`);
      setHqMediaList(data.data || data.media || []);
    } catch { /* silent */ }
    finally { setIsLoadingMedia(false); }
  }, [apiFetch]);

  const openMediaPicker = () => {
    setShowMediaPicker(true);
    setMediaSearch('');
    fetchHqMedia();
  };

  const handleAddFromMedia = async (mediaId: string) => {
    if (!playlistId) return;
    setAddingMediaId(mediaId);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlistId}/items`, {
        method: 'POST',
        body: JSON.stringify({ mediaId, sourceType: 'hq' }),
      });
      setShowMediaPicker(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || '항목 추가에 실패했습니다');
    } finally {
      setAddingMediaId(null);
    }
  };

  const filteredHqMedia = useMemo(() => {
    if (!mediaSearch.trim()) return hqMediaList;
    const kw = mediaSearch.toLowerCase();
    return hqMediaList.filter(m => m.name.toLowerCase().includes(kw) || m.sourceUrl.toLowerCase().includes(kw));
  }, [hqMediaList, mediaSearch]);

  // Already-added media IDs (to show visual indicator)
  const addedMediaIds = useMemo(() => new Set(items.map(i => i.media?.id).filter(Boolean)), [items]);

  // ─── Remove item ───

  const handleRemoveItem = async (itemId: string) => {
    if (!playlistId) return;
    setRemovingItemId(itemId);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlistId}/items/${itemId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (err: any) {
      setError(err?.message || '항목 제거에 실패했습니다');
    } finally {
      setRemovingItemId(null);
    }
  };

  // ─── Helpers ───

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  // ─── Render: Loading ───

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !playlist) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/operator/signage/hq-playlists')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> HQ 플레이리스트 목록
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '플레이리스트를 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  if (!playlist) return null;

  const sc = statusConfig[playlist.status] || { text: playlist.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/operator/signage/hq-playlists')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> HQ 플레이리스트 목록
      </button>

      <div className="flex items-center gap-3">
        <ListMusic className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">{playlist.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
        <div className="ml-auto">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" /> 완전 삭제
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-amber-600 hover:text-amber-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Status Control */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <div className="flex items-center gap-2">
          {statusOptions.map(opt => (
            <button key={opt.value} onClick={() => handleStatusChange(opt.value)} disabled={isUpdating || playlist.status === opt.value}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                playlist.status === opt.value ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Playlist Info */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">플레이리스트 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="이름" value={playlist.name} />
          <InfoRow label="항목 수" value={String(playlist.itemCount)} />
          <InfoRow label="총 재생 시간" value={formatDuration(playlist.totalDuration)} />
          <InfoRow label="기본 항목 시간" value={`${playlist.defaultItemDuration}초`} />
          <InfoRow label="전환 효과" value={playlist.transitionType} />
          <InfoRow label="전환 시간" value={`${playlist.transitionDuration}ms`} />
          <InfoRow label="반복 재생" value={playlist.loopEnabled ? '예' : '아니오'} />
          <InfoRow label="공개 여부" value={playlist.isPublic ? '공개' : '비공개'} />
          <InfoRow label="생성일" value={formatDate(playlist.createdAt)} />
          <InfoRow label="수정일" value={formatDate(playlist.updatedAt)} />
        </div>
        {playlist.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">설명</p>
            <p className="text-sm text-slate-700">{playlist.description}</p>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            재생 항목 <span className="text-sm font-normal text-slate-400">({items.length})</span>
          </h2>
          <button
            onClick={openMediaPicker}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Film className="w-4 h-4" /> HQ 미��어에서 선택
          </button>
        </div>

        {/* URL Input — Primary Flow */}
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">동영상 URL로 추가</span>
          </div>
          <div className="space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && urlInput.trim()) handleAddByUrl(); }}
              placeholder="YouTube 또는 Vimeo URL을 입력하세요"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={urlName}
                onChange={e => setUrlName(e.target.value)}
                placeholder="동영상 이름 (선택, 미입력 시 자동 생성)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                onClick={handleAddByUrl}
                disabled={!urlInput.trim() || isAddingUrl}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {isAddingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                추가
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">YouTube 또는 Vimeo URL을 입력하면 HQ 미디어로 자동 등록 후 플레이리스트에 추가됩니다.</p>
        </div>

        {/* Item List */}
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 항목이 없습니다. URL을 입력하거나 HQ 미디어에서 선택하여 추가하세요.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-4 p-3 rounded-lg border ${item.isForced ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">{idx + 1}</span>
                {item.media?.thumbnailUrl ? (
                  <img src={item.media.thumbnailUrl} alt="" className="w-12 h-8 rounded object-cover border border-slate-200" />
                ) : (
                  <div className="w-12 h-8 rounded bg-slate-200 flex items-center justify-center"><Play className="w-3 h-3 text-slate-400" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.media?.name || 'Unknown media'}</p>
                  <p className="text-xs text-slate-400">{mediaTypeLabel[item.media?.mediaType || ''] || item.media?.mediaType} · {item.duration ? `${item.duration}초` : '기본'}</p>
                </div>
                {item.isForced && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">강제</span>}
                <span className={`px-2 py-0.5 rounded text-xs ${item.isActive ? 'text-green-600' : 'text-slate-400'}`}>{item.isActive ? '활성' : '비활성'}</span>
                {!item.isForced && (
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={removingItemId === item.id}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="항목 제거"
                  >
                    {removingItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">플레이리스트 완전 삭제</h3>
            <p className="text-sm text-slate-500 mb-4">이 작업은 되돌릴 수 없습니다.</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-slate-700">{playlist.name}</p>
              <p className="text-slate-400 text-xs mt-1">타입: HQ 플레이리스트 · 삭제 시 모든 재생 항목도 함께 제거됩니다</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">취소</button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? '삭제 중...' : '완전 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HQ Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-800">HQ 미디어에서 선택</h3>
                <button onClick={() => setShowMediaPicker(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={e => setMediaSearch(e.target.value)}
                  placeholder="미디어 이름 또는 URL로 검색..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingMedia ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : filteredHqMedia.length === 0 ? (
                <p className="text-center py-12 text-sm text-slate-400">
                  {mediaSearch ? '검색 결과가 없습니다' : 'HQ 미디어가 없습니다. URL 입력으로 먼저 미디어를 등록하세요.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredHqMedia.map(media => {
                    const alreadyAdded = addedMediaIds.has(media.id);
                    return (
                      <div key={media.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${alreadyAdded ? 'border-green-200 bg-green-50/50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                        {media.thumbnailUrl ? (
                          <img src={media.thumbnailUrl} alt="" className="w-14 h-10 rounded object-cover border border-slate-200 flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-10 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><Play className="w-4 h-4 text-slate-400" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{media.name}</p>
                          <p className="text-xs text-slate-400 truncate">{media.sourceType} · {media.sourceUrl}</p>
                        </div>
                        {alreadyAdded ? (
                          <span className="px-3 py-1.5 text-xs text-green-600 bg-green-100 rounded-lg font-medium flex-shrink-0">추가됨</span>
                        ) : (
                          <button
                            onClick={() => handleAddFromMedia(media.id)}
                            disabled={addingMediaId === media.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            {addingMediaId === media.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            추가
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowMediaPicker(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
