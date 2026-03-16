/**
 * HQ Playlist Detail Page — Signage HQ Playlist Detail & Status Management
 *
 * Cookie-based auth (K-Cosmetics)
 * API: GET   /api/signage/k-cosmetics/playlists/:id        (playlist detail)
 * API: GET   /api/signage/k-cosmetics/playlists/:id/items  (playlist items)
 * API: PATCH /api/signage/k-cosmetics/hq/playlists/:id/status
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
const SERVICE_KEY = 'k-cosmetics';

// ─── Types ───────────────────────────────────────────────────

interface PlaylistDetail {
  id: string;
  name: string;
  itemCount: number;
  totalDuration: number | null;
  defaultItemDuration: number | null;
  transitionType: string | null;
  transitionDuration: number | null;
  loopEnabled: boolean;
  isPublic: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistItemEntry {
  id: string;
  sortOrder: number;
  mediaName: string;
  mediaType: string;
  duration: number | null;
  isForced: boolean;
  isActive: boolean;
}

// ─── Labels ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-slate-100 text-slate-700' },
  pending: { label: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { label: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { label: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

const STATUS_ACTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '대기' },
  { value: 'active', label: '활성' },
  { value: 'archived', label: '아카이브' },
];

const TRANSITION_LABELS: Record<string, string> = {
  none: '없음',
  fade: '페이드',
  slide: '슬라이드',
  dissolve: '디졸브',
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  video: '동영상',
  image: '이미지',
  html: 'HTML',
  text: '텍스트',
  rich_text: '리치 텍스트',
  link: '링크',
};

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('/api/v1') ? path.replace(/^\/api\/v1/, '') : `${API_BASE_URL}${path}`;
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
}

// ─── Component ───────────────────────────────────────────────

export default function HqPlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [items, setItems] = useState<PlaylistItemEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!playlistId) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [playlistRes, itemsRes] = await Promise.all([
          apiFetch<{ success: boolean; data: PlaylistDetail }>(
            `/api/signage/${SERVICE_KEY}/playlists/${playlistId}`
          ),
          apiFetch<{ success: boolean; data: PlaylistItemEntry[] }>(
            `/api/signage/${SERVICE_KEY}/playlists/${playlistId}/items`
          ),
        ]);
        if (playlistRes.success) {
          setPlaylist(playlistRes.data);
        }
        if (itemsRes.success) {
          setItems(itemsRes.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load playlist detail:', err);
        setError(err?.message || '재생목록 정보를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [playlistId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!playlistId || !playlist || playlist.status === newStatus) return;
    setIsUpdating(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; data: PlaylistDetail }>(
        `/api/signage/${SERVICE_KEY}/hq/playlists/${playlistId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (data.success) {
        setPlaylist(data.data);
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err?.message || '상태 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}초`;
    return `${m}분 ${s}초`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">재생목록 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Error / not found state
  if (error && !playlist) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/operator/signage/hq-playlists')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          HQ 재생목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '재생목록을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  if (!playlist) return null;

  const currentStatus = STATUS_CONFIG[playlist.status] || { label: playlist.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate('/operator/signage/hq-playlists')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          HQ 재생목록으로
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{playlist.name}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.cls}`}>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Playlist Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">재생목록 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <InfoRow label="이름" value={playlist.name} />
          <InfoRow label="항목 수" value={String(playlist.itemCount)} />
          <InfoRow label="총 재생시간" value={formatDuration(playlist.totalDuration)} />
          <InfoRow label="기본 항목 재생시간" value={formatDuration(playlist.defaultItemDuration)} />
          <InfoRow label="전환 효과" value={TRANSITION_LABELS[playlist.transitionType || ''] || playlist.transitionType || '-'} />
          <InfoRow label="전환 시간" value={playlist.transitionDuration !== null ? `${playlist.transitionDuration}ms` : '-'} />
          <InfoRow label="반복 재생" value={playlist.loopEnabled ? '사용' : '미사용'} />
          <InfoRow label="공개 여부" value={playlist.isPublic ? '공개' : '비공개'} />
          <InfoRow label="생성일" value={formatDate(playlist.createdAt)} />
          <InfoRow label="수정일" value={formatDate(playlist.updatedAt)} />
        </div>
      </div>

      {/* Status Management */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <p className="text-sm text-slate-500 mb-4">재생목록의 상태를 변경합니다.</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => {
            const isActive = playlist.status === action.value;
            return (
              <button
                key={action.value}
                onClick={() => handleStatusChange(action.value)}
                disabled={isActive || isUpdating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'bg-pink-600 text-white cursor-default'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isUpdating ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    변경 중...
                  </span>
                ) : (
                  action.label
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">항목 목록</h2>
          <p className="text-sm text-slate-500 mt-1">재생목록에 포함된 미디어 항목</p>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 w-16">순서</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">미디어 이름</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">타입</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">재생시간</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">강제</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">활성</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                  항목이 없습니다
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pink-100 text-pink-700 text-xs font-medium">
                      {item.sortOrder}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{item.mediaName}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {MEDIA_TYPE_LABELS[item.mediaType] || item.mediaType}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDuration(item.duration)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isForced ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">강제</span>
                    ) : (
                      <span className="text-slate-300 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isActive ? (
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}
