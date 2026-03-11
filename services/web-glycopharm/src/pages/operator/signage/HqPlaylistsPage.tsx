/**
 * HQ Playlists Management Page — Signage Console
 * WO-O4O-SIGNAGE-CONSOLE-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ListMusic, RefreshCw, Plus, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'glycopharm';

interface PlaylistItem {
  id: string;
  name: string;
  status: string;
  loopEnabled: boolean;
  itemCount: number;
  totalDuration: number;
  transitionType: string;
  createdAt: string;
}

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

export default function HqPlaylistsPage() {
  const { getAccessToken } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formName, setFormName] = useState('');
  const [formLoop, setFormLoop] = useState(true);
  const [formDuration, setFormDuration] = useState(10);
  const [formTransition, setFormTransition] = useState('fade');
  const [isCreating, setIsCreating] = useState(false);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, [getAccessToken]);

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/playlists?source=hq`);
      setPlaylists(data.data || data.playlists || []);
    } catch (err: any) {
      setError(err?.message || 'HQ 플레이리스트를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsCreating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          loopEnabled: formLoop,
          defaultItemDuration: formDuration,
          transitionType: formTransition,
        }),
      });
      setFormName(''); setShowForm(false);
      fetchPlaylists();
    } catch (err: any) {
      setError(err?.message || '플레이리스트 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListMusic className="w-6 h-6" /> HQ 플레이리스트 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 플레이리스트</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 새 플레이리스트
          </button>
          <button onClick={fetchPlaylists} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 HQ 플레이리스트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="플레이리스트 이름" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">기본 항목 시간 (초)</label>
              <input type="number" value={formDuration} onChange={e => setFormDuration(Number(e.target.value))} min={1} max={300} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">전환 효과</label>
              <select value={formTransition} onChange={e => setFormTransition(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="none">없음</option>
                <option value="fade">페이드</option>
                <option value="slide">슬라이드</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="loop" checked={formLoop} onChange={e => setFormLoop(e.target.checked)} className="rounded" />
              <label htmlFor="loop" className="text-sm text-slate-700">반복 재생</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button onClick={handleCreate} disabled={isCreating || !formName.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">{isCreating ? '생성 중...' : '생성'}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading && playlists.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이름</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">항목</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">총 시간</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">루프</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">생성일</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playlists.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">HQ 플레이리스트가 없습니다</td></tr>
              ) : playlists.map(p => {
                const sc = statusConfig[p.status] || { text: p.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={p.id} onClick={() => navigate(`/operator/signage/hq-playlists/${p.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-800 text-sm">{p.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium bg-primary-100 text-primary-700">{p.itemCount}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDuration(p.totalDuration)}</td>
                    <td className="px-4 py-3 text-center text-sm">{p.loopEnabled ? '✓' : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
