/**
 * HQ Playlists Page — Signage HQ Playlist Console
 *
 * Cookie-based auth (K-Cosmetics)
 * API: GET  /api/signage/k-cosmetics/playlists?source=hq
 * API: POST /api/signage/k-cosmetics/hq/playlists
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
const SERVICE_KEY = 'k-cosmetics';
// WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1
const NEW_PATH = '/operator/signage/hq-playlists/new';

// ─── Types ───────────────────────────────────────────────────

interface PlaylistItem {
  id: string;
  name: string;
  itemCount: number;
  totalDuration: number | null;
  loopEnabled: boolean;
  status: string;
  createdAt: string;
}

// ─── Labels ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-slate-100 text-slate-700' },
  pending: { label: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { label: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { label: '아카이브', cls: 'bg-slate-100 text-slate-500' },
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

export default function HqPlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        success: boolean;
        data: PlaylistItem[];
      }>(`/api/signage/${SERVICE_KEY}/playlists?source=hq`);

      if (data.success) {
        setPlaylists(data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch HQ playlists:', err);
      setError(err?.message || 'HQ 재생목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">HQ 재생목록</h1>
          <p className="text-slate-500 text-sm mt-1">본사 사이니지 재생목록 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlaylists}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
          <button
            onClick={() => navigate(NEW_PATH)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            재생목록 추가
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {/* Loading */}
        {isLoading && playlists.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">HQ 재생목록 로딩 중...</p>
            </div>
          </div>
        )}

        {(!isLoading || playlists.length > 0) && (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이름</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">항목 수</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">총 재생시간</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">반복</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">생성일</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playlists.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    HQ 재생목록이 없습니다
                  </td>
                </tr>
              ) : (
                playlists.map((p) => {
                  const statusCfg = STATUS_CONFIG[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/operator/signage/hq-playlists/${p.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pink-100 text-pink-700 text-xs font-medium">
                          {p.itemCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDuration(p.totalDuration)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.loopEnabled ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <span className="text-slate-300 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
