/**
 * HQ Playlists Page — Signage HQ Playlist Console
 *
 * Cookie-based auth (K-Cosmetics)
 * API: GET  /api/signage/k-cosmetics/playlists?source=hq
 * API: POST /api/signage/k-cosmetics/hq/playlists
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'k-cosmetics';

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

const TRANSITION_TYPES: { value: string; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'fade', label: '페이드' },
  { value: 'slide', label: '슬라이드' },
  { value: 'dissolve', label: '디졸브' },
];

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Component ───────────────────────────────────────────────

export default function HqPlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLoopEnabled, setFormLoopEnabled] = useState(true);
  const [formDefaultItemDuration, setFormDefaultItemDuration] = useState('10');
  const [formTransitionType, setFormTransitionType] = useState('fade');
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          loopEnabled: formLoopEnabled,
          defaultItemDuration: parseInt(formDefaultItemDuration, 10) || 10,
          transitionType: formTransitionType,
        }),
      });
      setFormName('');
      setFormDefaultItemDuration('10');
      setFormTransitionType('fade');
      setFormLoopEnabled(true);
      setShowForm(false);
      await fetchPlaylists();
    } catch (err: any) {
      console.error('Failed to create HQ playlist:', err);
      setError(err?.message || 'HQ 재생목록 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

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
            onClick={() => setShowForm(!showForm)}
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

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 HQ 재생목록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="재생목록 이름"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">기본 항목 재생시간 (초)</label>
              <input
                type="number"
                value={formDefaultItemDuration}
                onChange={(e) => setFormDefaultItemDuration(e.target.value)}
                min="1"
                max="3600"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">전환 효과</label>
              <select
                value={formTransitionType}
                onChange={(e) => setFormTransitionType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                {TRANSITION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formLoopEnabled}
                  onChange={(e) => setFormLoopEnabled(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm text-slate-700">반복 재생</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !formName.trim()}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isCreating ? '생성 중...' : '생성'}
            </button>
          </div>
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
