/**
 * HQ Playlists Management Page — Signage Operator Console
 * WO-O4O-SIGNAGE-CONSOLE-V1 / WO-O4O-GLYCOPHARM-SIGNAGE-OPERATOR-UX-V1
 *
 * 개선: 검색(debounce) + Store 복사 횟수 표시 + 개선된 테이블 + Empty State
 * API: /api/signage/glycopharm/hq/playlists  (POST)
 *      /api/signage/glycopharm/playlists?source=hq (GET — HQ 목록)
 *      /api/signage/glycopharm/playlists?source=store (GET — Store 복사 집계)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
import {
  ListMusic,
  RefreshCw,
  Plus,
  ChevronRight,
  Search,
  X,
  Clock,
  AlertCircle,
  Copy,
} from 'lucide-react';

const SERVICE_KEY = 'glycopharm';
const BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;

interface PlaylistItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  loopEnabled: boolean;
  itemCount: number;
  totalDuration: number;
  transitionType: string;
  createdAt: string;
  // parentPlaylistId 역참조 집계용
  storeкопий?: number;
}

const STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-200 text-slate-500' },
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatDate(d: string): string {
  try { return new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }); }
  catch { return '-'; }
}

export default function HqPlaylistsPage() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Store 복사 횟수 맵 (hqPlaylistId → count)
  const [storeCopyMap, setStoreCopyMap] = useState<Record<string, number>>({});

  // 검색
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 생성 폼
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLoop, setFormLoop] = useState(true);
  const [formDuration, setFormDuration] = useState(10);
  const [formTransition, setFormTransition] = useState('fade');
  const [isCreating, setIsCreating] = useState(false);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const method = (options?.method || 'GET').toUpperCase();
    let body: any;
    if (options?.body && typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    }
    const response = await api.request({ method, url: path, data: body });
    return response.data;
  }, []);

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`${BASE}/playlists?source=hq&limit=200`);
      setPlaylists(data.data || data.items || data.playlists || []);
    } catch {
      setError('HQ 플레이리스트를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  // Store 복사 집계: source=store 목록에서 parentPlaylistId 집계
  const fetchStoreCopyMap = useCallback(async () => {
    try {
      const data = await apiFetch(`${BASE}/playlists?source=store&limit=500`);
      const storePlaylists: any[] = data.data || data.items || data.playlists || [];
      const map: Record<string, number> = {};
      for (const pl of storePlaylists) {
        const parentId = pl.parentPlaylistId;
        if (parentId) map[parentId] = (map[parentId] ?? 0) + 1;
      }
      setStoreCopyMap(map);
    } catch {
      // 복사 집계 실패는 무시
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchPlaylists();
    fetchStoreCopyMap();
  }, [fetchPlaylists, fetchStoreCopyMap]);

  // 검색 debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearch) return playlists;
    const q = debouncedSearch.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, debouncedSearch]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await apiFetch(`${BASE}/hq/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          loopEnabled: formLoop,
          defaultItemDuration: formDuration,
          transitionType: formTransition,
        }),
      });
      setFormName(''); setFormDesc(''); setShowForm(false);
      fetchPlaylists();
    } catch {
      setError('플레이리스트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const stats = useMemo(() => ({
    total: playlists.length,
    active: playlists.filter((p) => p.status === 'active').length,
    draft: playlists.filter((p) => p.status === 'draft').length,
    totalCopies: Object.values(storeCopyMap).reduce((a, b) => a + b, 0),
  }), [playlists, storeCopyMap]);

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
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> 새 플레이리스트
          </button>
          <button
            onClick={() => { fetchPlaylists(); fetchStoreCopyMap(); }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '전체', value: stats.total, color: 'text-slate-800' },
          { label: '활성', value: stats.active, color: 'text-green-600' },
          { label: '초안', value: stats.draft, color: 'text-slate-500' },
          { label: '매장 복사', value: stats.totalCopies, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 생성 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">새 HQ 플레이리스트</h2>
            <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="플레이리스트 이름"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">기본 항목 시간 (초)</label>
              <input
                type="number"
                value={formDuration}
                onChange={(e) => setFormDuration(Number(e.target.value))}
                min={1} max={300}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">설명</label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="선택 사항"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">전환 효과</label>
              <select
                value={formTransition}
                onChange={(e) => setFormTransition(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="none">없음</option>
                <option value="fade">페이드</option>
                <option value="slide">슬라이드</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="loop"
                checked={formLoop}
                onChange={(e) => setFormLoop(e.target.checked)}
                className="rounded text-primary-600"
              />
              <label htmlFor="loop" className="text-sm text-slate-700">반복 재생</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors">취소</button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !formName.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isCreating ? '생성 중...' : '생성'}
            </button>
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="플레이리스트 이름 검색..."
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-slate-400">{filteredPlaylists.length}개</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading && playlists.length === 0 ? (
          <div className="space-y-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 animate-pulse">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/5" />
                </div>
                <div className="w-10 h-7 bg-slate-100 rounded-full" />
                <div className="w-16 h-5 bg-slate-100 rounded" />
                <div className="w-20 h-5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이름</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">항목 수</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">총 시간</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">매장 복사</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">생성일</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlaylists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <ListMusic className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">
                      {search ? '검색 결과가 없습니다.' : 'HQ 플레이리스트가 없습니다.'}
                    </p>
                    {!search && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> 첫 플레이리스트 생성
                      </button>
                    )}
                  </td>
                </tr>
              ) : filteredPlaylists.map((p) => {
                const sc = STATUS_CONFIG[p.status] ?? { text: p.status, cls: 'bg-slate-100 text-slate-600' };
                const copyCount = storeCopyMap[p.id] ?? 0;
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/operator/signage/hq-playlists/${p.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm truncate max-w-xs">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
                        {p.itemCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        {formatDuration(p.totalDuration)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {copyCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                          <Copy className="w-3 h-3" /> {copyCount}개 매장
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">미사용</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </td>
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
